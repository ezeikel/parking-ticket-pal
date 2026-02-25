'use client';

import { useEffect, useRef } from 'react';
import { trackPurchase } from '@/lib/facebook-pixel';

type PurchaseTrackerProps = {
  value: number;
  currency?: string;
  contentName?: string;
};

// eslint-disable-next-line import-x/prefer-default-export
export function PurchaseTracker({
  value,
  currency = 'GBP',
  contentName = 'premium_ticket',
}: PurchaseTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current) {
      trackPurchase({
        value,
        currency,
        content_name: contentName,
      });
      hasTracked.current = true;
    }
  }, [value, currency, contentName]);

  return null;
}
