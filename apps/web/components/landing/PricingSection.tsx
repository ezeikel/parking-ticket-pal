'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faArrowRight } from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type PricingTier = {
  name: string;
  price: string;
  yearlyPrice?: string;
  period?: string;
  subtitle: string;
  features: string[];
  cta: string;
  ctaVariant: 'default' | 'outline';
  ctaHref: string;
  note: string;
  popular?: boolean;
};

const oneTimeTiers: PricingTier[] = [
  {
    name: 'Ticket Standard',
    price: '£2.99',
    subtitle: 'Track & Manage',
    features: [
      'Success prediction score',
      'Email & SMS reminders',
      'Timeline tracking',
      'Document storage',
      'Deadline alerts',
    ],
    cta: 'Get Standard',
    ctaVariant: 'outline',
    ctaHref: '/pricing',
    note: 'One-time payment per ticket',
  },
  {
    name: 'Ticket Premium',
    price: '£9.99',
    subtitle: 'Full Challenge Package',
    features: [
      'Everything in Standard',
      'AI-generated challenge letter',
      'Success prediction score',
      'Auto-submission to council',
      'PDF download & email delivery',
    ],
    cta: 'Get Premium',
    ctaVariant: 'default',
    ctaHref: '/pricing',
    note: 'One-time payment per ticket',
    popular: true,
  },
];

const subscriptionTiers: PricingTier[] = [
  {
    name: 'Standard',
    price: '£6.99',
    yearlyPrice: '£69.99',
    period: '/month',
    subtitle: 'Up to 5 tickets/month',
    features: [
      'Reminders & tracking',
      'Document storage',
      'Success score unlock',
      'Deadline alerts',
    ],
    cta: 'Subscribe Standard',
    ctaVariant: 'outline',
    ctaHref: '/pricing',
    note: 'Cancel anytime',
  },
  {
    name: 'Premium',
    price: '£14.99',
    yearlyPrice: '£149.99',
    period: '/month',
    subtitle: 'Up to 10 tickets/month',
    features: [
      'Everything in Standard',
      'AI appeal generation',
      'Auto-submission',
      'Priority support',
      'Full stage escalation',
    ],
    cta: 'Subscribe Premium',
    ctaVariant: 'default',
    ctaHref: '/pricing',
    note: 'Save 17% with yearly',
    popular: true,
  },
];

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const PricingSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const tiers = [...oneTimeTiers, ...subscriptionTiers];

  return (
    <section id="pricing" ref={ref} className="bg-light py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl font-bold text-dark md:text-4xl">
            Simple, Pay-Per-Ticket Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray">
            No subscriptions. No hidden fees. Only pay when we can help.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              variants={fadeUpVariants}
              transition={{ delay: index * 0.15 }}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 },
              }}
              className={`relative flex flex-col rounded-2xl bg-white p-8 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)] ${
                tier.popular ? 'ring-2 ring-dark' : ''
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-dark px-4 py-1 text-sm font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Tier Header */}
              <div className="text-center">
                <h3 className="text-lg font-bold text-dark">{tier.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-dark">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="ml-1 text-gray">{tier.period}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray">{tier.subtitle}</p>
              </div>

              {/* Features */}
              <ul className="mt-8 flex-1 space-y-4">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <FontAwesomeIcon
                      icon={faCheck}
                      className="mt-0.5 text-sm text-dark"
                    />
                    <span className="text-sm text-dark">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-8">
                <Button
                  variant={tier.ctaVariant}
                  className={`h-12 w-full text-base font-semibold ${
                    tier.ctaVariant === 'default'
                      ? 'bg-teal text-white hover:bg-teal-dark'
                      : 'border-dark bg-transparent text-dark hover:bg-light'
                  }`}
                  asChild
                >
                  <Link href={tier.ctaHref}>{tier.cta}</Link>
                </Button>
                <p className="mt-3 text-center text-xs text-gray">
                  {tier.note}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Business CTA */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <a
            href="mailto:hello@parkingticketpal.co.uk?subject=Business%20Pricing"
            className="inline-flex items-center gap-2 text-sm font-medium text-dark hover:underline"
          >
            Have a fleet? Contact us for business pricing
            <FontAwesomeIcon icon={faArrowRight} />
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
