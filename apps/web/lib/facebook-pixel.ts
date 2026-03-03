declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

// Standard events: https://developers.facebook.com/docs/meta-pixel/reference
export type FacebookPixelEvent =
  | 'PageView'
  | 'Lead'
  | 'Purchase'
  | 'CompleteRegistration'
  | 'InitiateCheckout'
  | 'ViewContent';

type PurchaseParams = {
  value: number;
  currency: string;
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
};

type LeadParams = {
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
};

type ViewContentParams = {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
};

type EventParams =
  | PurchaseParams
  | LeadParams
  | ViewContentParams
  | Record<string, unknown>;

export const pageview = () => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView');
  }
};

export const event = (
  name: FacebookPixelEvent,
  params?: EventParams,
  eventId?: string,
) => {
  if (typeof window !== 'undefined' && window.fbq) {
    if (eventId) {
      window.fbq('track', name, params, { eventID: eventId });
    } else {
      window.fbq('track', name, params);
    }
  }
};

// Convenience functions for common events
export const trackLead = (params?: LeadParams) => {
  event('Lead', params);
};

export const trackPurchase = (params: PurchaseParams, eventId?: string) => {
  event('Purchase', params, eventId);
};

export const trackCompleteRegistration = (params?: Record<string, unknown>) => {
  event('CompleteRegistration', params);
};

export const trackInitiateCheckout = (params?: Record<string, unknown>) => {
  event('InitiateCheckout', params);
};

export const trackViewContent = (params?: ViewContentParams) => {
  event('ViewContent', params);
};
