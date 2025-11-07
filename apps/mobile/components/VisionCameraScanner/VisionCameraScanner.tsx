import { useState, useEffect, useCallback } from 'react';
import { View, Text, Alert, Platform, StyleSheet, Dimensions } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
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

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const ocrMutation = useOCR();
  const createTicketMutation = useCreateTicket();
  const { trackEvent, trackError } = useAnalytics();
  const logger = useLogger();

  // Document detection integration
  const { frameProcessor, detectedCorners, confidence } = useDocumentDetection();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  // Request camera permission on mount
  useEffect(() => {
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
        trackEvent("ticket_created", {
          screen: "vision_camera_scanner",
          ...formProperties
        });

        await adService.showAd();

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
      <TicketForm
        initialData={initialFormData}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
        isLoading={createTicketMutation.isPending}
      />
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
      />

      {/* Document detection overlay */}
      <DocumentOverlay
        corners={detectedCorners.value}
        confidence={confidence.value}
        frameWidth={SCREEN_WIDTH}
        frameHeight={SCREEN_HEIGHT}
      />

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
});

export default VisionCameraScanner;
