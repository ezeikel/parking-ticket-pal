'use client';

import { createCustomerPortalSession } from '@/app/actions';
import { Button, buttonVariants } from '@/components/ui/button';
import { type ButtonHTMLAttributes } from 'react';
import { type VariantProps } from 'class-variance-authority';

const ManageSubscriptionButton = (
  props: ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants>,
) => {
  const handleManageSubscriptionClick = async () => {
    try {
      // call backend to create portal session
      const session = await createCustomerPortalSession();

      if (!session) {
        console.error('Error creating customer portal session');
        return;
      }

      const { url } = session;

      window.location.href = url;
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Button
      onClick={handleManageSubscriptionClick}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      Manage subscription
    </Button>
  );
};

export default ManageSubscriptionButton;
