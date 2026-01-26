'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSubscriptionCheckoutSession } from '@/app/actions/stripe';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/pro-regular-svg-icons';
import useLogger from '@/lib/use-logger';

const SubscribeContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const logger = useLogger({ page: 'subscribe' });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initiateCheckout = async () => {
      try {
        // Get plan parameter from URL
        // Expected formats: "standard-monthly", "standard-yearly", "premium-monthly", "premium-yearly"
        const plan = searchParams.get('plan');

        // Validate plan parameter
        if (!plan) {
          logger.warn('Subscribe page accessed without plan parameter');
          setError('Missing subscription plan. Please select a plan first.');
          setIsLoading(false);
          return;
        }

        // Parse plan into tier and period
        const parts = plan.split('-');
        if (parts.length !== 2) {
          logger.warn('Invalid subscription plan format', { plan });
          setError('Invalid subscription plan format.');
          setIsLoading(false);
          return;
        }

        const [tier, period] = parts;

        // Validate tier
        if (tier !== 'standard' && tier !== 'premium') {
          logger.warn('Invalid subscription tier', { tier, plan });
          setError(
            'Invalid subscription tier. Please choose Standard or Premium.',
          );
          setIsLoading(false);
          return;
        }

        // Validate period
        if (period !== 'monthly' && period !== 'yearly') {
          logger.warn('Invalid billing period', { period, plan });
          setError('Invalid billing period. Please choose monthly or yearly.');
          setIsLoading(false);
          return;
        }

        // Create Stripe checkout session for subscription
        const session = await createSubscriptionCheckoutSession(
          tier as 'standard' | 'premium',
          period as 'monthly' | 'yearly',
        );

        if (!session?.url) {
          logger.error(
            'Subscription checkout session created but no URL returned',
            {
              tier,
              period,
            },
          );
          setError(
            'Unable to create subscription checkout. Please try again or contact support.',
          );
          setIsLoading(false);
          return;
        }

        // Redirect to Stripe checkout
        window.location.href = session.url;
      } catch (err) {
        logger.error(
          'Subscription checkout error',
          {
            plan: searchParams.get('plan'),
          },
          err instanceof Error ? err : undefined,
        );
        setError(
          'An unexpected error occurred. Please try again or contact support.',
        );
        setIsLoading(false);
      }
    };

    initiateCheckout();
  }, [searchParams, logger]);

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="font-slab text-center">
              {isLoading ? 'Preparing Subscription...' : 'Checkout Error'}
            </CardTitle>
            <CardDescription className="text-center">
              {isLoading
                ? 'Please wait while we redirect you to secure payment.'
                : 'We encountered an issue.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="h-12 w-12 text-primary animate-spin"
                />
                <p className="text-sm text-muted-foreground text-center">
                  Redirecting to Stripe...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push('/pricing')}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                  >
                    Back to Pricing
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Go Home
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const SubscribePage = () => (
  <Suspense
    fallback={
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="font-slab text-center">
                Loading...
              </CardTitle>
              <CardDescription className="text-center">
                Please wait
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 py-8">
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="h-12 w-12 text-primary animate-spin"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }
  >
    <SubscribeContent />
  </Suspense>
);

export default SubscribePage;
