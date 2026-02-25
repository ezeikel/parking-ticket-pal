import { db } from '@parking-ticket-pal/db';
import { customAlphabet } from 'nanoid';
import { getMobileAuthFromHeaders } from '@/lib/mobile-auth';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'referral-api' });

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
const generateCode = customAlphabet(ALPHABET, 8);

async function generateWithRetry(
  userId: string,
  retriesLeft: number,
): Promise<{ code: string } | null> {
  if (retriesLeft <= 0) return null;
  const code = generateCode();
  try {
    const referralCode = await db.referralCode.create({
      data: { userId, code },
    });
    return { code: referralCode.code };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return generateWithRetry(userId, retriesLeft - 1);
    }
    throw error;
  }
}

// eslint-disable-next-line import-x/prefer-default-export
export const GET = async (req: Request) => {
  const auth = await getMobileAuthFromHeaders(req.headers);

  if (!auth?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check for existing code
    const existing = await db.referralCode.findUnique({
      where: { userId: auth.userId },
    });

    if (existing) {
      return Response.json({ code: existing.code });
    }

    // Generate a new code with retry
    const result = await generateWithRetry(auth.userId, 5);
    if (result) {
      return Response.json({ code: result.code });
    }

    return Response.json({ error: 'Failed to generate code' }, { status: 500 });
  } catch (error) {
    logger.error(
      'Error getting referral code',
      { userId: auth.userId },
      error instanceof Error ? error : undefined,
    );
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
