/**
 * Utility for managing pending pricing actions in sessionStorage.
 * Used to preserve user intent across OAuth redirects.
 *
 * TODO: Test with magic link authentication. SessionStorage is tab-scoped,
 * so clicking a magic link in email (which opens a new tab) won't have access
 * to the pending action from the original tab. Consider switching to localStorage
 * if magic links are a primary auth method, but be aware of cross-tab pollution risks.
 */

import { createClientLogger } from '@/lib/logger';

const STORAGE_KEY = 'pending_pricing_action';
const EXPIRY_MINUTES = 15; // Action expires after 15 minutes

export type PricingActionType = 'one-time';

export type PendingPricingAction = {
  type: PricingActionType;
  tier: 'premium';
  source: string;
  timestamp: number;
};

/**
 * Store a pending pricing action in sessionStorage
 */
export const setPendingPricingAction = (
  action: Omit<PendingPricingAction, 'timestamp'>,
): void => {
  if (typeof window === 'undefined') return;

  const actionWithTimestamp: PendingPricingAction = {
    ...action,
    timestamp: Date.now(),
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(actionWithTimestamp));
  } catch (error) {
    const logger = createClientLogger(undefined, {
      action: 'pricing_action_storage',
    });
    logger.error(
      'Failed to store pending pricing action',
      {
        tier: action.tier,
        type: action.type,
        source: action.source,
      },
      error instanceof Error ? error : undefined,
    );
  }
};

/**
 * Clear the pending pricing action from sessionStorage
 */
export const clearPendingPricingAction = (): void => {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    const logger = createClientLogger(undefined, {
      action: 'pricing_action_storage',
    });
    logger.error(
      'Failed to clear pending pricing action',
      {},
      error instanceof Error ? error : undefined,
    );
  }
};

/**
 * Retrieve and remove a pending pricing action from sessionStorage
 * Returns null if no action exists or if action has expired
 */
export const getPendingPricingAction = (): PendingPricingAction | null => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const action: PendingPricingAction = JSON.parse(stored);

    // Check if action has expired
    const expiryTime = action.timestamp + EXPIRY_MINUTES * 60 * 1000;
    if (Date.now() > expiryTime) {
      clearPendingPricingAction();
      return null;
    }

    return action;
  } catch (error) {
    const logger = createClientLogger(undefined, {
      action: 'pricing_action_storage',
    });
    logger.error(
      'Failed to retrieve pending pricing action',
      {},
      error instanceof Error ? error : undefined,
    );
    return null;
  }
};

/**
 * Check if a pending pricing action exists (without removing it)
 */
export const hasPendingPricingAction = (): boolean =>
  getPendingPricingAction() !== null;
