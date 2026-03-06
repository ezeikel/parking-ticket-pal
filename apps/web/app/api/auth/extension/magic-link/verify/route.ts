import { decrypt, encrypt } from '@/app/lib/session';
import { createServerLogger } from '@/lib/logger';
import { handleMobileOAuthSignIn } from '@/lib/mobile-auth';

const log = createServerLogger({ action: 'auth-extension-magic-link-verify' });

export const POST = async (req: Request) => {
  const { token } = await req.json();

  if (!token) {
    return Response.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    const payload = await decrypt(token);

    if (!payload || !payload.email || typeof payload.email !== 'string') {
      return Response.json({ error: 'Invalid token' }, { status: 400 });
    }

    const { userId } = await handleMobileOAuthSignIn(
      null,
      payload.email,
      payload.email.split('@')[0],
    );

    const sessionToken = await encrypt({
      email: payload.email,
      id: userId,
    });

    return Response.json(
      { sessionToken, userId, email: payload.email },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    );
  } catch (error) {
    log.error(
      'Extension magic link verification error',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return Response.json(
      { error: 'Invalid or expired token' },
      { status: 400 },
    );
  }
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
