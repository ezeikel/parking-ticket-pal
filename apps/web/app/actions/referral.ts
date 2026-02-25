'use server';

import { customAlphabet } from 'nanoid';
import { db } from '@parking-ticket-pal/db';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';
import { track } from '@/utils/analytics-server';
import { TRACKING_EVENTS } from '@/constants/events';

const logger = createServerLogger({ action: 'referral' });

// Exclude ambiguous characters: 0/O/I/l
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
const generateCode = customAlphabet(ALPHABET, 8);

const MAX_CODE_RETRIES = 5;

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

export const getOrCreateReferralCode = async (): Promise<{
  success: boolean;
  data?: { code: string };
  error?: string;
}> => {
  const userId = await getUserId('get or create referral code');

  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Check for existing code
    const existing = await db.referralCode.findUnique({
      where: { userId },
    });

    if (existing) {
      return { success: true, data: { code: existing.code } };
    }

    // Generate a unique code with retry
    const result = await generateWithRetry(userId, MAX_CODE_RETRIES);
    if (result) {
      await track(TRACKING_EVENTS.REFERRAL_CODE_GENERATED, {
        code: result.code,
      });
      return { success: true, data: result };
    }

    logger.error('Failed to generate unique referral code after retries', {
      userId,
    });
    return { success: false, error: 'Failed to generate referral code' };
  } catch (error) {
    logger.error(
      'Error creating referral code',
      { userId },
      error instanceof Error ? error : undefined,
    );
    return { success: false, error: 'Failed to create referral code' };
  }
};

export const getReferralStats = async (): Promise<{
  success: boolean;
  data?: {
    totalReferrals: number;
    creditedReferrals: number;
    creditBalance: number;
    totalEarned: number;
  };
  error?: string;
}> => {
  const userId = await getUserId('get referral stats');

  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { referralCreditBalance: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const referralCode = await db.referralCode.findUnique({
      where: { userId },
    });

    if (!referralCode) {
      return {
        success: true,
        data: {
          totalReferrals: 0,
          creditedReferrals: 0,
          creditBalance: user.referralCreditBalance,
          totalEarned: 0,
        },
      };
    }

    const totalReferrals = await db.referral.count({
      where: { referralCodeId: referralCode.id },
    });

    const creditedReferrals = await db.referral.count({
      where: {
        referralCodeId: referralCode.id,
        status: 'CREDITED',
      },
    });

    const totalEarnedResult = await db.referralCredit.aggregate({
      where: {
        userId,
        type: 'REFERRER_REWARD',
      },

      _sum: { amount: true },
    });

    return {
      success: true,
      data: {
        totalReferrals,
        creditedReferrals,
        creditBalance: user.referralCreditBalance,
        // eslint-disable-next-line no-underscore-dangle
        totalEarned: totalEarnedResult._sum.amount || 0,
      },
    };
  } catch (error) {
    logger.error(
      'Error fetching referral stats',
      { userId },
      error instanceof Error ? error : undefined,
    );
    return { success: false, error: 'Failed to fetch referral stats' };
  }
};
