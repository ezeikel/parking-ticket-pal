'use client';

import { useEffect, useRef } from 'react';
import { trackPurchase } from '@/lib/facebook-pixel';

type PurchaseTrackerProps = {
  value: number;
  currency?: string;
  contentName?: string;
  eventId?: string;
};

// eslint-disable-next-line import-x/prefer-default-export
export function PurchaseTracker({
  value,
  currency = 'GBP',
  contentName = 'premium_ticket',
  eventId,
}: PurchaseTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current) {
      trackPurchase(
        {
          value,
          currency,
          content_name: contentName,
        },
        eventId,
      );
      hasTracked.current = true;
    }
  }, [value, currency, contentName, eventId]);

  return null;
}
