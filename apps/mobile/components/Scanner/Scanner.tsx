import { useState, useEffect } from 'react';
import { View, Image, Pressable, Text, ActivityIndicator, Alert, Platform } from 'react-native';
import DocumentScanner, { ResponseType } from 'react-native-document-scanner-plugin';
import * as ImagePicker from 'expo-image-picker';

import useOCR from '@/hooks/api/useOCR';
import useCreateTicket from '@/hooks/api/useUploadTicket';
import TicketForm from '@/components/TicketForm/TicketForm';
import { useAnalytics, getOCRAnalyticsProperties, getTicketFormAnalyticsProperties } from '@/lib/analytics';
import { useLogger, logScannerIssue } from '@/lib/logger';


type ScannerProps = {
  onClose?: () => void;
  onImageScanned?: () => void;
}

const Scanner = ({ onClose, onImageScanned }: ScannerProps) => {
  const [scannedImage, setScannedImage] = useState<string>();
  const [ocrData, setOcrData] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const ocrMutation = useOCR();
  const createTicketMutation = useCreateTicket();
  const { trackEvent, trackError } = useAnalytics();
  const logger = useLogger();

  // open camera when component is mounted
  useEffect(() => {
    if (!scannedImage) {
      logger.info("Scanner component mounted, starting scan", { screen: "scanner" });
      logger.logUserFlow("scanner_initialized", { screen: "scanner" });
      trackEvent("ticket_scan_started", { screen: "scanner" });
      trackEvent("scanner_component_mounted", {
        screen: "scanner",
        platform: Platform.OS,
        is_dev_mode: __DEV__
      });
      scanDocument();
    }

    return () => {
      setScannedImage(undefined);
    };
  }, []);


  const pickImage = async () => {
    try {
      logger.debug('pickImage called - requesting permissions', { screen: "scanner" });
      trackEvent("ticket_image_picker_used", { screen: "scanner" });
      trackEvent("image_picker_permission_requested", { screen: "scanner" });

      // Request permissions first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      logger.debug('Permission result received', {
        screen: "scanner",
        granted: permissionResult.granted,
        status: permissionResult.status
      });

      trackEvent("image_picker_permission_result", {
        screen: "scanner",
        granted: permissionResult.granted,
        can_ask_again: permissionResult.canAskAgain,
        status: permissionResult.status
      });

      if (permissionResult.granted === false) {
        logger.permissionError('Media library permission denied', {
          screen: "scanner",
          permission_type: "media_library",
          can_ask_again: permissionResult.canAskAgain,
          status: permissionResult.status
        });
        trackEvent("permission_denied", {
          screen: "scanner",
          error_type: "permission",
          error_message: "Media library permission denied"
        });
        onClose?.();
        return;
      }

      logger.debug('Launching image library', { screen: "scanner" });
      trackEvent("image_library_launching", { screen: "scanner" });

      // Add small delay for iOS
      await new Promise(resolve => setTimeout(resolve, 100));

      let result;
      try {
        logger.debug('About to call launchImageLibraryAsync', { screen: "scanner" });
        trackEvent("image_picker_about_to_launch", { screen: "scanner" });

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
          base64: true,
          exif: false,
          allowsMultipleSelection: false,
        });

        logger.debug('launchImageLibraryAsync completed successfully', { screen: "scanner" });
        trackEvent("image_picker_launch_completed", { screen: "scanner" });
      } catch (launchError) {
        logger.error('ImagePicker launch failed', { screen: "scanner" }, launchError as Error);
        trackEvent("image_picker_launch_failed", {
          screen: "scanner",
          error_message: launchError instanceof Error ? launchError.message : "Unknown error"
        });
        throw launchError;
      }

      trackEvent("image_picker_result", {
        screen: "scanner",
        cancelled: result.canceled,
        assets_count: result.assets?.length || 0
      });

      if (!result.canceled) {
        const imageUri = result.assets?.[0]?.base64;
        if (imageUri) {
          logger.info('Image selected successfully', {
            screen: "scanner",
            image_size_bytes: imageUri.length
          });
          setScannedImage(imageUri);
          trackEvent("ticket_scan_success", {
            screen: "scanner",
            scan_method: "image_picker"
          });
          onImageScanned?.();
        }
      } else {
        logger.debug('User cancelled image picker', { screen: "scanner" });
        trackEvent("ticket_scan_cancelled", {
          screen: "scanner",
          scan_method: "image_picker"
        });
        onClose?.();
      }
    } catch (error) {
      logger.error('Overall pickImage error', { screen: "scanner" }, error as Error);
      logScannerIssue('image_pick', error as Error, { screen: "scanner" });
      trackError(error as Error, {
        screen: "scanner",
        action: "pick_image",
        errorType: "scanning"
      });

      // Show an alert instead of just closing
      Alert.alert(
        'Camera Error',
        'Unable to access photo library. Please check app permissions in Settings.',
        [
          { text: 'OK', onPress: () => onClose?.() }
        ]
      );
    }
  };

  const scanDocument = async () => {
    logger.debug('scanDocument called', {
      screen: "scanner",
      is_dev_mode: __DEV__,
      platform: Platform.OS
    });

    trackEvent("scan_document_method_called", {
      screen: "scanner",
      is_dev_mode: __DEV__,
      platform: Platform.OS
    });

    if (__DEV__) {
      logger.info('Running in dev mode, using image picker instead of document scanner', {
        screen: "scanner"
      });
      trackEvent("dev_mode_image_picker_fallback", {
        screen: "scanner",
        scan_method: "image_picker"
      });
      await pickImage();
      return;
    }

    logger.info('Production mode, using document scanner', { screen: "scanner" });

    try {
      logger.debug('Requesting camera permissions for document scanner', { screen: "scanner" });

      // Request camera permissions first - this IS needed even with app config
      const cameraPermissions = await ImagePicker.requestCameraPermissionsAsync();

      trackEvent("camera_permission_result", {
        screen: "scanner",
        granted: cameraPermissions.granted,
        can_ask_again: cameraPermissions.canAskAgain,
        status: cameraPermissions.status
      });

      if (!cameraPermissions.granted) {
        logger.permissionError('Camera permission denied for document scanner', {
          screen: "scanner",
          permission_type: "camera",
          can_ask_again: cameraPermissions.canAskAgain,
          status: cameraPermissions.status
        });

        Alert.alert(
          'Camera Permission Required',
          'Camera access is needed to scan tickets. Would you like to select a photo from your library instead?',
          [
            { text: 'Cancel', onPress: () => onClose?.() },
            { text: 'Use Photo Library', onPress: async () => {
              logger.info('Camera denied, falling back to photo library', { screen: "scanner" });
              trackEvent("camera_denied_fallback_to_library", { screen: "scanner" });
              await pickImage();
            }},
            { text: 'Enable Camera', onPress: () => {
              // TODO: Open app settings
              onClose?.();
            }}
          ]
        );
        return;
      }

      logger.info('Camera permission granted, opening document scanner', { screen: "scanner" });
      logger.info('Opening document scanner', { screen: "scanner" });
      trackEvent("ticket_document_scanner_used", { screen: "scanner" });

      const { scannedImages, status } = await DocumentScanner.scanDocument({
        responseType: ResponseType.Base64,
        maxNumDocuments: 1
      });

      logger.debug('Document scanner result received', {
        screen: "scanner",
        status,
        imageCount: scannedImages?.length || 0
      });

      if (status === 'cancel') {
        logger.debug('Document scanning was cancelled by user', { screen: "scanner" });
        trackEvent("ticket_scan_cancelled", {
          screen: "scanner",
          scan_method: "document_scanner"
        });
        onClose?.();
        return;
      }

      if (scannedImages?.[0]) {
        logger.info('Document scanned successfully', {
          screen: "scanner",
          image_size_bytes: scannedImages[0].length
        });
        setScannedImage(scannedImages[0]);
        trackEvent("ticket_scan_success", {
          screen: "scanner",
          scan_method: "document_scanner"
        });
        onImageScanned?.();
      } else {
        logScannerIssue('document_scan', new Error('No images returned from scanner'), {
          screen: "scanner",
          scanner_status: status
        });
        trackError("No images returned from scanner", {
          screen: "scanner",
          action: "scan_document",
          errorType: "scanning"
        });
        onClose?.();
      }
    } catch (error) {
      logger.error('Document scanner failed', { screen: "scanner" }, error as Error);
      logScannerIssue('document_scan', error as Error, {
        screen: "scanner",
        scanner_status: 'error'
      });
      trackError(error as Error, {
        screen: "scanner",
        action: "scan_document",
        errorType: "scanning"
      });

      logger.info('Document scanner failed, showing fallback options');

      Alert.alert(
        'Camera Scanner Error',
        'The camera scanner encountered an issue. Would you like to try selecting a photo instead?',
        [
          { text: 'Cancel', onPress: () => onClose?.() },
          { text: 'Try Photo Library', onPress: async () => {
            logger.info('Document scanner failed, falling back to photo library', { screen: "scanner" });
            trackEvent("document_scanner_failed_fallback_to_library", { screen: "scanner" });
            await pickImage();
          }},
          { text: 'Retry Camera', onPress: () => {
            logger.info('Retrying document scanner', { screen: "scanner" });
            trackEvent("document_scanner_retry", { screen: "scanner" });
            scanDocument();
          }}
        ]
      );
    }
  };

  const handleProcess = async () => {
    if (!scannedImage) return;

    try {
      const startTime = Date.now();
      logger.info('Starting OCR processing', {
        screen: "scanner",
        image_size_bytes: scannedImage.length
      });
      trackEvent("ocr_processing_started", { screen: "scanner" });

      // process image with OCR using web app's endpoint
      const ocrResult = await ocrMutation.mutateAsync(scannedImage);

      if (ocrResult.success && ocrResult.data) {
        const processingTime = Date.now() - startTime;
        logger.logPerformance('ocr_processing', processingTime, {
          screen: "scanner",
          extracted_fields: Object.keys(ocrResult.data).length
        });

        const ocrProperties = getOCRAnalyticsProperties(ocrResult, startTime);
        trackEvent("ocr_processing_success", {
          screen: "scanner",
          ...ocrProperties
        });
        setOcrData(ocrResult);
        setShowForm(true);
      } else {
        logger.ocrError('OCR processing failed', undefined, {
          screen: "scanner",
          error_message: ocrResult.message,
          processing_time_ms: Date.now() - startTime
        });
        trackEvent("ocr_processing_failed", {
          screen: "scanner",
          error_message: ocrResult.message,
          processing_time_ms: Date.now() - startTime
        });
        Alert.alert('Error', 'Failed to process the image. Please try again.');
      }
    } catch (error) {
      logScannerIssue('ocr_process', error as Error, { screen: "scanner" });
      trackError(error as Error, {
        screen: "scanner",
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
        screen: "scanner",
        ...formProperties
      });

      const result = await createTicketMutation.mutateAsync(ticketData);

      if (result.success) {
        trackEvent("ticket_created", {
          screen: "scanner",
          ...formProperties
        });
        Alert.alert('Success', 'Ticket created successfully!', [
          { text: 'OK', onPress: () => onClose?.() }
        ]);
      } else {
        trackError(result.error || 'Failed to create ticket', {
          screen: "scanner",
          action: "create_ticket",
          errorType: "network"
        });
        Alert.alert('Error', result.error || 'Failed to create ticket.');
      }
    } catch (error) {
      logger.error('Error creating ticket', { screen: "scanner" }, error as Error);
      trackError(error as Error, {
        screen: "scanner",
        action: "create_ticket",
        errorType: "network"
      });
      Alert.alert('Error', 'Failed to create ticket. Please try again.');
    }
  };

  const handleFormCancel = () => {
    trackEvent("ticket_form_cancelled", { screen: "scanner" });
    setShowForm(false);
    setOcrData(null);
  };

  const handleRetry = () => {
    trackEvent("ticket_scan_retry", { screen: "scanner" });
    setScannedImage(undefined);
    setOcrData(null);
    setShowForm(false);
    scanDocument();
  };

  // Show the form after OCR processing
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

    // Track form opened with prefilled data info
    trackEvent("ticket_form_opened", {
      screen: "scanner",
      is_prefilled: true,
      ...getTicketFormAnalyticsProperties(initialFormData)
    });

    return (
      <TicketForm
        initialData={initialFormData}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
        isLoading={createTicketMutation.isPending}
      />
    );
  }

  if (!scannedImage) {
    // don't show any UI while camera is opening - Instagram-like experience
    return null;
  }

  return (
    <View className="flex-1 items-center justify-between py-4">
      <View className="flex-1 justify-center">
        <Image
          source={{ uri: `data:image/jpeg;base64,${scannedImage}` }}
          className="w-72 h-96 rounded-lg"
          resizeMode="contain"
        />
        {ocrMutation.isPending && (
          <View className="absolute inset-0 bg-black/50 items-center justify-center rounded-lg">
            <ActivityIndicator color="white" size="large" />
            <Text className="text-white mt-2">
              Processing with AI...
            </Text>
          </View>
        )}
      </View>

      <View className="w-full px-4 flex-row justify-center gap-4">
        <Pressable
          onPress={handleRetry}
          className="flex-1 py-3 border border-gray-300 rounded-lg"
          disabled={ocrMutation.isPending}
        >
          <Text className="text-center font-medium">
            Retry Scan
          </Text>
        </Pressable>

        <Pressable
          onPress={handleProcess}
          className="flex-1 bg-blue-500 py-3 rounded-lg"
          disabled={ocrMutation.isPending}
        >
          {ocrMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-medium">
              Process Image
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

export default Scanner;