/* eslint-disable import/prefer-default-export */

import { db } from '@parking-ticket-pal/db';
import { decrypt, encrypt } from '@/app/lib/session';

export const POST = async (req: Request) => {
  const { token } = await req.json();

  if (!token) {
    return Response.json(
      { error: 'Token is required' },
      { status: 400 }
    );
  }

  try {
    // Decrypt and verify the magic link token
    const payload = await decrypt(token);

    if (!payload || !payload.email || typeof payload.email !== 'string') {
      return Response.json(
        { error: 'Invalid token' },
        { status: 400 }
      );
    }

    // Token expiration is handled by JWT itself, no need to check manually

    // Find or create user
    let user = await db.user.findUnique({
      where: { email: payload.email }
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email: payload.email,
          name: payload.email.split('@')[0],
          subscription: {
            create: {},
          },
        },
      });
    }

    // Generate session token for mobile app
    const sessionToken = await encrypt({ email: user.email, id: user.id });

    return Response.json(
      { sessionToken },
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
    console.error('Magic link verification error', error);
    return Response.json(
      { error: 'Invalid or expired token' },
      { status: 400 }
    );
  }
};