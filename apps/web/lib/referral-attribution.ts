import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { posthogServer } from '@/lib/posthog-server';
import { TRACKING_EVENTS } from '@/constants/events';

const logger = createServerLogger({ action: 'referral-attribution' });

const REFERRER_REWARD_PENCE = 500; // £5
const REFEREE_REWARD_PENCE = 300; // £3
const ATTRIBUTION_WINDOW_DAYS = 30;
const MONTHLY_REFERRAL_LIMIT = 20;

function trackReferralEvent(
  event: string,
  properties: Record<string, unknown>,
) {
  if (posthogServer) {
    posthogServer.capture({
      distinctId: (properties.referrer_id as string) || 'anonymous',
      event,
      properties: { ...properties, environment: 'server' },
    });
  }
}

/**
 * Attribute a referral to a newly signed-up user.
 * Returns the referral ID if attribution is successful, null otherwise.
 */
export async function attributeReferral(
  newUserId: string,
  newUserEmail: string | null,
  referralCode: string,
  capturedAt?: string | null,
): Promise<string | null> {
  try {
    // 1. Validate code exists
    const codeRecord = await db.referralCode.findUnique({
      where: { code: referralCode },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!codeRecord) {
      logger.warn('Referral code not found', { referralCode });
      return null;
    }

    // 2. Reject self-referral
    if (codeRecord.userId === newUserId) {
      logger.warn('Self-referral attempted', { userId: newUserId });
      return null;
    }

    if (
      newUserEmail &&
      codeRecord.user.email &&
      newUserEmail.toLowerCase() === codeRecord.user.email.toLowerCase()
    ) {
      logger.warn('Self-referral by email match', { email: newUserEmail });
      return null;
    }

    // 3. Reject if user already referred
    const existingReferral = await db.referral.findUnique({
      where: { refereeId: newUserId },
    });

    if (existingReferral) {
      logger.info('User already has a referral', { userId: newUserId });
      return null;
    }

    // 4. Check attribution window (30 days)
    if (capturedAt) {
      const capturedDate = new Date(capturedAt);
      const now = new Date();
      const daysSinceCapture =
        (now.getTime() - capturedDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceCapture > ATTRIBUTION_WINDOW_DAYS) {
        logger.info('Referral attribution window expired', {
          referralCode,
          daysSinceCapture,
        });
        return null;
      }
    }

    // 5. Check monthly limit (20 per referrer)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyCount = await db.referral.count({
      where: {
        referrerId: codeRecord.userId,
        createdAt: { gte: startOfMonth },
      },
    });

    if (monthlyCount >= MONTHLY_REFERRAL_LIMIT) {
      logger.info('Monthly referral limit reached', {
        referrerId: codeRecord.userId,
        monthlyCount,
      });
      return null;
    }

    // 6. Create Referral record
    const referral = await db.referral.create({
      data: {
        referralCodeId: codeRecord.id,
        referrerId: codeRecord.userId,
        refereeId: newUserId,
        status: 'PENDING',
        capturedAt: capturedAt ? new Date(capturedAt) : null,
        completedAt: new Date(),
      },
    });

    // 7. Set user.referredBy
    await db.user.update({
      where: { id: newUserId },
      data: { referredBy: codeRecord.userId },
    });

    // 8. Track event
    trackReferralEvent(TRACKING_EVENTS.REFERRAL_ATTRIBUTED, {
      referral_id: referral.id,
      referrer_id: codeRecord.userId,
      referee_id: newUserId,
      code: referralCode,
    });

    logger.info('Referral attributed', {
      referralId: referral.id,
      referrerId: codeRecord.userId,
      refereeId: newUserId,
    });

    return referral.id;
  } catch (error) {
    logger.error(
      'Error attributing referral',
      { newUserId, referralCode },
      error instanceof Error ? error : undefined,
    );
    return null;
  }
}

/**
 * Issue referral credits to both the referrer and referee.
 */
export async function issueReferralCredits(
  referralId: string,
): Promise<boolean> {
  try {
    const referral = await db.referral.findUnique({
      where: { id: referralId },
    });

    if (!referral) {
      logger.error('Referral not found', { referralId });
      return false;
    }

    if (referral.status !== 'PENDING' && referral.status !== 'COMPLETED') {
      logger.info('Referral already processed', {
        referralId,
        status: referral.status,
      });
      return false;
    }

    await db.$transaction(async (tx) => {
      // Create credit for referrer (£5)
      await tx.referralCredit.create({
        data: {
          referralId,
          userId: referral.referrerId,
          amount: REFERRER_REWARD_PENCE,
          type: 'REFERRER_REWARD',
          status: 'PENDING',
        },
      });

      // Create credit for referee (£3)
      await tx.referralCredit.create({
        data: {
          referralId,
          userId: referral.refereeId,
          amount: REFEREE_REWARD_PENCE,
          type: 'REFEREE_REWARD',
          status: 'PENDING',
        },
      });

      // Increment referrer's balance
      await tx.user.update({
        where: { id: referral.referrerId },
        data: {
          referralCreditBalance: { increment: REFERRER_REWARD_PENCE },
        },
      });

      // Increment referee's balance
      await tx.user.update({
        where: { id: referral.refereeId },
        data: {
          referralCreditBalance: { increment: REFEREE_REWARD_PENCE },
        },
      });

      // Update referral status
      await tx.referral.update({
        where: { id: referralId },
        data: {
          status: 'CREDITED',
          creditIssuedAt: new Date(),
        },
      });
    });

    trackReferralEvent(TRACKING_EVENTS.REFERRAL_CREDITS_ISSUED, {
      referral_id: referralId,
      referrer_id: referral.referrerId,
      referee_id: referral.refereeId,
      referrer_amount: REFERRER_REWARD_PENCE,
      referee_amount: REFEREE_REWARD_PENCE,
    });

    logger.info('Referral credits issued', {
      referralId,
      referrerId: referral.referrerId,
      refereeId: referral.refereeId,
    });

    return true;
  } catch (error) {
    logger.error(
      'Error issuing referral credits',
      { referralId },
      error instanceof Error ? error : undefined,
    );
    return false;
  }
}
