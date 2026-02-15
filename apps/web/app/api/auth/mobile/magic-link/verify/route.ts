import { decrypt, encrypt } from '@/app/lib/session';
import { createServerLogger } from '@/lib/logger';
import { handleMobileOAuthSignIn } from '@/lib/mobile-auth';

const log = createServerLogger({ action: 'auth-magic-link-verify' });

// eslint-disable-next-line import-x/prefer-default-export
export const POST = async (req: Request) => {
  const { token, deviceId } = await req.json();

  if (!token) {
    return Response.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    // Decrypt and verify the magic link token
    const payload = await decrypt(token);

    if (!payload || !payload.email || typeof payload.email !== 'string') {
      return Response.json({ error: 'Invalid token' }, { status: 400 });
    }

    const { userId, isNewUser, wasMerged } = await handleMobileOAuthSignIn(
      deviceId,
      payload.email,
      payload.email.split('@')[0],
    );

    // Generate session token for mobile app
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
    log.error(
      'Magic link verification error',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return Response.json(
      { error: 'Invalid or expired token' },
      { status: 400 },
    );
  }
};
