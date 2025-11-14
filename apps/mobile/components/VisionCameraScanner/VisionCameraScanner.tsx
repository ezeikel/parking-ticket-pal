import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Alert, Platform, StyleSheet, StatusBar, Image, type LayoutChangeEvent } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, type Camera as CameraType } from 'react-native-vision-camera';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';

import useOCR from '@/hooks/api/useOCR';
import useCreateTicket from '@/hooks/api/useUploadTicket';
import TicketForm from '@/components/TicketForm/TicketForm';
import { useAnalytics, getOCRAnalyticsProperties, getTicketFormAnalyticsProperties } from '@/lib/analytics';
import { useLogger, logScannerIssue } from '@/lib/logger';
import Loader from '../Loader/Loader';
import { adService } from '@/services/AdService';
import { CameraControls } from './CameraControls';
import { useDocumentDetection } from '@/hooks/useDocumentDetection';
import { useDocumentScanHaptics } from '@/hooks/useDocumentScanHaptics';
import DocumentOverlay from './DocumentOverlay';
import ShutterAnimation from './ShutterAnimation';
import PostCapturePreview from './PostCapturePreview';
import { UPLOADING_TICKET_TEXT, CREATING_CHALLENGE_LETTER_TEXT } from '@/constants/loadingMessages';

type VisionCameraScannerProps = {
  onClose?: () => void;
  onImageScanned?: () => void;
}

