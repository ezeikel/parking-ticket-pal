'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createSubscriptionCheckoutSession } from '@/app/actions/stripe';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/pro-regular-svg-icons';
import PriceCard from '@/components/pricing/PriceCard';
import BillingToggle from '@/components/pricing/BillingToggle';
import { SUBSCRIPTION_PRICING } from '@/lib/pricing-data';
import useLogger from '@/lib/use-logger';

const BillingPage = () => {
  const searchParams = useSearchParams();
  const logger = useLogger({ page: 'billing' });
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>(
    'monthly',
  );
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle automatic checkout if plan parameter is present
  useEffect(() => {
    const initiateCheckout = async () => {
      const plan = searchParams.get('plan');
      if (!plan) return;

      setIsCheckingOut(true);

      try {
        // Parse plan into tier and period
        const parts = plan.split('-');
        if (parts.length !== 2) {
          logger.warn('Invalid subscription plan format', { plan });
          setError('Invalid subscription plan format.');
          setIsCheckingOut(false);
          return;
        }

        const [tier, period] = parts;

        // Validate tier
        if (tier !== 'standard' && tier !== 'premium') {
          logger.warn('Invalid subscription tier', { tier, plan });
          setError('Invalid subscription tier.');
          setIsCheckingOut(false);
          return;
        }

        // Validate period
        if (period !== 'monthly' && period !== 'yearly') {
          logger.warn('Invalid billing period', { period, plan });
          setError('Invalid billing period.');
          setIsCheckingOut(false);
          return;
        }

        // Set the billing period toggle to match the selected plan
        setBillingPeriod(period as 'monthly' | 'yearly');

        // Create Stripe checkout session
        const session = await createSubscriptionCheckoutSession(
          tier as 'standard' | 'premium',
          period as 'monthly' | 'yearly',
        );

        if (!session?.url) {
          logger.error('Subscription checkout session created but no URL returned', {
            tier,
            period,
          });
          setError(
            'Unable to create subscription checkout. Please try again or contact support.',
          );
          setIsCheckingOut(false);
          return;
        }

        // Redirect to Stripe checkout
        window.location.href = session.url;
      } catch (err) {
        logger.error('Subscription checkout error', {
          plan: searchParams.get('plan'),
        }, err instanceof Error ? err : undefined);
        setError(
          'An unexpected error occurred. Please try again or contact support.',
        );
        setIsCheckingOut(false);
      }
    };

    initiateCheckout();
  }, [searchParams, logger]);

  const currentPlans =
    billingPeriod === 'monthly'
      ? SUBSCRIPTION_PRICING.monthly
      : SUBSCRIPTION_PRICING.yearly;

  if (isCheckingOut) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="font-slab text-center">
                Preparing Subscription...
              </CardTitle>
              <CardDescription className="text-center">
                Please wait while we redirect you to secure payment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 py-8">
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="h-12 w-12 text-primary animate-spin"
                />
                <p className="text-sm text-muted-foreground text-center">
                  Redirecting to Stripe...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="font-slab font-bold text-3xl">Billing & Subscription</h1>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-slab font-bold text-2xl">
            Current Plan
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            You are currently on the Free Plan.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-slab font-bold text-2xl">
            Upgrade Your Plan
          </CardTitle>
          <CardDescription>
            Choose a subscription plan that works for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex justify-center">
            <BillingToggle
              value={billingPeriod}
              onChange={setBillingPeriod}
              tab="subscriptions"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {currentPlans.map((plan) => {
              // Extract plan identifier from href (e.g., "/signin?redirect=/account/billing&plan=standard-monthly" -> "standard-monthly")
              const planParam = plan.href.split('plan=')[1];
              return (
                <PriceCard
                  key={plan.title}
                  {...plan}
                  href={`/account/billing?plan=${planParam}`}
                  planType="subscription"
                  billingPeriod={billingPeriod}
                  location="pricing_page"
                  dataAttrs={{
                    'data-plan': plan.title.toLowerCase(),
                  }}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-slab font-bold text-2xl">
            Payment History
          </CardTitle>
          <CardDescription>
            View your payment history and download invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No payment history available.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingPage;
