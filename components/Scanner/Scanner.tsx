import { useState, useEffect } from 'react';
import { View, Image, Pressable, Text, ActivityIndicator } from 'react-native';
import DocumentScanner, { ResponseType } from 'react-native-document-scanner-plugin';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import tw from 'twrnc';
import * as FileSystem from 'expo-file-system';
import { uploadImage } from '@/api';
import { queryClient } from "@/providers";


const Scanner = () => {
  const [scannedImage, setScannedImage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);

  // open camera when component is mounted
  useEffect(() => {
    if (!scannedImage) {
      scanDocument();
    }

    return () => {
      setScannedImage(undefined);
    };
  }, []);

  const extractTextFromImage = async (base64Image: string) => {
    try {
      setProcessing(true);

      // save base64 to temporary file
      const tempFilePath = `${FileSystem.cacheDirectory}temp_scan.jpg`;
      await FileSystem.writeAsStringAsync(tempFilePath, base64Image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const result = await TextRecognition.recognize(tempFilePath);

      // clean up temp file
      await FileSystem.deleteAsync(tempFilePath);

      return result.text;
    } catch (error) {
      console.error('Error recognizing text:', error);
      return '';
    } finally {
      setProcessing(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
      exif: false,
    });

    if (!result.canceled) {
      const imageUri = result.assets?.[0]?.base64;
      if (imageUri) {
        setScannedImage(imageUri);
      }
    }
  };

  const scanDocument = async () => {
    if (__DEV__) {
      await pickImage();
      return;
    }

    try {
      const { scannedImages } = await DocumentScanner.scanDocument({
        responseType: ResponseType.Base64,
        maxNumDocuments: 1
      });

      if (scannedImages?.[0]) {
        setScannedImage(scannedImages[0]);
      }
    } catch (error) {
      console.error('Scanning failed:', error);
      // TODO: error toast
    }
  };

  const handleSubmit = async () => {
    if (!scannedImage) return;

    setSubmitting(true);
    try {
      const extractedText = await extractTextFromImage(scannedImage);

      await uploadImage(scannedImage, extractedText);
      await queryClient.refetchQueries();
      router.push('/');
    } catch (error) {
      console.error('Error submitting the ticket:', error);
      // TODO: error toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setScannedImage(undefined);
    scanDocument();
  };

  if (!scannedImage) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <Pressable
          onPress={scanDocument}
          style={tw`bg-blue-500 px-6 py-3 rounded-lg`}
        >
          <Text style={tw`text-white font-medium text-lg`}>
            Scan Ticket
          </Text>
        </Pressable>
      </View>
    );

    // TODO: eventually remove above Pressable and just return null
    // return null;
  }

  return (
    <View style={tw`flex-1 items-center justify-between py-4`}>
      <View style={tw`flex-1 justify-center`}>
        <Image
          source={{ uri: `data:image/jpeg;base64,${scannedImage}` }}
          style={tw`w-72 h-96 rounded-lg`}
          resizeMode="contain"
        />
        {processing && (
          <View style={tw`absolute inset-0 bg-black/50 items-center justify-center rounded-lg`}>
            <ActivityIndicator color="white" size="large" />
            <Text style={tw`text-white mt-2`}>Processing text...</Text>
          </View>
        )}
      </View>

      <View style={tw`w-full px-4 flex-row justify-center gap-4`}>
        <Pressable
          onPress={handleRetry}
          style={tw`flex-1 py-3 border border-gray-300 rounded-lg`}
          disabled={submitting}
        >
          <Text style={tw`text-center font-medium`}>
            Retry Scan
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          style={tw`flex-1 bg-blue-500 py-3 rounded-lg`}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw`text-white text-center font-medium`}>
              Submit
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

export default Scanner;