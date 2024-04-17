'use client';

import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from '@/app/actions';
import { Button, ButtonProps } from '@/components/ui/button';
import cn from '@/utils/cn';

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

type SubscribeButtonProps = ButtonProps & {
  text?: string;
  className?: string;
};

const SubscribeButton = ({
  text,
  className,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ...props
}: SubscribeButtonProps) => {
  const handleSubscribeClick = async () => {
    // get stripe.js instance
    const stripe = await stripePromise;

    if (!stripe) return;

    // call backend to create checkout session
    const session = await createCheckoutSession();

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
      onClick={handleSubscribeClick}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      {text || 'Subscribe'}
    </Button>
  );
};

export default SubscribeButton;
