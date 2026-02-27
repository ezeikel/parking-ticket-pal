import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'parking_ticket_pal_device_id';
const SESSION_TOKEN_KEY = 'parking_ticket_pal_session_token';
const USER_ID_KEY = 'parking_ticket_pal_user_id';
const LEGACY_SESSION_TOKEN_KEY = 'sessionToken';

let cachedDeviceId: string | null = null;

function generateRandomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Get or create a persistent device ID.
 */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!deviceId) {
    // Use platform install ID if available, otherwise generate one
    if (Platform.OS === 'ios') {
      deviceId = await Application.getIosIdForVendorAsync() || generateRandomId();
    } else {
      deviceId = Application.getAndroidId() ?? generateRandomId();
    }
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }
  cachedDeviceId = deviceId;
  return deviceId;
}

/**
 * Get the current session token. Handles legacy migration.
 */
export async function getSessionToken(): Promise<string | null> {
  // Check new key first
  let token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  if (token) return token;

  // Migrate legacy token if exists
  const legacyToken = await SecureStore.getItemAsync(LEGACY_SESSION_TOKEN_KEY);
  if (legacyToken) {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, legacyToken);
    await SecureStore.deleteItemAsync(LEGACY_SESSION_TOKEN_KEY);
    return legacyToken;
  }

  return null;
}

/**
 * Store session token.
 */
export async function setSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
}

/**
 * Get stored user ID.
 */
export async function getUserId(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_ID_KEY);
}

/**
 * Store user ID.
 */
export async function setUserId(userId: string): Promise<void> {
  await SecureStore.setItemAsync(USER_ID_KEY, userId);
}

/**
 * Get auth header for API calls.
 */
export async function getAuthHeader(): Promise<string | null> {
  const token = await getSessionToken();
  if (token) return `Bearer ${token}`;
  return null;
}

/**
 * Check if user has linked an OAuth/email account.
 */
export async function isAccountLinked(): Promise<boolean> {
  // This is checked via the API (/me endpoint, isLinked field)
  // Local check is just whether we have a session token
  // The real check happens in auth context
  const token = await getSessionToken();
  return !!token;
}

/**
 * Clear all auth data (for sign-out).
 * Preserves deviceId since it identifies the device permanently.
 */
export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_ID_KEY);
  await SecureStore.deleteItemAsync(LEGACY_SESSION_TOKEN_KEY);
}
