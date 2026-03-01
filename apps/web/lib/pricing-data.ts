import type { PriceCardProps } from '@/components/pricing/PriceCard';

export const PRICING_COPY = {
  header: {
    title: 'Pricing',
    subtitle: 'Start free. Upgrade when you need to challenge.',
  },
};

export const PRICING_TIERS: Omit<PriceCardProps, 'dataAttrs'>[] = [
  {
    title: 'Free',
    subtitle: 'Track your tickets and never miss a deadline',
    price: '£0',
    period: 'forever',
    features: [
      'Unlimited tickets',
      'Email + push reminders',
      'Timeline tracking',
      'Document storage',
      'Key deadline notifications',
    ],
    ctaLabel: 'Start Free',
    href: '/new',
  },
  {
    title: 'Premium',
    subtitle: 'Everything you need to challenge and win',
    price: '£14.99',
    period: 'ticket',
    features: [
      'Everything in Free',
      'Challenge/appeal letter with optional AI assist',
      'Auto-submission to council',
      'Success prediction score',
      'SMS reminders',
      '30-day ad-free experience',
      'Priority support',
    ],
    ctaLabel: 'Upgrade to Premium — £14.99',
    href: '/new?tier=premium&source=pricing',
    variant: 'highlighted' as const,
  },
];

export const FAQ_ITEMS = [
  {
    question: 'Is there really a free tier?',
    answer:
      'Yes! Add unlimited tickets, track deadlines, get email and push reminders — all completely free. You only pay when you want to challenge a ticket.',
  },
  {
    question: 'What does Premium include?',
    answer:
      'Premium unlocks challenge/appeal letter generation with optional AI assist, automatic submission to the council, a success prediction score, SMS reminders, 30 days ad-free, and priority support — all for a one-time £14.99 per ticket.',
  },
  {
    question: 'Is it a subscription?',
    answer:
      'No. Premium is a one-time payment per ticket — £14.99 each time you want to challenge. No recurring charges, no commitments.',
  },
  {
    question: 'Is it worth £14.99?',
    answer:
      "Most parking tickets are £60–£130. One successful challenge saves you far more than £14.99. If you think there's a case, it pays for itself.",
  },
  {
    question: 'What happens after I pay?',
    answer:
      'Your ticket is instantly upgraded to Premium. You get access to the challenge letter generator, auto-submission, success prediction, SMS reminders, and 30 days ad-free across web and mobile.',
  },
  {
    question: 'Can I use it on mobile too?',
    answer:
      'Yes! Parking Ticket Pal works on both web and mobile. Your Premium upgrade applies to the specific ticket, accessible from any device.',
  },
];

export const COMPARISON_FEATURES = [
  { name: 'Unlimited tickets', free: true, premium: true },
  { name: 'Email + push reminders', free: true, premium: true },
  { name: 'Timeline tracking', free: true, premium: true },
  { name: 'Document storage', free: true, premium: true },
  { name: 'Key deadline notifications', free: true, premium: true },
  { name: 'Challenge/appeal letter', free: false, premium: true },
  { name: 'AI-assisted letter generation', free: false, premium: true },
  { name: 'Auto-submission to council', free: false, premium: true },
  { name: 'Success prediction score', free: false, premium: true },
  { name: 'SMS reminders', free: false, premium: true },
  { name: '30-day ad-free experience', free: false, premium: true },
  { name: 'Priority support', free: false, premium: true },
];
