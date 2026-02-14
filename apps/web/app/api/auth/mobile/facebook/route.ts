import { db } from '@parking-ticket-pal/db';
import { encrypt } from '@/app/lib/session';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'auth-facebook' });

// eslint-disable-next-line import-x/prefer-default-export
export const POST = async (req: Request) => {
  const { accessToken } = await req.json();
  let user;

  try {
    // Verify Facebook access token
    const response = await fetch(
      `https://graph.facebook.com/v24.0/me?fields=id,name,email&access_token=${accessToken}`,
    );
    const payload = await response.json();

    if (!response.ok || payload.error) {
      return Response.json(
        {
          error: 'Invalid Facebook token',
        },
        {
          status: 400,
        },
      );
    }

    if (!payload.email) {
      return Response.json(
        {
          error: 'Email permission required',
        },
        {
          status: 400,
        },
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email: payload.email },
    });

    if (!existingUser) {
      user = await db.user.create({
        data: {
          email: payload.email,
          name: payload.name,
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
    log.error(
      'Facebook auth error',
      undefined,
      error instanceof Error ? error : undefined,
    );

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
