import { sendMagicLinkEmail } from '@/lib/email';
import { encryptMagicLink } from '@/app/lib/session';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'extension_magic_link' });

export const POST = async (req: Request) => {
  const { email } = await req.json();

  if (!email) {
    logger.warn('Magic link request missing email');
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const magicLinkToken = await encryptMagicLink({ email });
    const magicLink = `${process.env.NEXTAUTH_URL}/auth/extension/magic-link-redirect?token=${magicLinkToken}`;

    logger.info('Sending extension magic link email', { email });

    const result = await sendMagicLinkEmail(email, magicLink);

    if (!result.success) {
      logger.error('Email sending failed', { email, error: result.error });
      throw new Error(result.error || 'Failed to send email');
    }

    logger.info('Extension magic link sent successfully', { email });

    return Response.json(
      { message: 'Magic link sent successfully' },
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
    logger.error(
      'Extension magic link error',
      { email },
      error instanceof Error ? error : new Error(String(error)),
    );
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to send magic link';
    return Response.json({ error: errorMessage }, { status: 500 });
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
