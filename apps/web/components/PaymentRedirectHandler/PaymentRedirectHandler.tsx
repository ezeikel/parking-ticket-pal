'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

type PaymentRedirectHandlerProps = {
  ticketId: string;
};

const PaymentRedirectHandler = ({ ticketId }: PaymentRedirectHandlerProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');

  useEffect(() => {
    if (success === 'true') {
      setTimeout(() => {
        toast.success('🎉 Payment successful!', {
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
  }, [success, cancelled, ticketId, router]);

  return null;
};

export default PaymentRedirectHandler;
