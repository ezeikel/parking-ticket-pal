/**
 * Unified subscription access logic
 * Handles both Stripe (web) and RevenueCat (mobile) subscriptions
 */

import { User, Subscription, SubscriptionType, SubscriptionSource } from '@parking-ticket-pal/db';

export type UserWithSubscription = User & {
  subscription: Subscription | null;
};

/**
 * Check if a user has an active subscription from any source
 */
export function hasActiveSubscription(user: UserWithSubscription): boolean {
  return user.subscription !== null;
}

/**
 * Get the subscription type (STANDARD or PREMIUM) if active
 */
export function getSubscriptionType(user: UserWithSubscription): SubscriptionType | null {
  if (!user.subscription) {
    return null;
  }

  return user.subscription.type;
}

/**
 * Check if the subscription source is Stripe (web)
 */
export function isStripeSubscription(user: UserWithSubscription): boolean {
  return user.subscription?.source === SubscriptionSource.STRIPE;
}

/**
 * Check if the subscription source is RevenueCat (mobile)
 */
export function isRevenueCatSubscription(user: UserWithSubscription): boolean {
  return user.subscription?.source === SubscriptionSource.REVENUECAT;
}

/**
 * Determine if a user can purchase a mobile IAP subscription
 * Users with active Stripe subscriptions should not be able to purchase mobile subscriptions
 */
export function canPurchaseMobileSubscription(user: UserWithSubscription): boolean {
  // No subscription - can purchase
  if (!user.subscription) {
    return true;
  }

  // Already has RevenueCat subscription - can manage/upgrade via RevenueCat
  if (isRevenueCatSubscription(user)) {
    return true;
  }

  // Has Stripe subscription - should not purchase mobile subscription
  if (isStripeSubscription(user)) {
    return false;
  }

  return true;
}

/**
 * Check if a user has premium-level access
 */
export function hasPremiumAccess(user: UserWithSubscription): boolean {
  return getSubscriptionType(user) === SubscriptionType.PREMIUM;
}

/**
 * Check if a user has at least standard-level access
 */
export function hasStandardAccess(user: UserWithSubscription): boolean {
  const type = getSubscriptionType(user);
  return type === SubscriptionType.STANDARD || type === SubscriptionType.PREMIUM;
}

/**
 * Get a human-readable subscription status message
 */
export function getSubscriptionStatusMessage(user: UserWithSubscription): string {
  if (!user.subscription) {
    return 'No active subscription';
  }

  const typeLabel = user.subscription.type === SubscriptionType.PREMIUM ? 'Premium' : 'Standard';
  const sourceLabel = user.subscription.source === SubscriptionSource.STRIPE ? 'Web' : 'Mobile';

  return `${typeLabel} subscription (${sourceLabel})`;
}

/**
 * Subscription tier limits
 */
export const SUBSCRIPTION_LIMITS = {
  FREE: {
    monthlyTickets: 0,
    features: ['Basic ticket tracking', 'Form generation'],
  },
  STANDARD: {
    monthlyTickets: 5,
    features: [
      'Up to 5 tickets per month',
      'AI-powered predictions',
      'Premium support',
      'All form types',
    ],
  },
  PREMIUM: {
    monthlyTickets: 10,
    features: [
      'Up to 10 tickets per month',
      'Priority AI predictions',
      'Priority support',
      'All form types',
      'Early access to new features',
    ],
  },
} as const;

/**
 * Get the monthly ticket limit for a user
 */
export function getMonthlyTicketLimit(user: UserWithSubscription): number {
  const type = getSubscriptionType(user);

  switch (type) {
    case SubscriptionType.PREMIUM:
      return SUBSCRIPTION_LIMITS.PREMIUM.monthlyTickets;
    case SubscriptionType.STANDARD:
      return SUBSCRIPTION_LIMITS.STANDARD.monthlyTickets;
    default:
      return SUBSCRIPTION_LIMITS.FREE.monthlyTickets;
  }
}

/**
 * Get the features available for a user's subscription level
 */
export function getAvailableFeatures(user: UserWithSubscription): readonly string[] {
  const type = getSubscriptionType(user);

  switch (type) {
    case SubscriptionType.PREMIUM:
      return SUBSCRIPTION_LIMITS.PREMIUM.features;
    case SubscriptionType.STANDARD:
      return SUBSCRIPTION_LIMITS.STANDARD.features;
    default:
      return SUBSCRIPTION_LIMITS.FREE.features;
  }
}
