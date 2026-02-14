'use client';

import Link from 'next/link';
import { createCheckoutSession } from '@/app/actions/stripe';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAccountContext } from '@/contexts/account';
import { ProductType } from '@parking-ticket-pal/db/types';
import { logger } from '@/lib/logger';

const FundAccountDialog = () => {
  const { isFundAccountDialogOpen, setIsFundAccountDialogOpen } =
    useAccountContext();

  const handleClick = async (productType: ProductType) => {
    // call backend to create checkout session
    const session = await createCheckoutSession(productType);

    if (!session) {
      logger.error('Error creating checkout session', { page: 'fund-account' });
      return;
    }

    // redirect to Stripe checkout using session URL
    if (session.url) {
      window.location.href = session.url;
    }
  };

  return (
    <Dialog
      open={isFundAccountDialogOpen}
      onOpenChange={setIsFundAccountDialogOpen}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-sans">
            Pay per ticket or Get a Pro Subscription
          </DialogTitle>
          <DialogDescription>
            This feature requires a Pro subscription. Please select one of the
            following options to proceed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              handleClick(ProductType.PAY_PER_TICKET);
            }}
          >
            Pay per ticket
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              handleClick(ProductType.PRO_MONTHLY);
            }}
          >
            Subscribe to Pro Monthly
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              handleClick(ProductType.PRO_ANNUAL);
            }}
          >
            Subscribe to Pro Annual
          </Button>
        </div>
        <div className="py-2 text-sm text-gray-500 dark:text-gray-400">
          For more information about our different plans and pricing, please
          visit our&nbsp;
          <Link className="text-blue-600 underline" href="/billing">
            billing page
          </Link>
          .
        </div>
        <DialogFooter>
          <Button className="ml-auto">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FundAccountDialog;
