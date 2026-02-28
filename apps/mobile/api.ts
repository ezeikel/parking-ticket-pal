import axios from 'axios';
import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type { Address } from '@parking-ticket-pal/types';
import { TicketStatus, IssuerType, TicketType } from './types';
import {
  getDeviceId,
  getSessionToken,
  setSessionToken,
  setUserId,
  logout as clearAuthTokens,
} from './lib/auth';

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

// Shared axios instance
const api = axios.create({
  baseURL: apiUrlFromEnv,
  headers: { 'Content-Type': 'application/json' },
});

let registrationPromise: Promise<void> | null = null;

/**
 * Ensure device is registered and we have a session token.
 * Only calls the register endpoint once; subsequent calls reuse the promise.
 */
async function ensureRegistered(): Promise<void> {
  const token = await getSessionToken();
  if (token) return;

  if (!registrationPromise) {
    registrationPromise = (async () => {
      try {
        const deviceId = await getDeviceId();
        const response = await axios.post(
          `${apiUrlFromEnv}/auth/mobile/register`,
          { deviceId },
        );
        const { token: newToken, userId } = response.data;
        await setSessionToken(newToken);
        await setUserId(userId);
      } finally {
        registrationPromise = null;
      }
    })();
  }

  await registrationPromise;
}

// Request interceptor: attach auth header, auto-register if needed
api.interceptors.request.use(async (config) => {
  // Skip registration for the register endpoint itself
  const isRegisterEndpoint = config.url?.includes('/auth/mobile/register');
  if (!isRegisterEndpoint) {
    await ensureRegistered();
  }

  const token = await getSessionToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor: clear expired token and re-register on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retried) {
      originalRequest._retried = true;
      // Token is expired/invalid — clear it so ensureRegistered creates a new one
      await clearAuthTokens();
      registrationPromise = null;
      await ensureRegistered();
      const newToken = await getSessionToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }
      return api(originalRequest);
    }
    return Promise.reject(error);
  },
);

/**
 * Reset the cached registration promise.
 * Call after sign-out so ensureRegistered doesn't skip re-registration.
 */
export function resetRegistrationState(): void {
  registrationPromise = null;
}

// Export for use by auth context to manually trigger registration
export { ensureRegistered };

export const getCurrentUser = async () => {
  const response = await api.get('/me');
  return response.data;
};

export const getTickets = async (filters?: TicketFilters) => {
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
  const url = queryString ? `/tickets?${queryString}` : '/tickets';

  const response = await api.get(url);
  return response.data;
};

export const getTicket = async (ticketId: string) => {
  const response = await api.get(`/tickets/${ticketId}`);
  return response.data;
};

export const getVehicles = async () => {
  const response = await api.get('/vehicles');
  return response.data;
};

export const signIn = async (deviceId?: string, referralCode?: string | null) => {
  await GoogleSignin.hasPlayServices();
  const userInfo = await GoogleSignin.signIn();

  if (!userInfo.data || !userInfo.data.idToken) {
    throw new Error('Failed to get Google Sign-In token');
  }

  const response = await axios.post(`${apiUrlFromEnv}/auth/mobile`, {
    idToken: userInfo.data.idToken,
    deviceId,
    ...(referralCode ? { referralCode } : {}),
  });

  return response.data;
};

export const signInWithFacebook = async (accessToken: string, deviceId?: string, referralCode?: string | null) => {
  const response = await axios.post(`${apiUrlFromEnv}/auth/mobile/facebook`, {
    accessToken,
    deviceId,
    ...(referralCode ? { referralCode } : {}),
  });

  return response.data;
};

export const signInWithApple = async (
  identityToken: string,
  authorizationCode: string,
  deviceId?: string,
  referralCode?: string | null,
) => {
  const response = await axios.post(`${apiUrlFromEnv}/auth/mobile/apple`, {
    identityToken,
    authorizationCode,
    deviceId,
    ...(referralCode ? { referralCode } : {}),
  });

  return response.data;
};

export const sendMagicLink = async (email: string) => {
  const response = await axios.post(`${apiUrlFromEnv}/auth/mobile/magic-link`, {
    email,
  });

  return response.data;
};

export const verifyMagicLink = async (token: string, deviceId?: string) => {
  const response = await axios.post(`${apiUrlFromEnv}/auth/mobile/magic-link/verify`, {
    token,
    deviceId,
  });

  return response.data;
};

export const mobileLogout = async (
  deviceId: string,
): Promise<{ token: string; userId: string }> => {
  const currentToken = await getSessionToken();
  // Use raw axios (not the `api` instance) to avoid the 401 interceptor
  // from clearing the token and auto-re-registering during logout
  const response = await axios.post(
    `${apiUrlFromEnv}/auth/mobile/logout`,
    { deviceId },
    {
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      },
    },
  );
  return response.data;
};

