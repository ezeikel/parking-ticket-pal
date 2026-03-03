import { createHash } from 'crypto';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'meta-capi' });

const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_CAPI_ACCESS_TOKEN;
const API_VERSION = 'v21.0';

function sha256Hash(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

type UserData = {
  email?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
};

type CustomData = {
  currency: string;
  value: number;
  content_name?: string;
  content_type?: string;
};

type ConversionEvent = {
  eventName: string;
  eventTime: number;
  eventId?: string;
  eventSourceUrl?: string;
  userData: UserData;
  customData?: CustomData;
};

async function sendConversionEvent(event: ConversionEvent): Promise<void> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    logger.warn('Meta CAPI not configured — missing PIXEL_ID or ACCESS_TOKEN');
    return;
  }

  const userData: Record<string, string> = {};

  if (event.userData.email) {
    userData.em = sha256Hash(event.userData.email);
  }
  if (event.userData.fbp) {
    userData.fbp = event.userData.fbp;
  }
  if (event.userData.fbc) {
    userData.fbc = event.userData.fbc;
  }
  if (event.userData.clientIpAddress) {
    userData.client_ip_address = event.userData.clientIpAddress;
  }
  if (event.userData.clientUserAgent) {
    userData.client_user_agent = event.userData.clientUserAgent;
  }

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: event.eventTime,
        action_source: 'website' as const,
        ...(event.eventId && { event_id: event.eventId }),
        ...(event.eventSourceUrl && {
          event_source_url: event.eventSourceUrl,
        }),
        user_data: userData,
        ...(event.customData && { custom_data: event.customData }),
      },
    ],
    ...(process.env.FACEBOOK_CAPI_TEST_EVENT_CODE && {
      test_event_code: process.env.FACEBOOK_CAPI_TEST_EVENT_CODE,
    }),
  };

  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      access_token: ACCESS_TOKEN,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error('Meta CAPI request failed', {
      status: response.status,
      body,
      eventName: event.eventName,
    });
    return;
  }

  logger.info('Meta CAPI event sent', {
    eventName: event.eventName,
    eventId: event.eventId,
  });
}

export type ServerPurchaseData = {
  email?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  eventId?: string | null;
  value: number;
  currency?: string;
};

export async function trackServerPurchase(
  data: ServerPurchaseData,
): Promise<void> {
  await sendConversionEvent({
    eventName: 'Purchase',
    eventTime: Math.floor(Date.now() / 1000),
    ...(data.eventId && { eventId: data.eventId }),
    userData: {
      email: data.email,
      fbp: data.fbp,
      fbc: data.fbc,
    },
    customData: {
      currency: data.currency || 'GBP',
      value: data.value,
      content_name: 'premium_ticket',
      content_type: 'product',
    },
  });
}
