import { TicketTier } from '@prisma/client';

// Stripe Price IDs for different tiers and subscription types
export const STRIPE_PRICE_IDS = {
  // One-time purchases (per ticket)
  ONE_TIME_STANDARD: process.env.NEXT_PUBLIC_STRIPE_PRICE_ONE_TIME_STANDARD,
  ONE_TIME_PREMIUM: process.env.NEXT_PUBLIC_STRIPE_PRICE_ONE_TIME_PREMIUM,

  // Consumer Subscriptions - Standard (up to 5 tickets/month)
  SUBSCRIPTION_STANDARD_MONTHLY:
    process.env.NEXT_PUBLIC_STRIPE_PRICE_SUBSCRIPTION_STANDARD_MONTHLY,
  SUBSCRIPTION_STANDARD_YEARLY:
    process.env.NEXT_PUBLIC_STRIPE_PRICE_SUBSCRIPTION_STANDARD_YEARLY,

  // Consumer Subscriptions - Premium (up to 10 tickets/month)
  SUBSCRIPTION_PREMIUM_MONTHLY:
    process.env.NEXT_PUBLIC_STRIPE_PRICE_SUBSCRIPTION_PREMIUM_MONTHLY,
  SUBSCRIPTION_PREMIUM_YEARLY:
    process.env.NEXT_PUBLIC_STRIPE_PRICE_SUBSCRIPTION_PREMIUM_YEARLY,

  // Business/Fleet Plans - Starter (up to 50 tickets/month)
  FLEET_STARTER_MONTHLY:
    process.env.NEXT_PUBLIC_STRIPE_PRICE_FLEET_STARTER_MONTHLY,
  FLEET_STARTER_YEARLY:
    process.env.NEXT_PUBLIC_STRIPE_PRICE_FLEET_STARTER_YEARLY,

  // Business/Fleet Plans - Pro (up to 200 tickets/month)
  FLEET_PRO_MONTHLY: process.env.NEXT_PUBLIC_STRIPE_PRICE_FLEET_PRO_MONTHLY,
  FLEET_PRO_YEARLY: process.env.NEXT_PUBLIC_STRIPE_PRICE_FLEET_PRO_YEARLY,

  // Business/Fleet Plans - Enterprise (custom, handled separately)
  // Enterprise doesn't have fixed price IDs as it's custom pricing

  // Legacy aliases for backward compatibility (DEPRECATED - will be removed)
  /** @deprecated Use ONE_TIME_STANDARD instead */
  TIER_STANDARD: process.env.NEXT_PUBLIC_STRIPE_PRICE_ONE_TIME_STANDARD,
  /** @deprecated Use ONE_TIME_PREMIUM instead */
  TIER_PREMIUM: process.env.NEXT_PUBLIC_STRIPE_PRICE_ONE_TIME_PREMIUM,
  /** @deprecated Use SUBSCRIPTION_STANDARD_MONTHLY instead */
  SUBSCRIPTION_MONTHLY:
    process.env.NEXT_PUBLIC_STRIPE_PRICE_SUBSCRIPTION_STANDARD_MONTHLY,
  /** @deprecated Use SUBSCRIPTION_STANDARD_YEARLY instead */
  SUBSCRIPTION_ANNUAL:
    process.env.NEXT_PUBLIC_STRIPE_PRICE_SUBSCRIPTION_STANDARD_YEARLY,
} as const;

// Type for subscription billing periods
export type BillingPeriod = 'monthly' | 'yearly';

// Type for subscription tiers
export type SubscriptionTier = 'standard' | 'premium';

// Type for fleet tiers
export type FleetTier = 'starter' | 'pro' | 'enterprise';

// Legacy type for backward compatibility
/** @deprecated Use BillingPeriod instead */
export type SubscriptionType = 'monthly' | 'annual';

// ============================================================================
// Helper Functions - One-Time Purchases
// ============================================================================

/**
 * Get Stripe Price ID for one-time ticket purchases
 * @param tier - 'standard' | 'premium'
 * @returns Stripe Price ID or undefined
 */
export const getOneTimePriceId = (
  tier: 'standard' | 'premium',
): string | undefined => {
  const key = `ONE_TIME_${tier.toUpperCase()}` as keyof typeof STRIPE_PRICE_IDS;
  return STRIPE_PRICE_IDS[key];
};

// ============================================================================
// Helper Functions - Consumer Subscriptions
// ============================================================================

/**
 * Get Stripe Price ID for consumer subscriptions
 * @param tier - 'standard' | 'premium'
 * @param period - 'monthly' | 'yearly'
 * @returns Stripe Price ID or undefined
 */
export const getConsumerSubscriptionPriceId = (
  tier: SubscriptionTier,
  period: BillingPeriod,
): string | undefined => {
  const key =
    `SUBSCRIPTION_${tier.toUpperCase()}_${period.toUpperCase()}` as keyof typeof STRIPE_PRICE_IDS;
  return STRIPE_PRICE_IDS[key];
};

// ============================================================================
// Helper Functions - Fleet/Business Plans
// ============================================================================