export const processImageWithOCR = async (scannedImage: string) => {
  const response = await api.post('/ocr/upload-image', { scannedImage });
  return response.data;
};

export const createTicket = async (ticketData: any) => {
  const response = await api.post('/tickets/create', ticketData);
  return response.data;
};

export const uploadImage = async (data: string, text?: string) => {
  const response = await api.post('/upload', {
    scannedImage: data,
    ocrText: text,
  });
  return response.data;
};

export const confirmPurchase = async (ticketId: string, productId: string) => {
  const response = await api.post('/iap/confirm-purchase', {
    ticketId,
    productId,
  });
  return response.data;
};

export const updateUser = async (
  userId: string,
  data: { phoneNumber?: string; name?: string; address?: Address; signatureDataUrl?: string },
) => {
  const response = await api.patch(`/user/${userId}`, data);
  return response.data;
};

export const generateChallengeLetter = async (
  pcnNumber: string,
  challengeReason: string,
  additionalDetails?: string,
) => {
  const response = await api.post('/letters/generate', {
    pcnNumber,
    challengeReason,
    additionalDetails,
  });
  return response.data;
};

export const generateTE7Form = async (pcnNumber: string, reasonText: string) => {
  const response = await api.post('/forms/te7', { pcnNumber, reasonText });
  return response.data;
};

export const generateTE9Form = async (
  pcnNumber: string,
  grounds: {
    didNotReceiveNotice: boolean;
    madeRepresentations: boolean;
    hadNoResponse: boolean;
    appealNotDetermined: boolean;
    appealInFavour: boolean;
    paidInFull: boolean;
  },
) => {
  const response = await api.post('/forms/te9', { pcnNumber, ...grounds });
  return response.data;
};

export const generatePE2Form = async (pcnNumber: string, reasonText: string) => {
  const response = await api.post('/forms/pe2', { pcnNumber, reasonText });
  return response.data;
};

export const generatePE3Form = async (
  pcnNumber: string,
  grounds: {
    didNotReceiveNotice: boolean;
    madeRepresentations: boolean;
    hadNoResponse: boolean;
    appealNotDetermined: boolean;
    appealInFavour: boolean;
    paidInFull: boolean;
  },
) => {
  const response = await api.post('/forms/pe3', { pcnNumber, ...grounds });
  return response.data;
};

export const deleteTicket = async (ticketId: string) => {
  const response = await api.delete(`/tickets/${ticketId}`);
  return response.data;
};

export const deleteAccount = async (userId: string) => {
  const response = await api.delete(`/user/${userId}`);
  return response.data;
};

export const getNotifications = async (limit = 50, offset = 0, unreadOnly = false) => {
  const response = await api.get('/notifications', {
    params: { limit, offset, unreadOnly },
  });
  return response.data;
};

export const markNotificationAsRead = async (notificationId: string) => {
  const response = await api.patch(`/notifications/${notificationId}/read`, {});
  return response.data;
};

export const getNotificationPreferences = async () => {
  const response = await api.get('/notifications/preferences');
  return response.data;
};

export const updateNotificationPreferences = async (preferences: {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}) => {
  const response = await api.patch('/notifications/preferences', { preferences });
  return response.data;
};

export const registerPushToken = async (
  token: string,
  platform: 'IOS' | 'ANDROID',
  deviceId?: string,
) => {
  const response = await api.post('/notifications/register-token', {
    token,
    platform,
    deviceId,
  });
  return response.data;
};

export const unregisterPushToken = async (token: string) => {
  const response = await api.post('/notifications/unregister-token', { token });
  return response.data;
};

// Evidence
export const uploadEvidence = async (
  ticketId: string,
  image: string,
  description: string,
  evidenceType: string,
) => {
  const response = await api.post(`/tickets/${ticketId}/evidence`, {
    image,
    description,
    evidenceType,
  });
  return response.data;
};

export const deleteEvidence = async (ticketId: string, mediaId: string) => {
  const response = await api.delete(`/tickets/${ticketId}/evidence/${mediaId}`);
  return response.data;
};

// Ticket status
export const updateTicketStatus = async (ticketId: string, status: string) => {
  const response = await api.patch(`/tickets/${ticketId}/status`, { status });
  return response.data;
};

// Live status
export const checkTicketLiveStatus = async (ticketId: string) => {
  const response = await api.post(`/tickets/${ticketId}/live-status`);
  return response.data;
};

export const pollTicketLiveStatus = async (ticketId: string) => {
  const response = await api.get(`/tickets/${ticketId}/live-status`);
  return response.data;
};
