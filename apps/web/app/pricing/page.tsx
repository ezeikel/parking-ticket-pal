'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faXmark,
  faArrowRight,
} from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

type PricingTab = 'one-time' | 'subscriptions' | 'business';

type PricingTier = {
  name: string;
  price: string;
  yearlyPrice?: string;
  originalYearlyPrice?: string;
  period?: string;
  subtitle: string;
  features: string[];
  cta: string;
  href: string;
  popular?: boolean;
};

// One-Time (Per Ticket) Plans
const oneTimeTiers: PricingTier[] = [
  {
    name: 'Standard',
    price: '£2.99',
    period: '/ticket',
    subtitle: 'Track and never miss a deadline',
    features: [
      'Email + SMS reminders',
      'Timeline tracking',
      'Storage for letters and tickets',
      'Deadline notifications',
    ],
    cta: 'Add Ticket & Get Standard',
    href: '/new?tier=standard',
  },
  {
    name: 'Premium',
    price: '£9.99',
    period: '/ticket',
    subtitle: 'Challenge your ticket the smart way',
    features: [
      'Everything in Standard',
      'AI appeal letter generation',
      'Success prediction score',
      'Automatic challenge submission',
      'Priority support',
    ],
    cta: 'Add Ticket & Get Premium',
    href: '/new?tier=premium',
    popular: true,
  },
];

// Subscription Plans
const subscriptionTiers: PricingTier[] = [
  {
    name: 'Standard Plan',
    price: '£6.99',
    yearlyPrice: '£69.99',
    originalYearlyPrice: '£83.88',
    period: '/month',
    subtitle: 'For regular users',
    features: [
      'Up to 5 tickets per month',
      'Email + SMS reminders',
      'Timeline tracking',
      'Storage for letters and tickets',
    ],
    cta: 'Subscribe to Standard',
    href: '/account/billing?plan=standard_monthly',
  },
  {
    name: 'Premium Plan',
    price: '£14.99',
    yearlyPrice: '£149.99',
    originalYearlyPrice: '£179.88',
    period: '/month',
    subtitle: 'Full support every month',
    features: [
      'Up to 10 tickets per month',
      'Everything in Standard',
      'AI appeal letter generation',
      'Success prediction score',
      'Automatic challenge submission',
    ],
    cta: 'Subscribe to Premium',
    href: '/account/billing?plan=premium_monthly',
    popular: true,
  },
];

