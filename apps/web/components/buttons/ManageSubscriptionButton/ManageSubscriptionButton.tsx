'use client';

import { createCustomerPortalSession } from '@/app/actions/stripe';
import { Button, buttonVariants } from '@/components/ui/button';
import { type ButtonHTMLAttributes } from 'react';
import { type VariantProps } from 'class-variance-authority';
import { useLogger } from '@/lib/use-logger';

const ManageSubscriptionButton = (
  props: ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants>,
) => {
  const logger = useLogger({ page: 'billing', action: 'manage_subscription' });

  const handleManageSubscriptionClick = async () => {
    try {
      // call backend to create portal session
      const session = await createCustomerPortalSession();

      if (!session) {
        logger.error('Error creating customer portal session');
        return;
      }

      const { url } = session;
      logger.info('Redirecting to customer portal', { url });

      window.location.href = url;
    } catch (error) {
      logger.error('Failed to manage subscription', undefined, error as Error);
    }
  };

  return (
    <Button
      onClick={handleManageSubscriptionClick}
      {...props}
    >
      Manage subscription
    </Button>
  );
};

export default ManageSubscriptionButton;
