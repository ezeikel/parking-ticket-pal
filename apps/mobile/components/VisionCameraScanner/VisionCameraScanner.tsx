import { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type PhotoFile,
  type Camera as CameraType,
} from 'react-native-vision-camera';
import * as ImagePicker from 'expo-image-picker';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { useSharedValue as useReanimatedSharedValue } from 'react-native-reanimated';

import { useDocumentDetection, type DocumentCorner } from '@/hooks/useDocumentDetection';
import { useDocumentScanHaptics } from '@/hooks/useDocumentScanHaptics';
import useLiveTicketOCR from '@/hooks/useLiveTicketOCR';
import useOCR, { type OCRProcessingResult } from '@/hooks/api/useOCR';
import { useAnalytics } from '@/lib/analytics';
import { useLogger } from '@/lib/logger';
import { toast } from '@/lib/toast';
import DocumentOverlay from './DocumentOverlay';
import { CameraControls } from './CameraControls';
import ShutterAnimation from './ShutterAnimation';
import PostCapturePreview from './PostCapturePreview';

type VisionCameraScannerProps = {
  onClose?: () => void;
  onImageScanned?: () => void;
  onOCRComplete: (ocrResult: OCRProcessingResult) => void;
};

const VisionCameraScanner = ({ onClose, onImageScanned, onOCRComplete }: VisionCameraScannerProps) => {
  const [isActive, setIsActive] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(false);
  // Default OFF so users have time to read the live OCR chips and confirm
  // what the camera is seeing before committing to capture. Power users can
  // re-enable via the CameraControls toggle for the original hold-steady UX.
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(false);
  const [stabilityProgress, setStabilityProgress] = useState(0);
  const [showShutter, setShowShutter] = useState(false);
  const [documentDetected, setDocumentDetected] = useState(false);

  // Post-capture state
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [capturedCorners, setCapturedCorners] = useState<DocumentCorner[] | null>(null);
  // Snapshot of liveOCR fields at capture time. The hook clears its own state
  // when isActive flips to false, so we copy what we have just before that
  // happens — the user still wants to see "what the camera read" on PostCapture.
  const [capturedOCR, setCapturedOCR] = useState<{ pcn?: string; vrm?: string; issuer?: string }>({});

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<CameraType>(null);

  const ocrMutation = useOCR();
  const { trackEvent, trackError } = useAnalytics();
  const logger = useLogger();
  const haptics = useDocumentScanHaptics();

  // Ref to store latest corners for capture
  const latestCornersRef = useRef<DocumentCorner[] | null>(null);

  // JS-side Reanimated SVs bridged from the frame processor's onDetectionUpdate
  // callback. Reanimated's useDerivedValue inside DocumentOverlay reliably
  // re-runs when these get written from JS — writes from the FP worklet runtime
  // were updating the value but not triggering the UI-runtime observer chain.
  const overlayCorners = useReanimatedSharedValue<DocumentCorner[] | null>(null);
  const overlayConfidence = useReanimatedSharedValue<number>(0);
  const overlayFrameAspect = useReanimatedSharedValue<number>(0);
  const overlayIsDetected = useReanimatedSharedValue<boolean>(false);

  const {
    frameProcessor,
    setAutoCaptureEnabled: setAutoCaptureInHook,
    resetAutoCapture,
  } = useDocumentDetection({
    onDetectionUpdate: (corners, conf, aspect) => {
      const detected = corners !== null && conf > 0.3;
      setDocumentDetected(detected);
      latestCornersRef.current = corners;

      // Mirror frame-processor state into JS-runtime Reanimated SVs so
      // DocumentOverlay's useDerivedValue actually observes the updates.
      overlayCorners.value = corners;
      overlayConfidence.value = conf;
      overlayFrameAspect.value = aspect;
      overlayIsDetected.value = detected;

      if (detected && !documentDetected) {
        haptics.documentDetected();
      }
    },
    onAutoCapture: () => {
      haptics.captureSuccess();
      handleCapture();
    },
    onStabilityUpdate: (progress) => {
      setStabilityProgress(progress);
      if (__DEV__) {
        const g = globalThis as {
          __scannerDebug?: Record<string, unknown>;
        };
        g.__scannerDebug = { ...(g.__scannerDebug ?? {}), stabilityProgress: progress };
      }
    },
  });

  // Sync the React-side default into the detection hook's SharedValue on mount.
  // Hook defaults to true internally; we override to false so the chips have
  // time to display and the user can confirm before tapping the shutter.
  useEffect(() => {
    setAutoCaptureInHook(autoCaptureEnabled);
  }, [autoCaptureEnabled, setAutoCaptureInHook]);

  // Best-effort on-device OCR fired on the polygon's 0→stable transition.
  // Surfaces PCN/VRM/issuer chips in the overlay so the user sees what the
  // camera is reading before they capture. Server-side OCR at capture time
  // remains the source of truth.
  const liveOCR = useLiveTicketOCR({
    cameraRef,
    isActive,
    stabilityProgress,
  });

  // Dev-only state probe. Read via `globalThis.__scannerDebug` from the JS
  // debugger to inspect the scanner's internals without adding console.log
  // noise. Stripped from prod bundles by the __DEV__ guard.
  if (__DEV__) {
    const g = globalThis as { __scannerDebug?: Record<string, unknown> };
    g.__scannerDebug = {
      ...(g.__scannerDebug ?? {}),
      isActive,
      autoCaptureEnabled,
      documentDetected,
      stabilityProgress,
      liveOCR: {
        isRecognizing: liveOCR.isRecognizing,
        pcn: liveOCR.pcn,
        vrm: liveOCR.vrm,
        issuer: liveOCR.issuer,
      },
    };
  }

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || !isActive) return;

    try {
      trackEvent('ticket_scan_capture', { screen: 'scanner', method: 'vision_camera' });
      setShowShutter(true);

      const photo: PhotoFile = await cameraRef.current.takePhoto({
        flash: flashEnabled ? 'on' : 'off',
        enableShutterSound: false,
      });

      // Deactivate camera after capture
      setIsActive(false);

      const photoUri = `file://${photo.path}`;

      // Read base64 for OCR
      const base64 = await LegacyFileSystem.readAsStringAsync(photoUri, {
        encoding: LegacyFileSystem.EncodingType.Base64,
      });

      setCapturedImageUri(photoUri);
      setCapturedImageBase64(base64);
      setCapturedCorners(latestCornersRef.current);
      // Freeze whatever ML Kit had extracted at capture time so PostCapture can
      // surface it. The liveOCR state clears once isActive flips false.
      setCapturedOCR({ pcn: liveOCR.pcn, vrm: liveOCR.vrm, issuer: liveOCR.issuer });
      onImageScanned?.();

      trackEvent('ticket_scan_success', { screen: 'scanner', scan_method: 'vision_camera' });
    } catch (error) {
      logger.error('Photo capture failed', { screen: 'scanner' }, error as Error);
      trackError(error as Error, { screen: 'scanner', action: 'capture' });
      haptics.captureError();
      toast.error('Capture failed', 'Please try again.');
      setIsActive(true);
    } finally {
      setShowShutter(false);
    }
  }, [isActive, flashEnabled, trackEvent, trackError, logger, haptics, onImageScanned]);

  const handleRetake = useCallback(() => {
    setCapturedImageUri(null);
    setCapturedImageBase64(null);
    setCapturedCorners(null);
    setCapturedOCR({});
    setStabilityProgress(0);
    resetAutoCapture();
    setIsActive(true);
    trackEvent('ticket_scan_retry', { screen: 'scanner' });
  }, [resetAutoCapture, trackEvent]);

  const handleAccept = useCallback(async () => {
    if (!capturedImageBase64) return;

    try {
      trackEvent('ocr_processing_started', { screen: 'scanner' });
      const startTime = Date.now();

      // Pass along the ML Kit text from the live OCR pass so the server can
      // use it as a hint / fallback alongside OpenAI Vision.
      const ocrResult = await ocrMutation.mutateAsync({
        scannedImage: capturedImageBase64,
        ocrText: liveOCR.getLastOCRText() ?? undefined,
      });

      if (ocrResult.success && ocrResult.data) {
        const processingTime = Date.now() - startTime;
        trackEvent('ocr_processing_success', {
          screen: 'scanner',
          processing_time_ms: processingTime,
        });
        onOCRComplete(ocrResult);
      } else {
        trackEvent('ocr_processing_failed', {
          screen: 'scanner',
          error_message: ocrResult.message,
        });
        toast.error('Error', 'Failed to process the image. Please try again.');
      }
    } catch (error) {
      trackError(error as Error, { screen: 'scanner', action: 'process_ocr' });
      toast.error('Error', 'Failed to process the image. Please try again.');
    }
  }, [capturedImageBase64, ocrMutation, trackEvent, trackError, onOCRComplete]);

  const handleGalleryPress = useCallback(async () => {
    try {
      trackEvent('ticket_image_picker_used', { screen: 'scanner' });

      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        toast.error('Permission needed', 'Please allow photo library access in Settings.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets?.[0]?.base64) {
        const asset = result.assets[0];
        setCapturedImageUri(asset.uri);
        setCapturedImageBase64(asset.base64 ?? null);
        setCapturedCorners(null);
        setIsActive(false);
        onImageScanned?.();
        trackEvent('ticket_scan_success', { screen: 'scanner', scan_method: 'image_picker' });
      } else if (result.canceled) {
        trackEvent('ticket_scan_cancelled', { screen: 'scanner', scan_method: 'image_picker' });
      }
    } catch (error) {
      logger.error('Image picker failed', { screen: 'scanner' }, error as Error);
      toast.error('Error', 'Unable to access photo library.');
    }
  }, [trackEvent, logger, onImageScanned]);

  const handleFlashToggle = useCallback(() => {
    setFlashEnabled(prev => !prev);
  }, []);

  const handleAutoCaptureToggle = useCallback(() => {
    setAutoCaptureEnabled(prev => {
      const next = !prev;
      setAutoCaptureInHook(next);
      return next;
    });
  }, [setAutoCaptureInHook]);

  // Dev mode: use image picker instead of camera (no camera on simulator)
  if (__DEV__ && Platform.OS === 'ios') {
    // Still render VisionCamera if device is available (physical device in dev)
    // Fall through to normal render
  }

  // Post-capture preview
  if (capturedImageUri && capturedImageBase64) {
    return (
      <PostCapturePreview
        imageUri={capturedImageUri}
        detectedCorners={capturedCorners}
        onAccept={handleAccept}
        onRetake={handleRetake}
        isProcessing={ocrMutation.isPending}
        livePcn={capturedOCR.pcn}
        liveVrm={capturedOCR.vrm}
        liveIssuer={capturedOCR.issuer}
      />
    );
  }

  // No camera device
  if (!device) {
    // Fallback to gallery picker if no camera (simulator)
    if (__DEV__) {
      handleGalleryPress();
      return null;
    }
    return null;
  }

  // Request permission if needed
  if (!hasPermission) {
    requestPermission();
    return null;
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        photo={true}
        frameProcessor={frameProcessor}
        torch={flashEnabled ? 'on' : 'off'}
        enableZoomGesture
        resizeMode="cover"
      />

      <DocumentOverlay
        cornersNormalized={overlayCorners}
        confidenceValue={overlayConfidence}
        isDetected={overlayIsDetected}
        frameAspectRatio={overlayFrameAspect}
        stabilityProgress={stabilityProgress}
        autoCaptureEnabled={autoCaptureEnabled}
        livePcn={liveOCR.pcn}
        liveVrm={liveOCR.vrm}
        liveIssuer={liveOCR.issuer}
        liveOCRRecognizing={liveOCR.isRecognizing}
      />

      <ShutterAnimation visible={showShutter} />

      <CameraControls
        onGalleryPress={handleGalleryPress}
        onCapturePress={handleCapture}
        onClosePress={() => onClose?.()}
        onFlashToggle={handleFlashToggle}
        onAutoCaptureToggle={handleAutoCaptureToggle}
        flashEnabled={flashEnabled}
        autoCaptureEnabled={autoCaptureEnabled}
        isProcessing={false}
        documentDetected={documentDetected}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default VisionCameraScanner;