// Business/Fleet Plans
const businessTiers: PricingTier[] = [
  {
    name: 'Fleet Starter',
    price: '£499',
    yearlyPrice: '£499',
    originalYearlyPrice: '£588',
    period: '/year',
    subtitle: 'Perfect for small businesses',
    features: [
      'Up to 50 tickets per month',
      'Shared dashboard',
      'Bulk upload',
      'Email + SMS reminders',
      '2 staff accounts',
      'Email support',
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@parkticketpal.com?subject=Fleet%20Starter%20Inquiry',
  },
  {
    name: 'Fleet Pro',
    price: '£1,499',
    yearlyPrice: '£1,499',
    originalYearlyPrice: '£1,788',
    period: '/year',
    subtitle: 'For growing fleets',
    features: [
      'Up to 200 tickets per month',
      'All Starter features',
      'API & CSV integration',
      'Team roles & permissions',
      'Priority support',
      'Data export',
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@parkticketpal.com?subject=Fleet%20Pro%20Inquiry',
    popular: true,
  },
  {
    name: 'Fleet Enterprise',
    price: 'Custom',
    period: '',
    subtitle: 'Custom solution for large fleets',
    features: [
      'Unlimited tickets (fair use)',
      'Everything in Pro',
      'SSO & white label',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@parkticketpal.com?subject=Fleet%20Enterprise%20Inquiry',
  },
];

// Compare Plans Data
const compareFeatures = [
  { name: 'Add unlimited tickets', free: true, standard: true, premium: true },
  { name: 'See key deadlines', free: true, standard: true, premium: true },
  { name: 'Manage notes & uploads', free: true, standard: true, premium: true },
  { name: 'Email + SMS reminders', free: false, standard: true, premium: true },
  { name: 'Timeline tracking', free: false, standard: true, premium: true },
  { name: 'Document storage', free: 'Limited', standard: true, premium: true },
  { name: 'AI appeal letter', free: false, standard: false, premium: true },
  { name: 'Success prediction', free: false, standard: true, premium: true },
  { name: 'Auto submission', free: false, standard: false, premium: true },
  { name: 'Priority support', free: false, standard: false, premium: true },
];

// FAQ Data
const faqs = [
  {
    question: 'Do I need a subscription?',
    answer:
      'No — you can pay per ticket if you prefer. Subscriptions are great if you manage multiple tickets regularly and want to save money.',
  },
  {
    question: 'What does "fair use" mean for subscriptions?',
    answer:
      'Our subscriptions have soft caps (5 or 10 tickets/month). If you need more, you can purchase additional tickets at our per-ticket rates.',
  },
  {
    question: 'Can I switch between plans?',
    answer:
      'Yes! You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at the next billing cycle.',
  },
  {
    question: "What's the difference between Standard and Premium?",
    answer:
      'Standard includes reminders and tracking. Premium adds AI-generated appeal letters, success prediction, and automatic submission.',
  },
  {
    question: 'How does Fleet pricing work?',
    answer:
      'Fleet plans are designed for businesses managing multiple vehicles. Contact our sales team to discuss your needs and get a custom quote for Enterprise.',
  },
  {
    question: 'Is there a free tier?',
    answer:
      'Yes! You can add and view tickets for free. You only pay when you want reminders (Standard) or full appeal support (Premium).',
  },
];

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

const PricingPage = () => {
  const { track } = useAnalytics();
  const [activeTab, setActiveTab] = useState<PricingTab>('one-time');
  const [isYearly, setIsYearly] = useState(true);

  // Track page view on mount
  useEffect(() => {
    track(TRACKING_EVENTS.PRICING_PAGE_VIEWED, {});
  }, [track]);

  const tabs = [
    { id: 'one-time' as PricingTab, label: 'One-Time (Per Ticket)' },
    { id: 'subscriptions' as PricingTab, label: 'Subscriptions' },
    { id: 'business' as PricingTab, label: 'Business & Fleet' },
  ];

  const handleTabChange = (newTab: PricingTab) => {
    track(TRACKING_EVENTS.PRICING_TAB_CHANGED, {
      fromTab: activeTab,
      toTab: newTab,
    });
    setActiveTab(newTab);
  };

  const getCurrentTiers = () => {
    switch (activeTab) {
      case 'one-time':
        return oneTimeTiers;
      case 'subscriptions':
        return subscriptionTiers;
      case 'business':
        return businessTiers;
      default:
        return oneTimeTiers;
    }
  };

  const getDisplayPrice = (tier: PricingTier) => {
    if (activeTab === 'one-time') return tier.price;
    if (isYearly && tier.yearlyPrice) return tier.yearlyPrice;
    return tier.price;
  };

  const getDisplayPeriod = (tier: PricingTier) => {
    if (activeTab === 'one-time') return tier.period;
    if (activeTab === 'business') return '/year';
    return isYearly ? '/year' : '/month';
  };

  const getSavingsText = (tier: PricingTier) => {
    if (!isYearly || !tier.originalYearlyPrice || !tier.yearlyPrice)
      return null;
    const original = Number.parseFloat(
      tier.originalYearlyPrice.replace(/[£,]/g, ''),
    );
    const current = Number.parseFloat(tier.yearlyPrice.replace(/[£,]/g, ''));
    const savings = original - current;
    return `Save £${savings.toFixed(2)} per year`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pb-12 pt-8 md:pb-16 md:pt-12">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            className="text-4xl font-bold text-dark md:text-5xl"
          >
            Pricing
          </motion.h1>
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-gray"
          >
            Pay per ticket, subscribe for peace of mind, or talk to us about
            fleets.
          </motion.p>
        </div>
      </section>

      {/* Tab Selector */}
      <section className="pb-8">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="inline-flex rounded-xl border border-border bg-light p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-dark shadow-sm'
                      : 'text-gray hover:text-dark'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Billing Toggle (for subscriptions and fleet) */}
      {(activeTab === 'subscriptions' || activeTab === 'business') && (
        <section className="pb-8">
          <div className="mx-auto max-w-[1280px] px-6">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUpVariants}
              className="flex items-center justify-center gap-4"
            >
              <span
                className={`text-sm font-medium ${!isYearly ? 'text-dark' : 'text-gray'}`}
              >
                Monthly
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
                className="data-[state=checked]:bg-teal data-[state=unchecked]:bg-gray/30"
              />
              <span
                className={`text-sm font-medium ${isYearly ? 'text-dark' : 'text-gray'}`}
              >
                Yearly
              </span>
              {isYearly && (
                <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-medium text-teal">
                  Save up to 16%
                </span>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* Pricing Cards */}
      <section className="pb-16">
        <div className="mx-auto max-w-[1280px] px-6">
          <div
            className={`mx-auto grid gap-6 ${
              activeTab === 'business'
                ? 'max-w-5xl md:grid-cols-3'
                : 'max-w-3xl md:grid-cols-2'
            }`}
          >
            {getCurrentTiers().map((tier, index) => (
              <motion.div
                key={tier.name}
                initial="hidden"
                animate="visible"
                variants={fadeUpVariants}
                transition={{ delay: 0.1 * index }}
                className={`relative flex flex-col rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] md:p-8 ${
                  tier.popular ? 'ring-2 ring-dark' : 'ring-1 ring-border'
                }`}
              >
                {/* Popular Badge */}
                {tier.popular && (
                  <div className="absolute -top-3 left-6">
                    <span className="inline-flex items-center rounded-full bg-dark px-3 py-1 text-xs font-semibold text-white">
                      {activeTab === 'subscriptions'
                        ? 'Best Value'
                        : 'Most Popular'}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-dark">{tier.name}</h3>
                  <p className="mt-1 text-sm text-gray">{tier.subtitle}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-dark">
                      {getDisplayPrice(tier)}
                    </span>
                    {tier.price !== 'Custom' && (
                      <span className="text-gray">
                        {getDisplayPeriod(tier)}
                      </span>
                    )}
                  </div>
                  {isYearly && tier.originalYearlyPrice && (
                    <p className="mt-1 text-sm text-gray line-through">
                      {tier.originalYearlyPrice}/year
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="mb-8 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="mt-0.5 text-sm text-teal"
                      />
                      <span className="text-sm text-dark">{feature}</span>
                    </li>
                  ))}
                  {isYearly && getSavingsText(tier) && (
                    <li className="flex items-start gap-3">
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="mt-0.5 text-sm text-teal"
                      />
                      <span className="text-sm font-medium text-teal">
                        {getSavingsText(tier)}
                      </span>
                    </li>
                  )}
                </ul>

                {/* Fair Use Note (subscriptions only) */}
                {activeTab === 'subscriptions' && (
                  <p className="mb-4 text-xs text-amber">
                    Fair use applies: soft cap on tickets per month; additional
                    tickets available at per-ticket rates.
                  </p>
                )}

                {/* CTA */}
                <Button
                  className="h-12 w-full text-base font-semibold bg-dark text-white hover:bg-dark/90"
                  asChild
                >
                  <Link href={tier.href}>{tier.cta}</Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare Plans Link */}
      <section className="pb-16 text-center">
        <a
          href="#compare"
          className="inline-flex items-center gap-2 text-sm font-medium text-dark hover:underline"
          onClick={() =>
            track(TRACKING_EVENTS.PRICING_COMPARE_PLANS_CLICKED, {})
          }
        >
          Compare all plans
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
        </a>
      </section>

      {/* Compare Plans Table */}
      <section id="compare" className="bg-light py-16 md:py-20">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="mb-12 text-center text-3xl font-bold text-dark"
          >
            Compare Plans
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="overflow-x-auto"
          >
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-4 text-left text-sm font-medium text-gray">
                    Feature
                  </th>
                  <th className="pb-4 text-center text-sm font-medium text-gray">
                    Free
                  </th>
                  <th className="pb-4 text-center">
                    <div className="text-sm font-semibold text-dark">
                      Standard
                    </div>
                    <div className="text-xs text-gray">£2.99/ticket</div>
                  </th>
                  <th className="pb-4 text-center">
                    <div className="text-sm font-semibold text-dark">
                      Premium
                    </div>
                    <div className="text-xs text-gray">£9.99/ticket</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {compareFeatures.map((feature, index) => (
                  <tr
                    key={feature.name}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-transparent'}
                  >
                    <td className="py-4 text-sm text-dark">{feature.name}</td>
                    <td className="py-4 text-center">
                      {feature.free === true ? (
                        <FontAwesomeIcon icon={faCheck} className="text-teal" />
                      ) : feature.free === false ? (
                        <FontAwesomeIcon
                          icon={faXmark}
                          className="text-gray/40"
                        />
                      ) : (
                        <span className="text-sm text-gray">
                          {feature.free}
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-center">
                      {feature.standard === true ? (
                        <FontAwesomeIcon icon={faCheck} className="text-teal" />
                      ) : (
                        <FontAwesomeIcon
                          icon={faXmark}
                          className="text-gray/40"
                        />
                      )}
                    </td>
                    <td className="py-4 text-center">
                      {feature.premium === true ? (
                        <FontAwesomeIcon icon={faCheck} className="text-teal" />
                      ) : (
                        <FontAwesomeIcon
                          icon={faXmark}
                          className="text-gray/40"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="mb-12 text-center text-3xl font-bold text-dark"
          >
            Frequently Asked Questions
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
          >
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left text-base font-semibold text-dark hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-dark py-16 md:py-20">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="text-3xl font-bold text-white md:text-4xl"
          >
            Ready to challenge your ticket?
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-4 max-w-xl text-lg text-white/70"
          >
            Join thousands of drivers who have successfully appealed their
            parking tickets.
          </motion.p>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-wrap justify-center gap-4"
          >
            <Button
              size="lg"
              className="h-12 bg-teal px-8 text-base font-semibold text-white hover:bg-teal-dark"
              asChild
            >
              <Link href="/new">Start My Appeal</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-white/30 bg-transparent px-8 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href="mailto:sales@parkticketpal.com">Contact Sales</Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
