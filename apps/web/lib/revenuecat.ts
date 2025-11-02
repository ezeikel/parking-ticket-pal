/**
 * RevenueCat REST API Client
 * Used for server-side verification of purchases and subscription management
 */

const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1';

interface RevenueCatSubscriber {
  original_app_user_id: string;
  subscriptions: Record<string, {
    expires_date: string | null;
    purchase_date: string;
    original_purchase_date: string;
    store: 'app_store' | 'play_store';
    is_sandbox: boolean;
    unsubscribe_detected_at: string | null;
    billing_issues_detected_at: string | null;
    grace_period_expires_date: string | null;
    refunded_at: string | null;
    auto_resume_date: string | null;
    ownership_type: 'PURCHASED' | 'FAMILY_SHARED';
  }>;
  entitlements: Record<string, {
    expires_date: string | null;
    product_identifier: string;
    purchase_date: string;
  }>;
  non_subscriptions: Record<string, Array<{
    id: string;
    purchase_date: string;
    store: 'app_store' | 'play_store';
    is_sandbox: boolean;
  }>>;
}

interface RevenueCatResponse {
  subscriber: RevenueCatSubscriber;
}

/**
 * Get subscriber information from RevenueCat
 */
export async function getSubscriber(appUserId: string): Promise<RevenueCatSubscriber | null> {
  const apiKey = process.env.REVENUECAT_API_KEY;

  if (!apiKey) {
    console.error('REVENUECAT_API_KEY not set');
    return null;
  }

  try {
    const response = await fetch(
      `${REVENUECAT_API_BASE}/subscribers/${appUserId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Platform': 'ios', // or 'android' - doesn't matter for GET requests
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Subscriber not found in RevenueCat yet
        return null;
      }
      throw new Error(`RevenueCat API error: ${response.status} ${response.statusText}`);
    }

    const data: RevenueCatResponse = await response.json();
    return data.subscriber;
  } catch (error) {
    console.error('Error fetching subscriber from RevenueCat:', error);
    return null;
  }
}

/**
 * Check if a user has an active subscription via RevenueCat
 */
export async function hasActiveSubscription(appUserId: string): Promise<boolean> {
  const subscriber = await getSubscriber(appUserId);

  if (!subscriber) {
    return false;
  }

  // Check if any entitlement is active (not expired)
  const hasActiveEntitlement = Object.values(subscriber.entitlements).some((entitlement) => {
    if (!entitlement.expires_date) {
      // Lifetime entitlement
      return true;
    }

    const expiresAt = new Date(entitlement.expires_date);
    // Not expired yet
    return expiresAt > new Date();
  });

  return hasActiveEntitlement;
}

/**
 * Get the subscription type (STANDARD or PREMIUM) from RevenueCat entitlements
 */
export async function getSubscriptionType(appUserId: string): Promise<'STANDARD' | 'PREMIUM' | null> {
  const subscriber = await getSubscriber(appUserId);

  if (!subscriber) {
    return null;
  }

  // Check for premium entitlement first (higher tier)
  if (subscriber.entitlements.premium_access) {
    const entitlement = subscriber.entitlements.premium_access;
    if (!entitlement.expires_date || new Date(entitlement.expires_date) > new Date()) {
      return 'PREMIUM';
    }
  }

  // Check for standard entitlement
  if (subscriber.entitlements.standard_access) {
    const entitlement = subscriber.entitlements.standard_access;
    if (!entitlement.expires_date || new Date(entitlement.expires_date) > new Date()) {
      return 'STANDARD';
    }
  }

  return null;
}

/**
 * Verify a purchase receipt/transaction
 * Used to confirm a purchase before updating ticket tiers
 */
export async function verifyPurchase(
  appUserId: string,
  productId: string
): Promise<boolean> {
  const subscriber = await getSubscriber(appUserId);

  if (!subscriber) {
    return false;
  }

  // Check non-subscription purchases (consumables)
  if (subscriber.non_subscriptions[productId]) {
    return subscriber.non_subscriptions[productId].length > 0;
  }

  // Check subscription purchases
  if (subscriber.subscriptions[productId]) {
    return true;
  }

  return false;
}

/**
 * Get all non-subscription purchases for a user
 * Returns consumable purchases like ticket upgrades
 */
export async function getConsumablePurchases(
  appUserId: string
): Promise<Array<{ productId: string; purchaseDate: string; id: string }>> {
  const subscriber = await getSubscriber(appUserId);

  if (!subscriber) {
    return [];
  }

  const purchases = Object.entries(subscriber.non_subscriptions).flatMap(([productId, transactions]) =>
    transactions.map((transaction) => ({
      productId,
      purchaseDate: transaction.purchase_date,
      id: transaction.id,
    }))
  );

  return purchases.sort((a, b) =>
    new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
  );
}
