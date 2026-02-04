'use client';

import { useEffect, useRef } from 'react';
import { trackPurchase } from '@/lib/facebook-pixel';

interface PurchaseTrackerProps {
  value: number;
  currency?: string;
  contentName?: string;
}

export function PurchaseTracker({
  value,
  currency = 'GBP',
  contentName = 'subscription',
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
