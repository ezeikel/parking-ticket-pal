import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import type { Address } from '@parking-ticket-pal/types';
import { TicketStatus, IssuerType, TicketType } from './types';

// allow an override just for Android if set in EAS
const apiUrlFromEnv =
  Platform.OS === 'android'
    ? process.env.EXPO_PUBLIC_API_URL_ANDROID ?? process.env.EXPO_PUBLIC_API_URL
    : process.env.EXPO_PUBLIC_API_URL;

// Filter types for tickets
export type TicketFilters = {
  search?: string;
  status?: TicketStatus[];
  issuers?: string[];
  issuerType?: IssuerType[];
  ticketType?: TicketType[];
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  verified?: boolean;
  sortBy?: 'issuedAt' | 'initialAmount' | 'createdAt' | 'status' | 'issuer';
  sortOrder?: 'asc' | 'desc';
};

export const getCurrentUser = async () => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.get(`${apiUrlFromEnv}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
}

export const getTickets = async (filters?: TicketFilters) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  // Build query params
  const params = new URLSearchParams();

  if (filters?.search) {
    params.append('search', filters.search);
  }

  if (filters?.status && filters.status.length > 0) {
    filters.status.forEach(status => params.append('status', status));
  }

  if (filters?.issuers && filters.issuers.length > 0) {
    filters.issuers.forEach(issuer => params.append('issuer', issuer));
  }

  if (filters?.issuerType && filters.issuerType.length > 0) {
    filters.issuerType.forEach(type => params.append('issuerType', type));
  }

  if (filters?.ticketType && filters.ticketType.length > 0) {
    filters.ticketType.forEach(type => params.append('ticketType', type));
  }

  if (filters?.dateFrom) {
    params.append('dateFrom', filters.dateFrom);
  }

  if (filters?.dateTo) {
    params.append('dateTo', filters.dateTo);
  }

  if (filters?.amountMin !== undefined) {
    params.append('amountMin', filters.amountMin.toString());
  }

  if (filters?.amountMax !== undefined) {
    params.append('amountMax', filters.amountMax.toString());
  }

  if (filters?.verified !== undefined) {
    params.append('verified', filters.verified.toString());
  }

  if (filters?.sortBy) {
    params.append('sortBy', filters.sortBy);
  }

  if (filters?.sortOrder) {
    params.append('sortOrder', filters.sortOrder);
  }

  const queryString = params.toString();
  const url = queryString ? `${apiUrlFromEnv}/tickets?${queryString}` : `${apiUrlFromEnv}/tickets`;

  const response = await axios.get(url, {
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
export const updateUser = async (userId: string, data: { phoneNumber?: string; name?: string; address?: Address; signatureDataUrl?: string }) => {
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
export const generateTE7Form = async (pcnNumber: string, reasonText: string) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(
    `${apiUrlFromEnv}/forms/te7`,
    { pcnNumber, reasonText },
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
export const generateTE9Form = async (
  pcnNumber: string,
  grounds: {
    didNotReceiveNotice: boolean;
    madeRepresentations: boolean;
    hadNoResponse: boolean;
    appealNotDetermined: boolean;
    appealInFavour: boolean;
    paidInFull: boolean;
  }
) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(
    `${apiUrlFromEnv}/forms/te9`,
    { pcnNumber, ...grounds },
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
export const generatePE2Form = async (pcnNumber: string, reasonText: string) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(
    `${apiUrlFromEnv}/forms/pe2`,
    { pcnNumber, reasonText },
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
export const generatePE3Form = async (
  pcnNumber: string,
  grounds: {
    didNotReceiveNotice: boolean;
    madeRepresentations: boolean;
    hadNoResponse: boolean;
    appealNotDetermined: boolean;
    appealInFavour: boolean;
    paidInFull: boolean;
  }
) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(
    `${apiUrlFromEnv}/forms/pe3`,
    { pcnNumber, ...grounds },
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

/**
 * Fetch user notifications
 */
export const getNotifications = async (limit = 50, offset = 0, unreadOnly = false) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.get(`${apiUrlFromEnv}/notifications`, {
    params: { limit, offset, unreadOnly },
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.patch(
    `${apiUrlFromEnv}/notifications/${notificationId}/read`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};

/**
 * Get notification preferences
 */
export const getNotificationPreferences = async () => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.get(`${apiUrlFromEnv}/notifications/preferences`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (preferences: {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}) => {
  const token = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.patch(
    `${apiUrlFromEnv}/notifications/preferences`,
    { preferences },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};

/**
 * Register push token
 */
export const registerPushToken = async (token: string, platform: 'IOS' | 'ANDROID', deviceId?: string) => {
  const sessionToken = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(
    `${apiUrlFromEnv}/notifications/register-token`,
    { token, platform, deviceId },
    {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};

/**
 * Unregister push token
 */
export const unregisterPushToken = async (token: string) => {
  const sessionToken = await SecureStore.getItemAsync('sessionToken');

  const response = await axios.post(
    `${apiUrlFromEnv}/notifications/unregister-token`,
    { token },
    {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};