'use client';

import { createCustomerPortalSession } from '@/app/actions';
import { Button, ButtonProps } from '@/components/ui/button';

const ManageSubscriptionButton = (props: ButtonProps) => {
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
