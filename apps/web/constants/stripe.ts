// Stripe Price ID for Premium per-ticket purchase (£14.99)
export const STRIPE_PRICE_IDS = {
  ONE_TIME_PREMIUM: process.env.NEXT_PUBLIC_STRIPE_PRICE_ONE_TIME_PREMIUM,
} as const;

/**
 * Get Stripe Price ID for Premium ticket purchase
 */
export const getPremiumPriceId = (): string | undefined =>
  STRIPE_PRICE_IDS.ONE_TIME_PREMIUM;

/**
 * Check if a price ID is the Premium one-time price
 */
export const isOneTimePrice = (priceId: string): boolean =>
  priceId === STRIPE_PRICE_IDS.ONE_TIME_PREMIUM;

/**
 * @deprecated Use getPremiumPriceId instead — kept for backward compatibility during migration
 */
export const getTierPriceId = (
  _tier: string | Record<string, unknown>,
): string | undefined => STRIPE_PRICE_IDS.ONE_TIME_PREMIUM;

/**
 * @deprecated Use isOneTimePrice instead
 */
export const isTierUpgradePrice = isOneTimePrice;
