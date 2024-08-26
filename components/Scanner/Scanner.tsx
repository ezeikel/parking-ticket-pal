import React, { useState, useEffect } from 'react'
import { Image, Pressable, View, Text } from 'react-native'
import DocumentScanner from 'react-native-document-scanner-plugin'
import { Platform } from 'react-native';
import mime from 'mime';
import { createTicket } from '@/api';
import { queryClient } from "@/providers";

export default () => {
  const [scannedImage, setScannedImage] = useState<string>();

  const scanDocument = async () => {
    // start the document scanner
    const { scannedImages } = await DocumentScanner.scanDocument()

    // get back an array with scanned image file paths
    if (scannedImages?.length || 0 > 0) {
      // set the img src, so we can view the first scanned image
      setScannedImage((scannedImages as string[])[0])
    }
  }

  const handleSubmit = async () => {
    if (!scannedImage) return;

    const uri = scannedImage;
    const fileType = mime.getType(uri);
    const fileName = uri.split('/').pop();

    // Create FormData
    const formData = new FormData();
    formData.append('imageFront', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      name: fileName || `scan.${fileType?.split('/')[1]}`,
      type: fileType,
    });

    // Send the form data to the Next.js API
    try {
      await createTicket(formData);

      // TODO: refetch only tickets and vehicles queries
      await queryClient.refetchQueries();

      console.log('Ticket submitted successfully');
    } catch (error) {
      console.error('Error submitting the ticket:', error);
    }
  };

  useEffect(() => {
    // call scanDocument on load
    scanDocument()
  }, []);



  return (
    <View>
      <Image
        resizeMode="contain"
        style={{ width: '100%', height: '100%' }}
        source={{ uri: scannedImage }}
      />
      <Pressable onPress={handleSubmit}>
        <Text>Submit Ticket</Text>
      </Pressable>
    </View>
  )
}