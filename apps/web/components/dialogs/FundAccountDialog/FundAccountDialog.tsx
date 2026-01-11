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
import { loadStripe } from '@stripe/stripe-js';
import { ProductType } from '@parking-ticket-pal/db/types';

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

const FundAccountDialog = () => {
  const { isFundAccountDialogOpen, setIsFundAccountDialogOpen } =
    useAccountContext();

  const handleClick = async (productType: ProductType) => {
    // get stripe.js instance
    const stripe = await stripePromise;

    if (!stripe) return;

    // call backend to create checkout session
    const session = await createCheckoutSession(productType);

    if (!session) {
      console.error('Error creating checkout session');
      return;
    }

    const { id } = session;

    // when customer clicks on the button, redirect them to checkout.
    const result = await stripe.redirectToCheckout({
      sessionId: id,
    });

    if (result.error) {
      // If `redirectToCheckout` fails due to a browser or network
      // error, display the localized error message to your customer
      // using `result.error.message`.
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
