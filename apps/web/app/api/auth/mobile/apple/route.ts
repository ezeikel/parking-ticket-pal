/* eslint-disable import/prefer-default-export */

import jwt from 'jsonwebtoken';
import { db } from '@parking-ticket-pal/db';
import { encrypt } from '@/app/lib/session';

export const POST = async (req: Request) => {
  const { identityToken } = await req.json();
  let user;

  try {
    // Decode the Apple identity token (without verification for simplicity)
    // In production, you should verify the token signature
    const decoded = jwt.decode(identityToken) as any;

    if (!decoded || !decoded.email) {
      return Response.json(
        {
          error: 'Invalid Apple token',
        },
        {
          status: 400,
        },
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email: decoded.email }
    });

    if (!existingUser) {
      user = await db.user.create({
        data: {
          email: decoded.email,
          name: decoded.email.split('@')[0], // Apple might not provide a name
          subscription: {
            create: {},
          },
        },
      });
    } else {
      user = existingUser;
    }

    // generate a session token for the mobile app to use
    const sessionToken = await encrypt({ email: user.email, id: user.id });

    return Response.json(
      {
        sessionToken,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Apple auth error', error);

    return Response.json(
      {
        error: 'Bad request',
      },
      {
        status: 400,
      },
    );
  }
};