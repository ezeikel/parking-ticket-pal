// eslint-disable-next-line import-x/no-extraneous-dependencies
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { createServerLogger } from '@/lib/logger';
// import { SessionPayload } from '@/app/lib/definitions';

const logger = createServerLogger({ action: 'session' });

const secretKey = process.env.NEXT_AUTH_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

// TODO: add type for payload like in - https://nextjs.org/docs/app/building-your-application/authentication
export async function encrypt(payload: { id: string; email?: string | null }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);
}

export async function encryptMagicLink(payload: {
  email: string;
  expires?: number;
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    logger.error(
      'Failed to verify session',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );
    return null;
  }
}
