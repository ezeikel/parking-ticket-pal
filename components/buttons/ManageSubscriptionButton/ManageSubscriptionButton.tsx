'use client';

import { createCustomerPortalSession } from '@/app/actions';
import { Button } from '@/components/ui/button';

const ManageSubscriptionButton = () => {
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
      title="Manage subscription"
      onClick={handleManageSubscriptionClick}
    />
  );
};

export default ManageSubscriptionButton;
