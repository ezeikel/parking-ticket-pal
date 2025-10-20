/* eslint-disable import/prefer-default-export */

import { sendMagicLinkEmail } from '@/lib/email';
import { encryptMagicLink } from '@/app/lib/session';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'mobile_magic_link' });

export const POST = async (req: Request) => {
  const { email } = await req.json();

  if (!email) {
    logger.warn('Magic link request missing email');
    return Response.json(
      { error: 'Email is required' },
      { status: 400 }
    );
  }

  try {
    // Generate a magic link token
    const magicLinkToken = await encryptMagicLink({ email });
    // Use a mobile-specific verification URL that will deep link to the app
    const magicLink = `${process.env.NEXTAUTH_URL}/auth/mobile/magic-link-redirect?token=${magicLinkToken}`;

    logger.info('Sending magic link email', { email });

    // Send magic link email using the new email service
    const result = await sendMagicLinkEmail(email, magicLink);

    if (!result.success) {
      logger.error('Email sending failed', { email, error: result.error });
      throw new Error(result.error || 'Failed to send email');
    }

    logger.info('Magic link sent successfully', { email });

    return Response.json(
      { message: 'Magic link sent successfully' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 200
      }
    );
  } catch (error) {
    logger.error('Magic link error', { email }, error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link';
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
};