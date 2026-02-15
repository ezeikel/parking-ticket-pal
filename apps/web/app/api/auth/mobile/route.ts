import { OAuth2Client } from 'google-auth-library';
import { encrypt } from '@/app/lib/session';
import { createServerLogger } from '@/lib/logger';
import { handleMobileOAuthSignIn } from '@/lib/mobile-auth';

const log = createServerLogger({ action: 'auth-google' });

const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_IOS_CLIENT_ID = process.env.GOOGLE_IOS_CLIENT_ID!;

const client = new OAuth2Client(GOOGLE_WEB_CLIENT_ID);

// Accept tokens issued for web OR iOS audiences
const VALID_AUDIENCES = [GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID].filter(
  Boolean,
);

// eslint-disable-next-line import-x/prefer-default-export
export const POST = async (req: Request) => {
  const { idToken, deviceId } = await req.json();

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: VALID_AUDIENCES,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return Response.json({ error: 'Invalid token' }, { status: 400 });
    }

    const { userId, isNewUser, wasMerged } = await handleMobileOAuthSignIn(
      deviceId,
      payload.email,
      payload.name,
    );

    const sessionToken = await encrypt({
      email: payload.email,
      id: userId,
    });

    return Response.json(
      { sessionToken, userId, isNewUser, wasMerged },
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(
      `Google auth error: ${errorMessage}`,
      undefined,
      error instanceof Error ? error : undefined,
    );

    return Response.json(
      { error: 'Bad request', message: errorMessage },
      { status: 400 },
    );
  }
};
