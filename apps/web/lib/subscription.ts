/**
 * Per-ticket feature access helpers
 *
 * All access is based on `ticket.tier` (FREE | PREMIUM).
 * There are no global user-level subscriptions.
 */

import { TicketTier } from '@parking-ticket-pal/db/types';

/**
 * Check if a ticket has Premium tier
 */
export function isPremiumTier(tier: TicketTier): boolean {
  return tier === TicketTier.PREMIUM;
}

/**
 * Check if a user is currently ad-free
 * Premium purchases grant 30 days of ad-free experience
 */
export function isAdFree(user: {
  lastPremiumPurchaseAt: Date | null;
}): boolean {
  if (!user.lastPremiumPurchaseAt) {
    return false;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return new Date(user.lastPremiumPurchaseAt) > thirtyDaysAgo;
}
