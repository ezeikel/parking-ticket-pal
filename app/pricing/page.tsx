'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/pro-regular-svg-icons';
import cn from '@/utils/cn';
import { createCheckoutSession } from '@/app/actions/stripe';

// make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

type PlanInterval = 'monthly' | 'annual';
type ProductType = 'PRO_MONTHLY' | 'PRO_ANNUAL';

const intervalLabels: Record<PlanInterval, string> = {
  monthly: 'Monthly',
  annual: 'Annual (save 20%)',
};

const SUBSCRIPTION_PLANS = {
  monthly: [
    {
      name: 'Free',
      tagline: 'Basic features for occasional users',
      price: '£0',
      credits: '5',
      audience: 'For occasional users',
      features: [
        'Store up to 5 tickets',
        'Basic appeal templates',
        'Email notifications',
      ],
      mostPopular: false,
      bonus: '',
    },
    {
      name: 'Pro',
      tagline: 'Advanced features for regular users',
      price: '£4.99',
      credits: 'unlimited',
      audience: 'For regular users',
      features: [
        'Unlimited tickets storage',
        'Premium appeal templates',
        'SMS reminders and notifications',
        'Fast-track support',
        'Analytics dashboard',
      ],
      mostPopular: true,
      bonus: '',
      stripePriceEnv: 'PRO_MONTHLY' as ProductType,
    },
  ],
  annual: [
    {
      name: 'Free',
      tagline: 'Basic features for occasional users',
      price: '£0',
      credits: '5',
      audience: 'For occasional users',
      features: [
        'Store up to 5 tickets',
        'Basic appeal templates',
        'Email notifications',
      ],
      mostPopular: false,
      bonus: '',
    },
    {
      name: 'Pro',
      tagline: 'Advanced features for regular users',
      price: '£47.88',
      credits: 'unlimited',
      audience: 'For regular users',
      features: [
        'Unlimited tickets storage',
        'Premium appeal templates',
        'SMS reminders and notifications',
        'Fast-track support',
        'Analytics dashboard',
        'Early access to new features',
      ],
      mostPopular: true,
      bonus: 'Save 20% with annual billing',
      stripePriceEnv: 'PRO_ANNUAL' as ProductType,
    },
  ],
};

type Plan = (typeof SUBSCRIPTION_PLANS.monthly)[0];

const PricingPage = () => {
  const [interval, setInterval] = useState<PlanInterval>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const plans = SUBSCRIPTION_PLANS[interval];

  const handlePurchase = async (plan: Plan) => {
    if (!plan.stripePriceEnv) return; // Free plan

    setLoadingPlan(plan.name);
    try {
      // get stripe.js instance
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const session = await createCheckoutSession(plan.stripePriceEnv);

      if (!session) {
        throw new Error('Failed to create checkout session');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (error) {
        console.error('Stripe redirect error:', error);
        // TODO: show error to user (toast, etc.)
      }
    } catch (error) {
      console.error('Error purchasing plan:', error);
      // TODO: show error to user (toast, etc.)
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <header className="text-center mb-16">
        <h1 className="font-slab text-4xl font-extrabold mb-2 text-primary">
          Choose Your Parking Ticket Pal Plan
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Whether you're dealing with occasional parking tickets or need
          comprehensive support, we've got a plan that fits your needs. Start
          managing your parking tickets with confidence today!
        </p>
        <div className="flex justify-center items-center gap-4 mt-6">
          {(['monthly', 'annual'] as PlanInterval[]).map((key) => (
            <button
              key={key}
              type="button"
              className={cn(
                'px-4 py-2 rounded-full font-semibold transition',
                interval === key
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'bg-primary/10 text-primary hover:bg-primary/20',
              )}
              onClick={() => setInterval(key)}
              aria-pressed={interval === key}
            >
              {intervalLabels[key]}
            </button>
          ))}
        </div>
      </header>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              'flex flex-col h-full border-2 transition-shadow',
              plan.mostPopular
                ? 'border-primary shadow-lg scale-105 relative z-10'
                : 'border-border',
            )}
          >
            {plan.mostPopular && (
              <Badge className="absolute -top-4 right-1/2 translate-x-1/2 bg-primary text-primary-foreground">
                Most Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="flex flex-col gap-1">
                <span className="text-center mb-4">
                  <span className="font-slab">{plan.name}</span>
                </span>
                <span className="text-base font-normal text-muted-foreground">
                  {plan.tagline}
                </span>
              </CardTitle>
              <CardDescription className="mt-2 text-lg font-bold text-primary">
                {plan.price}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  /{interval === 'monthly' ? 'mo' : 'year'}
                </span>
              </CardDescription>
              <div className="text-sm text-muted-foreground mt-1">
                {plan.credits === 'unlimited' ? 'Unlimited' : plan.credits}{' '}
                tickets
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {plan.audience}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-2">
              <ul className="mb-2 space-y-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={faCheck}
                      className="h-4 w-4 text-green-500"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {plan.bonus && (
                <div className="text-xs text-primary font-semibold mt-2">
                  {plan.bonus}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                className="w-full text-lg py-2"
                variant={plan.mostPopular ? 'default' : 'outline'}
                onClick={() => handlePurchase(plan)}
                disabled={loadingPlan === plan.name || !plan.stripePriceEnv}
              >
                {plan.stripePriceEnv ? 'Subscribe Now' : 'Current Plan'}
              </Button>
              <span className="text-xs text-muted-foreground">
                {plan.stripePriceEnv ? 'No commitment. Cancel anytime.' : ''}
              </span>
            </CardFooter>
          </Card>
        ))}
      </section>
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="font-slab text-2xl font-bold mb-4 text-center">
          Frequently Asked Questions
        </h2>
        <ul className="space-y-4 text-sm text-muted-foreground">
          <li>
            <strong>Can I cancel anytime?</strong> Yes! You can cancel your
            subscription at any time, no questions asked.
          </li>
          <li>
            <strong>What happens to my tickets if I downgrade?</strong> Your
            existing tickets will remain accessible, but you won't be able to
            add new ones if you exceed the free plan limit.
          </li>
          <li>
            <strong>Do I need a subscription to use the app?</strong> No! You
            can start with our free plan and upgrade anytime you need more
            features.
          </li>
          <li>
            <strong>How do I get started?</strong> Just pick a plan and start
            managing your parking tickets instantly!
          </li>
        </ul>
      </section>
    </div>
  );
};

export default PricingPage;