/**
 * Get Stripe Price ID for fleet/business plans
 * @param tier - 'starter' | 'pro' | 'enterprise'
 * @param period - 'monthly' | 'yearly'
 * @returns Stripe Price ID or undefined (enterprise returns undefined as it's custom)
 */
export const getFleetPriceId = (
  tier: FleetTier,
  period: BillingPeriod,
): string | undefined => {
  if (tier === 'enterprise') {
    // Enterprise is custom pricing, no fixed price ID
    return undefined;
  }
  const key =
    `FLEET_${tier.toUpperCase()}_${period.toUpperCase()}` as keyof typeof STRIPE_PRICE_IDS;
  return STRIPE_PRICE_IDS[key];
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a price ID is for a one-time purchase
 */
export const isOneTimePrice = (priceId: string): boolean =>
  Object.values({
    ONE_TIME_STANDARD: STRIPE_PRICE_IDS.ONE_TIME_STANDARD,
    ONE_TIME_PREMIUM: STRIPE_PRICE_IDS.ONE_TIME_PREMIUM,
  }).includes(priceId);

/**
 * Check if a price ID is for a consumer subscription
 */
export const isConsumerSubscriptionPrice = (priceId: string): boolean =>
  Object.values({
    SUBSCRIPTION_STANDARD_MONTHLY:
      STRIPE_PRICE_IDS.SUBSCRIPTION_STANDARD_MONTHLY,
    SUBSCRIPTION_STANDARD_YEARLY: STRIPE_PRICE_IDS.SUBSCRIPTION_STANDARD_YEARLY,
    SUBSCRIPTION_PREMIUM_MONTHLY: STRIPE_PRICE_IDS.SUBSCRIPTION_PREMIUM_MONTHLY,
    SUBSCRIPTION_PREMIUM_YEARLY: STRIPE_PRICE_IDS.SUBSCRIPTION_PREMIUM_YEARLY,
  }).includes(priceId);

/**
 * Get subscription tier (STANDARD or PREMIUM) from a Stripe price ID
 */
export const getSubscriptionTierFromPriceId = (priceId: string): 'STANDARD' | 'PREMIUM' | null => {
  // Check STANDARD prices
  if (
    priceId === STRIPE_PRICE_IDS.SUBSCRIPTION_STANDARD_MONTHLY ||
    priceId === STRIPE_PRICE_IDS.SUBSCRIPTION_STANDARD_YEARLY
  ) {
    return 'STANDARD';
  }

  // Check PREMIUM prices
  if (
    priceId === STRIPE_PRICE_IDS.SUBSCRIPTION_PREMIUM_MONTHLY ||
    priceId === STRIPE_PRICE_IDS.SUBSCRIPTION_PREMIUM_YEARLY
  ) {
    return 'PREMIUM';
  }

  return null;
};

/**
 * Check if a price ID is for a fleet/business plan
 */
export const isFleetPrice = (priceId: string): boolean =>
  Object.values({
    FLEET_STARTER_MONTHLY: STRIPE_PRICE_IDS.FLEET_STARTER_MONTHLY,
    FLEET_STARTER_YEARLY: STRIPE_PRICE_IDS.FLEET_STARTER_YEARLY,
    FLEET_PRO_MONTHLY: STRIPE_PRICE_IDS.FLEET_PRO_MONTHLY,
    FLEET_PRO_YEARLY: STRIPE_PRICE_IDS.FLEET_PRO_YEARLY,
  }).includes(priceId);

// ============================================================================
// Legacy Helper Functions (DEPRECATED)
// ============================================================================

/**
 * @deprecated Use getOneTimePriceId instead
 */
export const getTierPriceId = (
  tier: Omit<TicketTier, 'FREE'>,
): string | undefined =>
  STRIPE_PRICE_IDS[`TIER_${tier}` as keyof typeof STRIPE_PRICE_IDS];

/**
 * @deprecated Use getConsumerSubscriptionPriceId instead
 */
export const getSubscriptionPriceId = (
  type: SubscriptionType,
): string | undefined =>
  STRIPE_PRICE_IDS[
    `SUBSCRIPTION_${type.toUpperCase()}` as keyof typeof STRIPE_PRICE_IDS
  ];

/**
 * @deprecated Use isOneTimePrice instead
 */
export const isTierUpgradePrice = (priceId: string): boolean =>
  Object.values({
    TIER_STANDARD: STRIPE_PRICE_IDS.TIER_STANDARD,
    TIER_PREMIUM: STRIPE_PRICE_IDS.TIER_PREMIUM,
  }).includes(priceId);

/**
 * @deprecated Use isConsumerSubscriptionPrice instead
 */
export const isSubscriptionPrice = (priceId: string): boolean =>
  Object.values({
    SUBSCRIPTION_MONTHLY: STRIPE_PRICE_IDS.SUBSCRIPTION_MONTHLY,
    SUBSCRIPTION_ANNUAL: STRIPE_PRICE_IDS.SUBSCRIPTION_ANNUAL,
  }).includes(priceId);
