'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  getPendingPricingAction,
  clearPendingPricingAction,
} from '@/utils/pendingPricingAction';

/**
 * Component that checks for pending pricing actions after authentication
 * and redirects the user to the appropriate page.
 *
 * Should be included in the root layout to work across all OAuth redirects.
 */
const PendingActionHandler = () => {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Only process pending actions when user becomes authenticated
    if (status !== 'authenticated') return;

    const pendingAction = getPendingPricingAction();
    if (!pendingAction) return;

    // Clear the action immediately to prevent double-processing
    clearPendingPricingAction();

    // Redirect based on action type
    if (pendingAction.type === 'one-time') {
      // Redirect to create ticket page with tier info
      const params = new URLSearchParams({
        tier: pendingAction.tier,
        source: pendingAction.source,
      });
      router.push(`/new?${params.toString()}`);
    } else if (pendingAction.type === 'subscription') {
      // Redirect to billing page with plan info
      const plan = `${pendingAction.tier}-${pendingAction.period}`;
      router.push(`/account/billing?plan=${plan}`);
    }
  }, [status, router]);

  // This component doesn't render anything
  return null;
};

export default PendingActionHandler;
