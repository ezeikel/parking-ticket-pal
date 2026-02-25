import { db } from '@parking-ticket-pal/db';
import stripe from '@/lib/stripe';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'referral-stripe' });

/**
 * Create a Stripe coupon from a user's referral credit balance.
 * Returns the coupon ID, or null if the user has no credit.
 */
export async function createReferralCoupon(
  userId: string,
): Promise<string | null> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { referralCreditBalance: true },
    });

    if (!user || user.referralCreditBalance <= 0) {
      return null;
    }

    const coupon = await stripe.coupons.create({
      amount_off: user.referralCreditBalance,
      currency: 'gbp',
      duration: 'once',
      metadata: {
        type: 'referral_credit',
        userId,
        amount: user.referralCreditBalance.toString(),
      },
    });

    logger.info('Created referral coupon', {
      userId,
      couponId: coupon.id,
      amount: user.referralCreditBalance,
    });

    return coupon.id;
  } catch (error) {
    logger.error(
      'Error creating referral coupon',
      { userId },
      error instanceof Error ? error : undefined,
    );
    return null;
  }
}

/**
 * Mark referral credits as APPLIED (FIFO order) and decrement user balance.
 */
export async function applyReferralCredits(
  userId: string,
  amountUsed: number,
): Promise<void> {
  try {
    await db.$transaction(async (tx) => {
      // Get pending credits in FIFO order
      const pendingCredits = await tx.referralCredit.findMany({
        where: { userId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });

      let remaining = amountUsed;

      // Mark credits as applied in FIFO order
      const creditsToApply = pendingCredits.filter((credit) => {
        if (remaining <= 0) return false;
        remaining -= Math.min(credit.amount, remaining);
        return true;
      });

      await Promise.all(
        creditsToApply.map((credit) =>
          tx.referralCredit.update({
            where: { id: credit.id },
            data: {
              status: 'APPLIED',
              appliedAt: new Date(),
            },
          }),
        ),
      );

      // Decrement user balance
      await tx.user.update({
        where: { id: userId },
        data: {
          referralCreditBalance: { decrement: amountUsed },
        },
      });
    });

    logger.info('Applied referral credits', { userId, amountUsed });
  } catch (error) {
    logger.error(
      'Error applying referral credits',
      { userId, amountUsed },
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Delete a one-time coupon after it has been used.
 */
export async function deleteCouponAfterUse(couponId: string): Promise<void> {
  try {
    await stripe.coupons.del(couponId);
    logger.info('Deleted referral coupon', { couponId });
  } catch (error) {
    logger.error(
      'Error deleting referral coupon',
      { couponId },
      error instanceof Error ? error : undefined,
    );
  }
}
