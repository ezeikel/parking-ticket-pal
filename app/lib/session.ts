// eslint-disable-next-line import/no-extraneous-dependencies
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
// import { SessionPayload } from '@/app/lib/definitions';

const secretKey = process.env.NEXT_AUTH_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

// TODO: add type for payload like in - https://nextjs.org/docs/app/building-your-application/authentication
export async function encrypt(payload: { id: string; email: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);
}

// eslint-disable-next-line consistent-return
export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    console.error('Failed to verify session');
  }
}
