'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { trackPurchase } from '@/lib/facebook-pixel';

type PaymentRedirectHandlerProps = {
  ticketId: string;
};

const PaymentRedirectHandler = ({ ticketId }: PaymentRedirectHandlerProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasTrackedPurchase = useRef(false);

  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');
  const purchaseEventId = searchParams.get('purchaseEventId');

  useEffect(() => {
    if (success === 'true') {
      // Fire client-side Purchase pixel (deduplicated with server via eventId)
      if (!hasTrackedPurchase.current) {
        trackPurchase(
          { value: 14.99, currency: 'GBP', content_name: 'premium_ticket' },
          purchaseEventId || undefined,
        );
        hasTrackedPurchase.current = true;
      }

      setTimeout(() => {
        toast.success('Payment successful!', {
          description:
            'Your upgrade has been activated! You now have access to new features.',
          duration: 6000,
        });
      }, 0); // FIX: race condition after returning from stripe checkout
      router.replace(`/tickets/${ticketId}`, { scroll: false });
    } else if (cancelled === 'true') {
      setTimeout(() => {
        toast.info('Payment cancelled', {
          description: 'No charges were made. You can upgrade anytime.',
          duration: 4000,
        });
      }, 0); // FIX: race condition after returning from stripe checkout
      router.replace(`/tickets/${ticketId}`, { scroll: false });
    }
  }, [success, cancelled, ticketId, router, purchaseEventId]);

  return null;
};

export default PaymentRedirectHandler;
