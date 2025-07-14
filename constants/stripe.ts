import { TicketTier } from '@prisma/client';

// Stripe Price IDs for different tiers and subscription types
export const STRIPE_PRICE_IDS = {
  // one-time tier upgrades (for individual tickets)
  TIER_STANDARD: process.env.NEXT_PUBLIC_STRIPE_PRICE_TIER_STANDARD,
  TIER_PREMIUM: process.env.NEXT_PUBLIC_STRIPE_PRICE_TIER_PREMIUM,

  // Subscription tiers (for user accounts)
  SUBSCRIPTION_MONTHLY:
    process.env.NEXT_PUBLIC_STRIPE_PRICE_SUBSCRIPTION_MONTHLY,
  SUBSCRIPTION_ANNUAL: process.env.NEXT_PUBLIC_STRIPE_PRICE_SUBSCRIPTION_ANNUAL,
} as const;

// type for subscription types
export type SubscriptionType = 'monthly' | 'annual';

// helper function to get price ID for tier upgrades
export const getTierPriceId = (
  tier: Omit<TicketTier, 'FREE'>,
): string | undefined =>
  STRIPE_PRICE_IDS[`TIER_${tier}` as keyof typeof STRIPE_PRICE_IDS];

// helper function to get price ID for subscriptions
export const getSubscriptionPriceId = (
  type: SubscriptionType,
): string | undefined =>
  STRIPE_PRICE_IDS[
    `SUBSCRIPTION_${type.toUpperCase()}` as keyof typeof STRIPE_PRICE_IDS
  ];

// check if a price ID is a tier upgrade
export const isTierUpgradePrice = (priceId: string): boolean =>
  Object.values({
    TIER_STANDARD: STRIPE_PRICE_IDS.TIER_STANDARD,
    TIER_PREMIUM: STRIPE_PRICE_IDS.TIER_PREMIUM,
  }).includes(priceId);

// check if a price ID is a subscription
export const isSubscriptionPrice = (priceId: string): boolean =>
  Object.values({
    SUBSCRIPTION_MONTHLY: STRIPE_PRICE_IDS.SUBSCRIPTION_MONTHLY,
    SUBSCRIPTION_ANNUAL: STRIPE_PRICE_IDS.SUBSCRIPTION_ANNUAL,
  }).includes(priceId);
