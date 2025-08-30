'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/pro-regular-svg-icons';
import cn from '@/utils/cn';

const PRICING_TIERS = [
  {
    name: 'Free',
    tagline: 'Track your tickets, no charge',
    price: '£0',
    description:
      'Great for anyone wanting to stay informed without actioning anything yet.',
    features: [
      'Add unlimited tickets',
      'See key fine deadlines',
      'Manage notes and uploads',
    ],
    disabled: true,
    cta: 'Included with every account',
    href: '',
  },
  {
    name: 'Standard',
    tagline: 'Get reminders before you pay too much',
    price: '£2.99',
    description: 'SMS + email reminders so you don’t miss deadlines.',
    features: ['All Free features', 'SMS + email reminders'],
    disabled: false,
    cta: 'Sign up to get reminders',
    href: '/sign-up?utm_source=pricing_basic',
  },
  {
    name: 'Premium',
    tagline: 'Challenge your ticket the smart way',
    price: '£9.99',
    description:
      'Everything included: appeal letter, success score, auto-submit.',
    features: [
      'All Standard features',
      'AI appeal letter',
      'Success prediction',
      'Automatic appeal submission',
    ],
    disabled: false,
    cta: 'Sign up for full help',
    href: '/sign-up?utm_source=pricing_pro',
  },
];

const PricingPage = () => (
  <div className="max-w-5xl mx-auto py-12 px-4">
    <header className="text-center mb-16">
      <h1 className="font-slab text-4xl font-extrabold mb-2 text-primary">
        Simple, One-Time Pricing
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        No subscriptions. No hidden fees. Just pay when you want help with a
        parking ticket.
      </p>
    </header>
    <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {PRICING_TIERS.map((plan) => (
        <Card
          key={plan.name}
          className={cn(
            'flex flex-col h-full border-2 transition-shadow',
            plan.disabled ? 'border-muted' : 'border-border',
          )}
        >
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
              {plan.price}
            </CardDescription>
            <div className="text-xs text-muted-foreground mt-1">
              {plan.description}
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
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            {plan.disabled ? (
              <Button
                className="w-full text-lg py-2"
                variant="outline"
                disabled
              >
                {plan.cta}
              </Button>
            ) : (
              <Button className="w-full text-lg py-2" asChild>
                <a href={plan.href}>{plan.cta}</a>
              </Button>
            )}
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
          <strong>Do I need a subscription?</strong> No — you pay only when you
          want help with a specific ticket.
        </li>
        <li>
          <strong>Can I use it for free?</strong> Yes — you can add and view
          tickets without paying anything.
        </li>
        <li>
          <strong>What’s the difference between Standard and Premium?</strong>
          Standard sends reminders. Premium writes your letter and even submits
          it.
        </li>
        <li>
          <strong>How do I get started?</strong> Just sign up and add your first
          ticket. You’ll only pay if you want help with it.
        </li>
      </ul>
    </section>
  </div>
);

export default PricingPage;
