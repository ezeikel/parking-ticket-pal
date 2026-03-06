export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://www.parkingticketpal.com';

export const COLORS = {
  teal: '#1abc9c',
  tealDark: '#16a085',
  dark: '#222222',
  gray: '#717171',
  light: '#f7f7f7',
  white: '#ffffff',
  coral: '#ff5a5f',
} as const;

export const STORAGE_KEYS = {
  AUTH: 'ptp_auth',
  RECENT_IMPORTS: 'ptp_recent_imports',
  SETTINGS: 'ptp_settings',
} as const;
