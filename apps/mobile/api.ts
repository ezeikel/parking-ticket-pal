import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

// allow an override just for Android if set in EAS
const apiUrlFromEnv =
  Platform.OS === 'android'
    ? process.env.EXPO_PUBLIC_API_URL_ANDROID ?? process.env.EXPO_PUBLIC_API_URL
    : process.env.EXPO_PUBLIC_API_URL;

export const getCurrentUser = async () => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.get(`${apiUrlFromEnv}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
}

export const getTickets = async () => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.get(`${apiUrlFromEnv}/tickets`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
}

export const getVehicles = async () => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.get(`${apiUrlFromEnv}/vehicles`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
}

export const signIn = async () => {
  await GoogleSignin.hasPlayServices();
  const userInfo = await GoogleSignin.signIn();

  if (!userInfo.data || !userInfo.data.idToken) {
    throw new Error('Failed to get Google Sign-In token');
  }

  const response = await axios.post(`${apiUrlFromEnv}/auth/mobile`, {
    idToken: userInfo.data.idToken
  });

  return response.data;
}

export const processImageWithOCR = async (scannedImage: string) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(`${apiUrlFromEnv}/ocr/upload-image`, {
    scannedImage,
  }, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
};

export const createTicket = async (ticketData: any) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(`${apiUrlFromEnv}/tickets/create`, ticketData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
};

// TODO: was previously using FormData, but it's not working with the Next.js API deployed on Vercel
export const uploadImage = async (data: string, text?: string) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(`${apiUrlFromEnv}/upload`, {
    scannedImage: data,
    ocrText: text
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
}