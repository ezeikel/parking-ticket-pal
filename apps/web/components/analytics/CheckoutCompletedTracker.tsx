'use client';

import { useEffect, useRef } from 'react';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

// eslint-disable-next-line import-x/prefer-default-export
export function CheckoutCompletedTracker() {
  const { track } = useAnalytics();
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current) {
      track(TRACKING_EVENTS.CHECKOUT_COMPLETED, {
        product_type: 'pay_per_ticket',
        tier: 'premium',
      });
      hasTracked.current = true;
    }
  }, [track]);

  return null;
}
