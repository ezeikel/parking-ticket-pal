import { useState, useEffect, useCallback } from 'react';
import { View, Text, Alert, Platform, StyleSheet, StatusBar, Image, type LayoutChangeEvent } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
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
import DocumentOverlay from './DocumentOverlay';
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

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const ocrMutation = useOCR();
  const createTicketMutation = useCreateTicket();
  const { trackEvent, trackError } = useAnalytics();
  const logger = useLogger();

  // Document detection integration
  const { frameProcessor, detectedCorners, confidence, frameCount } = useDocumentDetection();

  // Track frame processor execution and log detections
  useEffect(() => {
    const interval = setInterval(() => {
      // Read shared values
      const corners = detectedCorners.value;
      const conf = confidence.value;

      // Log to PostHog when detection finds something
      if (corners && conf > 0) {
        logger.info("Document detected", {
          screen: "vision_camera_scanner",
          confidence: conf,
          corners_count: corners.length,
          frame_count: frameCount.value,
        });
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [detectedCorners, confidence, frameCount, logger]);

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
    // Log to analytics (works in all build types)
    const interval = setInterval(() => {
      if (detectedCorners.value || confidence.value > 0) {
        logger.info('[VisionCamera] Document detection status', {
          screen: 'vision_camera_scanner',
          hasCorners: !!detectedCorners.value,
          cornersCount: detectedCorners.value?.length || 0,
          confidence: confidence.value,
        });
      }
    }, 5000); // Log every 5 seconds when there's activity

    return () => clearInterval(interval);
  }, [detectedCorners, confidence, logger]);

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
        errorType: "gallery"
      });
    }
  };

  const handleCapture = async () => {
    try {
      trackEvent("vision_camera_capture_initiated", {
        screen: "vision_camera_scanner",
        has_document_detected: !!detectedCorners.value,
        confidence: confidence.value,
      });

      // If document is detected with good confidence, use it for capture
      // Otherwise, fall back to gallery
      if (detectedCorners.value && confidence.value > 0.4) {
        logger.info('Document detected for capture', {
          screen: "vision_camera_scanner",
          confidence: confidence.value,
          corners_count: detectedCorners.value.length,
        });

        // TODO: Implement actual photo capture with Camera.takePhoto()
        // TODO: Apply perspective correction using detected corners
        // For now, fall back to gallery
        trackEvent("document_capture_not_implemented", {
          screen: "vision_camera_scanner",
          confidence: confidence.value,
        });
        await handleOpenGallery();
      } else {
        // No document detected or low confidence - use gallery
        logger.info('No document detected, opening gallery', {
          screen: "vision_camera_scanner",
          has_corners: !!detectedCorners.value,
          confidence: confidence.value,
        });
        await handleOpenGallery();
      }
    } catch (error) {
      logger.error('Capture error', { screen: "vision_camera_scanner" }, error as Error);
      trackError(error as Error, {
        screen: "vision_camera_scanner",
        action: "capture",
        errorType: "capture"
      });
    }
  };

  const handleFlashToggle = () => {
    setFlashEnabled(!flashEnabled);
    trackEvent("flash_toggled", {
      screen: "vision_camera_scanner",
      enabled: !flashEnabled
    });
  };

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

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        photo={true}
        torch={flashEnabled ? 'on' : 'off'}
        frameProcessor={frameProcessor}
        enableZoomGesture={false}
        onLayout={handleCameraLayout}
      />

      {/* Document detection overlay - only render when we have camera dimensions */}
      {cameraLayout.width > 0 && cameraLayout.height > 0 && (
        <DocumentOverlay
          corners={detectedCorners.value}
          confidence={confidence.value}
          frameWidth={cameraLayout.width}
          frameHeight={cameraLayout.height}
        />
      )}

      {/* Temporary debug panel - remove after testing */}
      <View style={styles.debugPanel}>
        <Text style={styles.debugPanelText}>🔍 Detection Debug</Text>
        <Text style={styles.debugPanelText}>
          FP Frames: {frameCount.value} {frameCount.value > 0 ? '✅' : '❌'}
        </Text>
        <Text style={styles.debugPanelText}>
          Corners: {detectedCorners.value ? `${detectedCorners.value.length} pts` : 'null'}
        </Text>
        <Text style={styles.debugPanelText}>
          Confidence: {(confidence.value * 100).toFixed(1)}%
        </Text>
        <Text style={styles.debugPanelText}>
          Camera: {cameraLayout.width}x{cameraLayout.height}
        </Text>
      </View>

      {/* Camera controls overlay */}
      <CameraControls
        onGalleryPress={handleOpenGallery}
        onCapturePress={handleCapture}
        onClosePress={() => onClose?.()}
        onFlashToggle={handleFlashToggle}
        flashEnabled={flashEnabled}
        isProcessing={ocrMutation.isPending}
        documentDetected={!!detectedCorners.value && confidence.value > 0.4}
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
});

export default VisionCameraScanner;
