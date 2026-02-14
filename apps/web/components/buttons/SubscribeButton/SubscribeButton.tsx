'use client';

import { createCheckoutSession } from '@/app/actions/stripe';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';
import { ProductType } from '@parking-ticket-pal/db/types';
import { logger } from '@/lib/logger';

type SubscribeButtonProps = {
  productType: ProductType;
  className?: string;
};

const SubscribeButton = ({ className, productType }: SubscribeButtonProps) => {
  const handleSubscribe = async () => {
    // call backend to create checkout session
    const session = await createCheckoutSession(productType);

    if (!session) {
      logger.error('Error creating checkout session', {
        page: 'subscribe-button',
      });
      return;
    }

    // redirect to Stripe checkout using session URL
    if (session.url) {
      window.location.href = session.url;
    }
  };

  return (
    <Button
      className={cn({
        [className as string]: !!className,
      })}
      onClick={handleSubscribe}
      size="lg"
    >
      Subscribe Now
    </Button>
  );
};

export default SubscribeButton;
