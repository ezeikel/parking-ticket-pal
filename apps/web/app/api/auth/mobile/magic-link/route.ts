/* eslint-disable import/prefer-default-export */

import { sendMagicLinkEmail } from '@/lib/email';
import { encryptMagicLink } from '@/app/lib/session';

export const POST = async (req: Request) => {
  const { email } = await req.json();

  if (!email) {
    return Response.json(
      { error: 'Email is required' },
      { status: 400 }
    );
  }

  try {
    // Generate a magic link token
    const magicLinkToken = await encryptMagicLink({ email });
    const magicLink = `${process.env.NEXTAUTH_URL}/auth/magic-link/verify?token=${magicLinkToken}`;

    // Send magic link email using the new email service
    const result = await sendMagicLinkEmail(email, magicLink);

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

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
    console.error('Magic link error', error);
    return Response.json(
      { error: 'Failed to send magic link' },
      { status: 500 }
    );
  }
};