const VisionCameraScanner = ({ onClose, onImageScanned }: VisionCameraScannerProps) => {
  const [scannedImage, setScannedImage] = useState<string>();
  const [ocrData, setOcrData] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isProcessingSubmission, setIsProcessingSubmission] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [cameraLayout, setCameraLayout] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [showShutter, setShowShutter] = useState(false);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [stabilityProgress, setStabilityProgress] = useState(0);
  const [showPostCapturePreview, setShowPostCapturePreview] = useState(false);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [capturedCorners, setCapturedCorners] = useState<any>(null);

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<CameraType>(null);

  const ocrMutation = useOCR();
  const createTicketMutation = useCreateTicket();
  const { trackEvent, trackError } = useAnalytics();
  const logger = useLogger();
  const haptics = useDocumentScanHaptics();

  // React state for document detection and debug info
  const [cornersState, setCornersState] = useState<any>(null);
  const [confidenceState, setConfidenceState] = useState<number>(0);
  const [debugState, setDebugState] = useState({
    frameCount: 0,
    renderCount: 0,
    clearBufferCount: 0,
    skiaDrawCount: 0,
    errorCount: 0,
    processingStep: 'idle',
    debugInfo: '',
    lastRenderTime: 0,
    lastError: null as string | null,
    // State machine debug data
    detectionState: 'no_document',
    stableFrameCount: 0,
    postExitGraceCounter: 0,
    lastStateTransition: 'none',
    skiaDrawSkipReason: '',
    smoothedConfidence: 0,
  });

  // Previous detection state for haptic feedback
  const prevDetectionRef = useRef<{ detected: boolean; ready: boolean }>({ detected: false, ready: false });

  // Document detection integration with runOnJS callbacks
  const { frameProcessor, setAutoCaptureEnabled: setAutoCaptureInHook, resetAutoCapture } = useDocumentDetection({
    onFrameProcessed: (data) => {
      setDebugState(data);
    },
    onDetectionUpdate: (corners, conf) => {
      setCornersState(corners);
      setConfidenceState(conf);

      // Haptic feedback for detection state changes
      const detected = corners !== null && conf > 0;
      const ready = conf >= 0.75;

      // Document first detected
      if (detected && !prevDetectionRef.current.detected) {
        haptics.documentDetected();
      }

      // Document ready for capture
      if (ready && !prevDetectionRef.current.ready) {
        haptics.readyToCapture();
      }

      prevDetectionRef.current = { detected, ready };
    },
    onAutoCapture: () => {
      // Trigger auto-capture
      handleCapture();
    },
    onStabilityUpdate: (progress) => {
      setStabilityProgress(progress);

      // Haptic tick at 33%, 66%, and 100%
      if (progress >= 0.33 && progress < 0.34) {
        haptics.countdownTick();
      } else if (progress >= 0.66 && progress < 0.67) {
        haptics.countdownTick();
      } else if (progress >= 0.99) {
        haptics.countdownTick();
      }
    },
  });

  // Sync auto-capture state with hook
  useEffect(() => {
    setAutoCaptureInHook(autoCaptureEnabled);
  }, [autoCaptureEnabled, setAutoCaptureInHook]);

  // Rotating loading messages for OCR processing
  useEffect(() => {
    if (ocrMutation.isPending && scannedImage) {
      // Set initial message
      setLoadingMessage(UPLOADING_TICKET_TEXT[0]);

      // Rotate messages every 1.5 seconds
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * UPLOADING_TICKET_TEXT.length);
        setLoadingMessage(UPLOADING_TICKET_TEXT[randomIndex]);
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [ocrMutation.isPending, scannedImage]);

  // Rotating loading messages for form submission
  useEffect(() => {
    if (isProcessingSubmission) {
      // Set initial message
      setLoadingMessage(CREATING_CHALLENGE_LETTER_TEXT[0]);

      // Rotate messages every 1.5 seconds
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * CREATING_CHALLENGE_LETTER_TEXT.length);
        setLoadingMessage(CREATING_CHALLENGE_LETTER_TEXT[randomIndex]);
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [isProcessingSubmission]);

  // Debug logging for document detection
  useEffect(() => {
    // Log to analytics when detection finds something
    if (cornersState && confidenceState > 0) {
      logger.info('[VisionCamera] Document detection status', {
        screen: 'vision_camera_scanner',
        hasCorners: !!cornersState,
        cornersCount: cornersState?.length || 0,
        confidence: confidenceState,
      });
    }
  }, [cornersState, confidenceState, logger]);

  // Request camera permission on mount and hide status bar
  useEffect(() => {
    // Hide status bar for full-screen camera experience
    StatusBar.setHidden(true);

    if (!hasPermission) {
      logger.info("VisionCameraScanner mounted, requesting permissions", { screen: "vision_camera_scanner" });
      requestPermission().then((granted) => {
        trackEvent("vision_camera_permission_result", {
          screen: "vision_camera_scanner",
          granted,
        });

        if (!granted) {
          logger.permissionError('Vision Camera permission denied', {
            screen: "vision_camera_scanner",
            permission_type: "camera",
          });
          // Fallback to image picker
          handleOpenGallery();
        }
      });
    } else {
      trackEvent("vision_camera_scan_started", { screen: "vision_camera_scanner" });
    }

    return () => {
      // Show status bar again when unmounting
      StatusBar.setHidden(false);
      setIsActive(false);
      setScannedImage(undefined);
    };
  }, [hasPermission]);

  const handleOpenGallery = async () => {
    try {
      trackEvent("gallery_opened_from_vision_camera", { screen: "vision_camera_scanner" });

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        logger.permissionError('Media library permission denied', {
          screen: "vision_camera_scanner",
          permission_type: "media_library",
        });
        Alert.alert(
          'Permission Required',
          'Photo library access is needed to import photos.',
          [{ text: 'OK', onPress: () => onClose?.() }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
        exif: false,
        allowsMultipleSelection: false,
      });

      if (!result.canceled) {
        const imageUri = result.assets?.[0]?.base64;
        if (imageUri) {
          setScannedImage(imageUri);
          setIsActive(false); // Stop camera when image selected
          trackEvent("image_selected_from_gallery", {
            screen: "vision_camera_scanner"
          });
          onImageScanned?.();
          // Process image immediately
          await processImage(imageUri);
        }
      } else {
        trackEvent("gallery_cancelled", {
          screen: "vision_camera_scanner"
        });
      }
    } catch (error) {
      logger.error('Gallery open error', { screen: "vision_camera_scanner" }, error as Error);
      logScannerIssue('gallery_open', error as Error, { screen: "vision_camera_scanner" });
      trackError(error as Error, {
        screen: "vision_camera_scanner",
        action: "open_gallery",
        errorType: "general"
      });
    }
  };

  const handleCapture = async () => {
    try {
      // Show shutter animation
      setShowShutter(true);

      // Haptic feedback for capture
      haptics.captureSuccess();

      trackEvent("vision_camera_capture_initiated", {
        screen: "vision_camera_scanner",
        has_document_detected: !!cornersState,
        confidence: confidenceState,
        auto_capture: stabilityProgress >= 1.0,
      });

      // If document is detected with good confidence, capture photo
      // Otherwise, fall back to gallery
      if (cornersState && confidenceState > 0.4) {
        logger.info('Document detected for capture', {
          screen: "vision_camera_scanner",
          confidence: confidenceState,
          corners_count: cornersState.length,
        });

        // Capture photo using camera
        if (cameraRef.current) {
          try {
            logger.info('Starting photo capture', {
              screen: "vision_camera_scanner",
              flash: flashEnabled,
              has_corners: !!cornersState,
              confidence: confidenceState,
            });

            setIsActive(false); // Temporarily stop camera for capture
            const photo = await cameraRef.current.takePhoto({
              flash: flashEnabled ? 'on' : 'off',
            });

            logger.info('Photo taken successfully', {
              screen: "vision_camera_scanner",
              photo_path: photo.path,
              photo_width: photo.width,
              photo_height: photo.height,
              photo_orientation: photo.orientation,
              photo_isMirrored: photo.isMirrored,
            });

            // Convert photo to base64 for OCR processing
            // Remove file:// prefix if present as File constructor expects a path
            const photoPath = photo.path.startsWith('file://')
              ? photo.path.slice(7)  // Remove 'file://' prefix
              : photo.path;

            logger.info('Attempting to read photo file', {
              screen: "vision_camera_scanner",
              original_path: photo.path,
              cleaned_path: photoPath,
            });

            // Read file and convert to base64 using new File API
            const { File } = await import('expo-file-system');

            logger.debug('expo-file-system File class imported, creating File instance', {
              screen: "vision_camera_scanner",
              path: photoPath,
            });

            // Create File instance with the photo path
            // The File constructor expects (directory, filename) but we have a full path
            // So we need to split the path
            const pathParts = photoPath.split('/');
            const filename = pathParts.pop() || '';
            const directory = pathParts.join('/');

            logger.debug('Creating File instance', {
              screen: "vision_camera_scanner",
              directory: directory,
              filename: filename,
            });

            const file = new File(directory, filename);
            const base64Image = await file.base64();

            logger.info('File read result', {
              screen: "vision_camera_scanner",
              has_base64: !!base64Image,
              base64_length: base64Image ? base64Image.length : 0,
              base64_preview: base64Image ? base64Image.substring(0, 50) + '...' : null,
            });

            if (base64Image) {
              // Store captured data for preview
              setCapturedImageBase64(base64Image);
              setCapturedCorners(cornersState);
              setShowPostCapturePreview(true);
              setIsActive(false); // Keep camera paused during preview

              trackEvent("document_captured_with_detection", {
                screen: "vision_camera_scanner",
                confidence: confidenceState,
                auto_capture: stabilityProgress >= 1.0,
              });

              // Don't process immediately - wait for user to accept in preview
              onImageScanned?.();
            } else {
              logger.error('Base64 image is empty or null', {
                screen: "vision_camera_scanner",
                photo_path: photo.path,
                cleaned_path: photoPath,
                directory: directory,
                filename: filename,
              });
              throw new Error('Failed to read captured photo - base64 is empty');
            }
          } catch (photoError) {
            const error = photoError as Error;
            logger.error('Photo capture/processing error', {
              screen: "vision_camera_scanner",
              error_message: error.message,
              error_name: error.name,
              error_stack: error.stack,
              step: 'capture_or_read',
            }, error);

            logScannerIssue('document_scan', error, {
              screen: "vision_camera_scanner",
              flash: flashEnabled,
              has_corners: !!cornersState,
              confidence: confidenceState,
            });

            setIsActive(true); // Resume camera on error
            // Fall back to gallery on error
            logger.info('Falling back to gallery due to capture error', {
              screen: "vision_camera_scanner",
              error: error.message,
            });
            await handleOpenGallery();
          }
        } else {
          // Camera ref not available, fall back to gallery
          logger.warn('Camera ref not available, falling back to gallery');
          await handleOpenGallery();
        }
      } else {
        // No document detected or low confidence - use gallery
        logger.info('No document detected, opening gallery', {
          screen: "vision_camera_scanner",
          has_corners: !!cornersState,
          confidence: confidenceState,
        });
        await handleOpenGallery();
      }
    } catch (error) {
      logger.error('Capture error', { screen: "vision_camera_scanner" }, error as Error);
      trackError(error as Error, {
        screen: "vision_camera_scanner",
        action: "capture",
        errorType: "scanning"
      });
    }
  };

  // Handle accepting the captured photo from preview
  const handleAcceptCapture = async (adjustedCorners: any) => {
    if (!capturedImageBase64) return;

    trackEvent("ticket_scan_success", {
      screen: "vision_camera_scanner",
      source: "camera_capture",
    });

    // TODO: Apply perspective transform with adjusted corners before processing
    // For now, store the adjusted corners for future use
    console.log('Adjusted corners:', adjustedCorners);
    setScannedImage(capturedImageBase64);
    setShowPostCapturePreview(false);

    // Process the accepted image
    await processImage(capturedImageBase64);
  };

  // Handle retaking the photo
  const handleRetakeCapture = () => {
    trackEvent("ticket_scan_retry", {
      screen: "vision_camera_scanner",
    });

    setShowPostCapturePreview(false);
    setCapturedImageBase64(null);
    setCapturedCorners(null);
    setIsActive(true); // Resume camera for retake
    resetAutoCapture(); // Reset auto-capture state
  };

  const handleFlashToggle = () => {
    setFlashEnabled(!flashEnabled);
    trackEvent("flash_toggled", {
      screen: "vision_camera_scanner",
      enabled: !flashEnabled
    });
  };

  const handleAutoCaptureToggle = () => {
    const newState = !autoCaptureEnabled;
    setAutoCaptureEnabled(newState);
    setAutoCaptureInHook(newState);

    // Log the toggle action
    console.log('[VisionCamera] Auto-capture toggled:', newState);
  };

  const handleCameraStarted = useCallback(() => {
    console.log('[VisionCamera] Camera started - frame processor should be running');
    logger.info('[VisionCamera] Camera started', { screen: 'vision_camera_scanner' });
  }, [logger]);

  const handleCameraInitialized = useCallback(() => {
    console.log('[VisionCamera] Camera initialized');
    logger.info('[VisionCamera] Camera initialized', { screen: 'vision_camera_scanner' });
  }, [logger]);

  const handleCameraError = useCallback((error: any) => {
    console.error('[VisionCamera] Camera error:', error);
    logger.error('Camera error', { screen: 'vision_camera_scanner' }, error);
  }, [logger]);

  const processImage = async (imageBase64: string) => {
    try {
      const startTime = Date.now();
      trackEvent("ocr_processing_started", { screen: "vision_camera_scanner" });

      const ocrResult = await ocrMutation.mutateAsync(imageBase64);

      if (ocrResult.success && ocrResult.data) {
        const processingTime = Date.now() - startTime;
        logger.logPerformance('ocr_processing', processingTime, {
          screen: "vision_camera_scanner",
          extracted_fields: Object.keys(ocrResult.data).length
        });

        const ocrProperties = getOCRAnalyticsProperties(ocrResult, startTime);
        trackEvent("ocr_processing_success", {
          screen: "vision_camera_scanner",
          ...ocrProperties
        });
        setOcrData(ocrResult);
        setShowForm(true);
      } else {
        logger.ocrError('OCR processing failed', undefined, {
          screen: "vision_camera_scanner",
          error_message: ocrResult.message,
          processing_time_ms: Date.now() - startTime
        });
        Alert.alert('Error', 'Failed to process the image. Please try again.');
      }
    } catch (error) {
      logScannerIssue('ocr_process', error as Error, { screen: "vision_camera_scanner" });
      trackError(error as Error, {
        screen: "vision_camera_scanner",
        action: "process_ocr",
        errorType: "ocr"
      });
      Alert.alert('Error', 'Failed to process the image. Please try again.');
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      const ticketData = {
        ...formData,
        tempImageUrl: ocrData?.imageUrl,
        tempImagePath: ocrData?.tempImagePath,
        extractedText: ocrData?.data?.extractedText,
      };

      const formProperties = getTicketFormAnalyticsProperties(formData);
      trackEvent("ticket_form_submitted", {
        screen: "vision_camera_scanner",
        ...formProperties
      });

      const result = await createTicketMutation.mutateAsync(ticketData);

      if (result.success) {
        // Show processing overlay while ad loads
        setIsProcessingSubmission(true);

        trackEvent("ticket_created", {
          screen: "vision_camera_scanner",
          ...formProperties
        });

        await adService.showAd();

        setIsProcessingSubmission(false);

        Alert.alert('Success', 'Ticket created successfully!', [
          { text: 'OK', onPress: () => onClose?.() }
        ]);
      } else {
        trackError(result.error || 'Failed to create ticket', {
          screen: "vision_camera_scanner",
          action: "create_ticket",
          errorType: "network"
        });
        Alert.alert('Error', result.error || 'Failed to create ticket.');
      }
    } catch (error) {
      setIsProcessingSubmission(false);
      logger.error('Error creating ticket', { screen: "vision_camera_scanner" }, error as Error);
      trackError(error as Error, {
        screen: "vision_camera_scanner",
        action: "create_ticket",
        errorType: "network"
      });
      Alert.alert('Error', 'Failed to create ticket. Please try again.');
    }
  };

  const handleFormCancel = () => {
    trackEvent("ticket_form_cancelled", { screen: "vision_camera_scanner" });
    setShowForm(false);
    setOcrData(null);
    setScannedImage(undefined);
  };

  const handleCameraLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCameraLayout({ width, height });
  };

  // Show ticket form if we have OCR data
  if (showForm && ocrData) {
    const initialFormData = {
      vehicleReg: ocrData.data?.vehicleReg || '',
      pcnNumber: ocrData.data?.pcnNumber || '',
      issuedAt: ocrData.data?.issuedAt ? new Date(ocrData.data.issuedAt) : new Date(),
      contraventionCode: ocrData.data?.contraventionCode || '',
      initialAmount: ocrData.data?.initialAmount || 0,
      issuer: ocrData.data?.issuer || '',
      location: ocrData.data?.location || {
        line1: '',
        city: '',
        postcode: '',
        country: 'United Kingdom',
        coordinates: {
          latitude: 0,
          longitude: 0,
        },
      },
    };

    return (
      <View style={styles.container}>
        <TicketForm
          initialData={initialFormData}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isLoading={createTicketMutation.isPending}
        />

        {/* Processing overlay after form submission */}
        {isProcessingSubmission && (
          <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
              <View style={styles.centerContainer}>
                <Loader size={48} color="white" />
                <Text style={styles.loadingText}>{loadingMessage}</Text>
              </View>
            </BlurView>
          </View>
        )}
      </View>
    );
  }

  // Show loading if no permission or no device
  if (!hasPermission || !device) {
    return (
      <View style={styles.centerContainer}>
        <Loader size={48} color="white" />
        <Text style={styles.loadingText}>
          {!hasPermission ? 'Requesting camera permission...' : 'Initializing camera...'}
        </Text>
      </View>
    );
  }

  // Show post-capture preview if we have a captured image
  if (showPostCapturePreview && capturedImageBase64) {
    return (
      <PostCapturePreview
        imageBase64={capturedImageBase64}
        detectedCorners={capturedCorners}
        onAccept={handleAcceptCapture}
        onRetake={handleRetakeCapture}
        isProcessing={ocrMutation.isPending}
        stabilityProgress={stabilityProgress}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        key={device?.id}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        photo={true}
        torch={flashEnabled ? 'on' : 'off'}
        frameProcessor={frameProcessor}
        enableZoomGesture={false}
        resizeMode="cover"
        onLayout={handleCameraLayout}
        onInitialized={handleCameraInitialized}
        onStarted={handleCameraStarted}
        onError={handleCameraError}
      />

      {/* Document detection UI overlay - polygon is drawn on frame via Skia */}
      <DocumentOverlay
        corners={cornersState}
        confidence={confidenceState}
        stabilityProgress={stabilityProgress}
        autoCaptureEnabled={autoCaptureEnabled}
      />

      {/* Shutter animation */}
      <ShutterAnimation
        visible={showShutter}
        onAnimationComplete={() => setShowShutter(false)}
      />

      {/* Debug panel - only shown in development */}
      {__DEV__ && (
        <View style={styles.debugPanel}>
        <Text style={styles.debugPanelText}>🔍 Detection Debug</Text>
        <Text style={styles.debugPanelText}>
          FP Frames: {debugState.frameCount} {debugState.frameCount > 0 ? '✅' : '❌'}
        </Text>
        <Text style={styles.debugPanelText}>
          Renders: {debugState.renderCount} {debugState.renderCount > 0 ? '✅' : '❌'}
        </Text>
        <Text style={styles.debugPanelText}>
          Skia Draws: {debugState.skiaDrawCount} | Errors: {debugState.errorCount}
        </Text>
        <Text style={styles.debugPanelText}>
          Buffers Cleared: {debugState.clearBufferCount}
        </Text>
        <Text style={styles.debugPanelText}>
          Step: {debugState.processingStep}
        </Text>
        <Text style={styles.debugPanelText}>
          Corners: {cornersState ? `${cornersState.length} pts` : 'null'}
        </Text>
        <Text style={styles.debugPanelText}>
          Confidence: {(confidenceState * 100).toFixed(1)}%
        </Text>
        <Text style={[styles.debugPanelText, { fontWeight: 'bold', color: debugState.detectionState === 'document_detected' ? '#00FF00' : '#FFA500' }]}>
          State: {debugState.detectionState.toUpperCase()}
        </Text>
        <Text style={styles.debugPanelText}>
          Smoothed Conf: {(debugState.smoothedConfidence * 100).toFixed(1)}% (Enter{'>='}60%, Exit{'<'}30%)
        </Text>
        <Text style={styles.debugPanelText}>
          Stable Frames: {debugState.stableFrameCount}/4
        </Text>
        {debugState.postExitGraceCounter > 0 && (
          <Text style={[styles.debugPanelText, { color: '#FFA500' }]}>
            Grace Period: {debugState.postExitGraceCounter} frames
          </Text>
        )}
        <Text style={styles.debugPanelText}>
          Last Transition: {debugState.lastStateTransition}
        </Text>
        {debugState.skiaDrawSkipReason && (
          <Text style={[styles.debugPanelText, { color: '#FF6600' }]}>
            Skia Skip: {debugState.skiaDrawSkipReason}
          </Text>
        )}
        <Text style={styles.debugPanelText}>
          Camera: {cameraLayout.width}x{cameraLayout.height}
        </Text>
        <Text style={styles.debugPanelText}>
          Last Render: {debugState.lastRenderTime > 0 ? new Date(debugState.lastRenderTime).toLocaleTimeString() : 'never'}
        </Text>
        {debugState.lastError && (
          <Text style={[styles.debugPanelText, styles.errorText]}>
            Error: {debugState.lastError}
          </Text>
        )}
        {debugState.debugInfo && (
          <Text style={styles.debugPanelText}>
            Debug: {debugState.debugInfo}
          </Text>
        )}
      </View>
      )}

      {/* Camera controls overlay */}
      <CameraControls
        onGalleryPress={handleOpenGallery}
        onCapturePress={handleCapture}
        onClosePress={() => onClose?.()}
        onFlashToggle={handleFlashToggle}
        onAutoCaptureToggle={handleAutoCaptureToggle}
        flashEnabled={flashEnabled}
        autoCaptureEnabled={autoCaptureEnabled}
        isProcessing={ocrMutation.isPending}
        documentDetected={!!cornersState && confidenceState > 0.4}
      />

      {/* OCR processing overlay - gallery to form */}
      {ocrMutation.isPending && scannedImage && (
        <View style={StyleSheet.absoluteFill}>
          {/* Show the uploaded image */}
          <Image
            source={{ uri: `data:image/jpeg;base64,${scannedImage}` }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />

          {/* Blur overlay */}
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={styles.centerContainer}>
              <Loader size={48} color="white" />
              <Text style={styles.loadingText}>{loadingMessage}</Text>
            </View>
          </BlurView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
  debugPanel: {
    position: 'absolute',
    top: 80,
    left: 10,
    right: 10,
    maxWidth: 400,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  debugPanelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter18pt-Regular',
    marginBottom: 4,
  },
  errorText: {
    color: '#FF4444',
    fontWeight: 'bold',
  },
});

export default VisionCameraScanner;
