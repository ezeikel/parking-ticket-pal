import { useState, useEffect } from 'react';
import { View, Image, Pressable, Text, ActivityIndicator, Alert } from 'react-native';
import DocumentScanner, { ResponseType } from 'react-native-document-scanner-plugin';
import * as ImagePicker from 'expo-image-picker';

import useOCR from '@/hooks/api/useOCR';
import useCreateTicket from '@/hooks/api/useUploadTicket';
import TicketForm from '@/components/TicketForm/TicketForm';


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

  // open camera when component is mounted
  useEffect(() => {
    if (!scannedImage) {
      scanDocument();
    }

    return () => {
      setScannedImage(undefined);
    };
  }, []);


  const pickImage = async () => {
    try {
      console.log('Requesting media library permissions...');

      // Request permissions first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        console.log('Permission to access camera roll is required!');
        onClose?.();
        return;
      }

      console.log('Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
        exif: false,
      });

      console.log('Image picker result:', result);

      if (!result.canceled) {
        const imageUri = result.assets?.[0]?.base64;
        if (imageUri) {
          console.log('Image selected, setting scanned image');
          setScannedImage(imageUri);
          onImageScanned?.();
        }
      } else {
        console.log('User cancelled image picker');
        // User cancelled image picker, close the modal
        onClose?.();
      }
    } catch (error) {
      console.error('Error picking image:', error);
      onClose?.();
    }
  };

  const scanDocument = async () => {
    console.log('scanDocument called, __DEV__:', __DEV__);

    if (__DEV__) {
      console.log('Running in dev mode, calling pickImage');
      await pickImage();
      return;
    }

    try {
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        responseType: ResponseType.Base64,
        maxNumDocuments: 1
      });

      if (status === 'cancel') {
        console.log('Document scanning was cancelled by user');
        onClose?.();
        return;
      }

      if (scannedImages?.[0]) {
        setScannedImage(scannedImages[0]);
        onImageScanned?.();
      }
    } catch (error) {
      console.error('Scanning failed:', error);
      // TODO: error toast
      // if scanning fails or is cancelled, close the modal
      onClose?.();
    }
  };

  const handleProcess = async () => {
    if (!scannedImage) return;

    try {
      // process image with OCR using web app's endpoint
      const ocrResult = await ocrMutation.mutateAsync(scannedImage);

      if (ocrResult.success && ocrResult.data) {
        console.log('ocrResult', ocrResult);
        setOcrData(ocrResult);
        setShowForm(true);
      } else {
        console.error('OCR processing failed:', ocrResult.message);
        Alert.alert('Error', 'Failed to process the image. Please try again.');
      }
    } catch (error) {
      console.error('Error processing the ticket:', error);
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

      const result = await createTicketMutation.mutateAsync(ticketData);
      
      if (result.success) {
        Alert.alert('Success', 'Ticket created successfully!', [
          { text: 'OK', onPress: () => onClose?.() }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create ticket.');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      Alert.alert('Error', 'Failed to create ticket. Please try again.');
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setOcrData(null);
  };

  const handleRetry = () => {
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