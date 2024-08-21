/* eslint-disable import/prefer-default-export */

import { OAuth2Client } from 'google-auth-library';
import prisma from '@/lib/prisma';
import { encrypt } from '@/app/lib/session';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const POST = async (request: Request) => {
  const { idToken } = await request.json();
  let user;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
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
      ? await prisma.user.findUnique({ where: { email: payload.email } })
      : null;

    if (!existingUser) {
      user = await prisma.user.create({
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
