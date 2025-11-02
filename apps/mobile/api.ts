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

export const getTicket = async (ticketId: string) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.get(`${apiUrlFromEnv}/tickets/${ticketId}`, {
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

export const signInWithFacebook = async (accessToken: string) => {
  const response = await axios.post(`${apiUrlFromEnv}/auth/mobile/facebook`, {
    accessToken
  });

  return response.data;
}

export const signInWithApple = async (identityToken: string, authorizationCode: string) => {
  const response = await axios.post(`${apiUrlFromEnv}/auth/mobile/apple`, {
    identityToken,
    authorizationCode
  });

  return response.data;
}

export const sendMagicLink = async (email: string) => {
  const response = await axios.post(`${apiUrlFromEnv}/auth/mobile/magic-link`, {
    email
  });

  return response.data;
}

export const verifyMagicLink = async (token: string) => {
  const response = await axios.post(`${apiUrlFromEnv}/auth/mobile/magic-link/verify`, {
    token
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

/**
 * Confirm a RevenueCat purchase with the backend
 * Used for consumable purchases (ticket upgrades)
 */
export const confirmPurchase = async (ticketId: string, productId: string) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(`${apiUrlFromEnv}/iap/confirm-purchase`, {
    ticketId,
    productId
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
}

/**
 * Update user profile information
 */
export const updateUser = async (userId: string, data: { phoneNumber?: string; name?: string }) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.patch(`${apiUrlFromEnv}/user/${userId}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
}

/**
 * Generate a challenge letter for a ticket
 */
export const generateChallengeLetter = async (
  pcnNumber: string,
  challengeReason: string,
  additionalDetails?: string
) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(
    `${apiUrlFromEnv}/letters/generate`,
    {
      pcnNumber,
      challengeReason,
      additionalDetails,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

/**
 * Generate a TE7 form for a ticket
 */
export const generateTE7Form = async (pcnNumber: string) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(
    `${apiUrlFromEnv}/forms/te7`,
    { pcnNumber },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

/**
 * Generate a TE9 form for a ticket
 */
export const generateTE9Form = async (pcnNumber: string) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(
    `${apiUrlFromEnv}/forms/te9`,
    { pcnNumber },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

/**
 * Generate a PE2 form for a ticket
 */
export const generatePE2Form = async (pcnNumber: string) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(
    `${apiUrlFromEnv}/forms/pe2`,
    { pcnNumber },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

/**
 * Generate a PE3 form for a ticket
 */
export const generatePE3Form = async (pcnNumber: string) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(
    `${apiUrlFromEnv}/forms/pe3`,
    { pcnNumber },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

export const deleteTicket = async (ticketId: string) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.delete(`${apiUrlFromEnv}/tickets/${ticketId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
};