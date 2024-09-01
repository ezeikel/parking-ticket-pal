import { useEffect, useState } from 'react'
import { Image, Pressable, Text, ScrollView } from 'react-native'
import { router } from 'expo-router';
import DocumentScanner, { ResponseType } from 'react-native-document-scanner-plugin'
import { createTicket } from '@/api';
import { queryClient } from "@/providers";

const padding = 20;

export default () => {
  const [scannedImage, setScannedImage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const scanDocument = async () => {
    // start the document scanner
    const { scannedImages } = await DocumentScanner.scanDocument({
      // TODO: using base64 instead of file paths for now as Vercel doesn't seem to like File + FormData from React Native
      responseType: ResponseType.Base64
    })

    // get back an array with scanned image base64 strings
    if (scannedImages?.length || 0 > 0) {
      // set the img src, so we can view the first scanned image
      setScannedImage((scannedImages as string[])[0])
    }
  }

  const handleSubmit = async () => {
    if (!scannedImage) return;

    setSubmitting(true);

    // send base64 image to the API
    try {
      await createTicket(scannedImage);

      // TODO: refetch only tickets and vehicles queries
      await queryClient.refetchQueries();

      // navigate to home screen
      router.push('/');
    } catch (error) {
      console.error('Error submitting the ticket:', error);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    // call scanDocument on load but only in production
    if (!__DEV__) {
      scanDocument()
    }

    return () => {
      // cleanup
      setScannedImage('');
    }
  }, []);


  return (
    <ScrollView contentContainerStyle={{
      padding,
      alignItems: 'center',
      gap: 32,
    }}>
      {scannedImage ? <Image source={{ uri: scannedImage }} style={{ width: 200, height: 200 }} /> : null}
      <Pressable onPress={handleSubmit}>
        <Text>{submitting ? "Submitting" : "Submit"} Ticket</Text>
      </Pressable>
    </ScrollView>
  )
}