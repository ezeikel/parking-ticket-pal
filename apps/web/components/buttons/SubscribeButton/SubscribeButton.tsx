'use client';

import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from '@/app/actions/stripe';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';
import { ProductType } from '@parking-ticket-pal/db/types';

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

type SubscribeButtonProps = {
  productType: ProductType;
  className?: string;
};

const SubscribeButton = ({ className, productType }: SubscribeButtonProps) => {
  const handleSubscribe = async () => {
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
