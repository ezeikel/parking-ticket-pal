import type { AuthData, ScrapedData, RecentImport } from './types';

// Content script -> Background
export type ContentMessage =
  | { type: 'AUTH_TOKEN_RECEIVED'; data: AuthData }
  | { type: 'TICKET_SCRAPED'; data: ScrapedData }
  | { type: 'ISSUER_DETECTED'; issuer: string };

// Popup -> Background
export type PopupMessage =
  | { type: 'GET_AUTH'; }
  | { type: 'SEND_MAGIC_LINK'; email: string }
  | { type: 'LOGOUT' }
  | { type: 'GET_RECENT_IMPORTS' }
  | { type: 'IMPORT_TICKET'; data: ScrapedData };

// Background -> Popup / Content
export type BackgroundResponse =
  | { type: 'AUTH_STATE'; data: AuthData | null }
  | { type: 'MAGIC_LINK_SENT'; success: boolean; error?: string }
  | { type: 'IMPORT_RESULT'; success: boolean; ticketId?: string; error?: string }
  | { type: 'RECENT_IMPORTS'; imports: RecentImport[] }
  | { type: 'LOGGED_OUT' };

export type Message = ContentMessage | PopupMessage;
