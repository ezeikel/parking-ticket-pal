import type { PriceCardProps } from '@/components/pricing/PriceCard';

export const PRICING_COPY = {
  header: {
    title: 'Pricing',
    subtitle:
      'Pay per ticket, subscribe for peace of mind, or talk to us about fleets.',
  },
  tabs: {
    oneTime: 'One-Time (Per Ticket)',
    subscriptions: 'Subscriptions',
    business: 'Business & Fleet',
  },
  fairUse:
    'Fair use applies: soft cap on tickets per month; additional tickets available at per-ticket rates.',
};

export const ONE_TIME_PRICING: Omit<PriceCardProps, 'dataAttrs'>[] = [
  {
    title: 'Standard',
    subtitle: 'Track and never miss a deadline',
    price: '£2.99',
    period: 'ticket',
    features: [
      'Email + SMS reminders',
      'Timeline tracking',
      'Storage for letters and tickets',
      'Deadline notifications',
    ],
    ctaLabel: 'Add Ticket & Get Standard',
    href: '/new?tier=standard&source=pricing',
  },
  {
    title: 'Premium',
    subtitle: 'Challenge your ticket the smart way',
    price: '£9.99',
    period: 'ticket',
    features: [
      'Everything in Standard',
      'AI appeal letter generation',
      'Success prediction score',
      'Automatic challenge submission',
      'Priority support',
    ],
    ctaLabel: 'Add Ticket & Get Premium',
    href: '/new?tier=premium&source=pricing',
    badge: 'Most Popular',
    variant: 'highlighted' as const,
  },
];

export const SUBSCRIPTION_PRICING = {
  monthly: [
    {
      title: 'Standard Plan',
      subtitle: 'For regular users',
      price: '£6.99',
      period: 'month',
      features: [
        'Up to 5 tickets per month',
        'Email + SMS reminders',
        'Timeline tracking',
        'Storage for letters and tickets',
      ],
      ctaLabel: 'Subscribe to Standard',
      href: '/signin?redirect=/account/billing&plan=standard-monthly',
      disclaimer: PRICING_COPY.fairUse,
    },
    {
      title: 'Premium Plan',
      subtitle: 'Full support every month',
      price: '£14.99',
      period: 'month',
      features: [
        'Up to 10 tickets per month',
        'Everything in Standard',
        'AI appeal letter generation',
        'Success prediction score',
        'Automatic challenge submission',
      ],
      ctaLabel: 'Subscribe to Premium',
      href: '/signin?redirect=/account/billing&plan=premium-monthly',
      badge: 'Best Value',
      variant: 'highlighted' as const,
      disclaimer: PRICING_COPY.fairUse,
    },
  ],
  yearly: [
    {
      title: 'Standard Plan',
      subtitle: 'For regular users',
      price: '£69.99',
      period: 'year',
      originalPrice: '£83.88/year',
      features: [
        'Up to 5 tickets per month',
        'Email + SMS reminders',
        'Timeline tracking',
        'Storage for letters and tickets',
        'Save £13.89 per year',
      ],
      ctaLabel: 'Subscribe to Standard',
      href: '/signin?redirect=/account/billing&plan=standard-yearly',
      disclaimer: PRICING_COPY.fairUse,
    },
    {
      title: 'Premium Plan',
      subtitle: 'Full support every month',
      price: '£149.99',
      period: 'year',
      originalPrice: '£179.88/year',
      features: [
        'Up to 10 tickets per month',
        'Everything in Standard',
        'AI appeal letter generation',
        'Success prediction score',
        'Automatic challenge submission',
        'Save £29.89 per year',
      ],
      ctaLabel: 'Subscribe to Premium',
      href: '/signin?redirect=/account/billing&plan=premium-yearly',
      badge: 'Best Value',
      variant: 'highlighted' as const,
      disclaimer: PRICING_COPY.fairUse,
    },
  ],
};

export const BUSINESS_PRICING = {
  monthly: [
    {
      title: 'Fleet Starter',
      subtitle: 'Perfect for small businesses',
      price: '£49',
      period: 'month',
      features: [
        'Up to 50 tickets per month',
        'Shared dashboard',
        'Bulk upload',
        'Email + SMS reminders',
        '2 staff accounts',
        'Email support',
      ],
      ctaLabel: 'Contact Sales',
      href: '/contact?interest=fleet-starter',
    },
    {
      title: 'Fleet Pro',
      subtitle: 'For growing fleets',
      price: '£149',
      period: 'month',
      features: [
        'Up to 200 tickets per month',
        'All Starter features',
        'API & CSV integration',
        'Team roles & permissions',
        'Priority support',
        'Data export',
      ],
      ctaLabel: 'Contact Sales',
      href: '/contact?interest=fleet-pro',
      badge: 'Popular',
      variant: 'highlighted' as const,
    },
    {
      title: 'Fleet Enterprise',
      subtitle: 'Custom solution for large fleets',
      price: 'Custom',
      features: [
        'Unlimited tickets (fair use)',
        'Everything in Pro',
        'SSO & white label',
        'Custom integrations',
        'Dedicated account manager',
        'SLA guarantee',
      ],
      ctaLabel: 'Contact Sales',
      href: '/contact?interest=enterprise',
    },
  ],
  yearly: [
    {
      title: 'Fleet Starter',
      subtitle: 'Perfect for small businesses',
      price: '£499',
      period: 'year',
      originalPrice: '£588/year',
      features: [
        'Up to 50 tickets per month',
        'Shared dashboard',
        'Bulk upload',
        'Email + SMS reminders',
        '2 staff accounts',
        'Email support',
        'Save £89 per year',
      ],
      ctaLabel: 'Contact Sales',
      href: '/contact?interest=fleet-starter',
    },
    {
      title: 'Fleet Pro',
      subtitle: 'For growing fleets',
      price: '£1,499',
      period: 'year',
      originalPrice: '£1,788/year',
      features: [
        'Up to 200 tickets per month',
        'All Starter features',
        'API & CSV integration',
        'Team roles & permissions',
        'Priority support',
        'Data export',
        'Save £289 per year',
      ],
      ctaLabel: 'Contact Sales',
      href: '/contact?interest=fleet-pro',
      badge: 'Popular',
      variant: 'highlighted' as const,
    },
    {
      title: 'Fleet Enterprise',
      subtitle: 'Custom solution for large fleets',
      price: 'Custom',
      features: [
        'Unlimited tickets (fair use)',
        'Everything in Pro',
        'SSO & white label',
        'Custom integrations',
        'Dedicated account manager',
        'SLA guarantee',
      ],
      ctaLabel: 'Contact Sales',
      href: '/contact?interest=enterprise',
    },
  ],
};

export const FAQ_ITEMS = [
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

export const COMPARISON_FEATURES = [
  { name: 'Add unlimited tickets', free: true, standard: true, premium: true },
  { name: 'See key deadlines', free: true, standard: true, premium: true },
  {
    name: 'Manage notes & uploads',
    free: true,
    standard: true,
    premium: true,
  },
  { name: 'Email + SMS reminders', free: false, standard: true, premium: true },
  { name: 'Timeline tracking', free: false, standard: true, premium: true },
  {
    name: 'Document storage',
    free: 'Limited',
    standard: true,
    premium: true,
  },
  {
    name: 'AI appeal letter',
    free: false,
    standard: false,
    premium: true,
  },
  {
    name: 'Success prediction',
    free: false,
    standard: false,
    premium: true,
  },
  {
    name: 'Auto submission',
    free: false,
    standard: false,
    premium: true,
  },
  {
    name: 'Priority support',
    free: false,
    standard: false,
    premium: true,
  },
];
