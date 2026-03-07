import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'sms' });

type SendSmsOptions = {
  to: string;
  body: string;
};

type SendSmsResult = {
  success: boolean;
  sid?: string;
  error?: string;
};

// eslint-disable-next-line import-x/prefer-default-export
export async function sendSms({
  to,
  body,
}: SendSmsOptions): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    log.error('Missing Twilio environment variables', {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasFromNumber: !!fromNumber,
    });
    return { success: false, error: 'Missing Twilio configuration' };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: to,
          Body: body,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      log.error('Twilio API error', {
        status: response.status,
        code: data.code,
        message: data.message,
      });
      return {
        success: false,
        error: data.message || `Twilio API error: ${response.status}`,
      };
    }

    return { success: true, sid: data.sid };
  } catch (error) {
    log.error(
      'Failed to send SMS',
      { to },
      error instanceof Error ? error : undefined,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
