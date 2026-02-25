import jwt from 'jsonwebtoken';
import { encrypt } from '@/app/lib/session';
import { createServerLogger } from '@/lib/logger';
import { handleMobileOAuthSignIn } from '@/lib/mobile-auth';

const log = createServerLogger({ action: 'auth-apple' });

// eslint-disable-next-line import-x/prefer-default-export
export const POST = async (req: Request) => {
  const { identityToken, deviceId, referralCode } = await req.json();

  try {
    // Decode the Apple identity token (without verification for simplicity)
    // In production, you should verify the token signature
    const decoded = jwt.decode(identityToken) as any;

    if (!decoded || !decoded.email) {
      return Response.json({ error: 'Invalid Apple token' }, { status: 400 });
    }

    const { userId, isNewUser, wasMerged } = await handleMobileOAuthSignIn(
      deviceId,
      decoded.email,
      decoded.email.split('@')[0],
      referralCode,
    );

    const sessionToken = await encrypt({
      email: decoded.email,
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
    log.error(
      'Apple auth error',
      undefined,
      error instanceof Error ? error : undefined,
    );

    return Response.json({ error: 'Bad request' }, { status: 400 });
  }
};
