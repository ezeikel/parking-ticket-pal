/* eslint-disable import/prefer-default-export */

import { OAuth2Client } from 'google-auth-library';
import { db } from '@parking-ticket-pal/db';
import { encrypt } from '@/app/lib/session';

const client = new OAuth2Client(
  '1069305445287-1m5mhd9lkm8c1trksbhlqd2cia0itjpj.apps.googleusercontent.com',
);

export const POST = async (req: Request) => {
  const { idToken } = await req.json();
  let user;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience:
        '1069305445287-1m5mhd9lkm8c1trksbhlqd2cia0itjpj.apps.googleusercontent.com',
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return Response.json(
        {
          error: 'Invalid token',
        },
        {
          status: 400,
        },
      );
    }

    const existingUser = payload.email
      ? await db.user.findUnique({ where: { email: payload.email } })
      : null;

    if (!existingUser) {
      user = await db.user.create({
        data: {
          email: payload.email as string,
          name: payload.name as string,
          subscription: {
            create: {},
          },
        },
      });
    } else {
      user = existingUser;
    }

    // generate a session token (or JWT) for the mobile app to use
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
    console.error('error', error);

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
