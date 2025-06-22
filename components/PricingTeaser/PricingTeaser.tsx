'use client';

import { faCheck } from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PRICING_TIERS = [
  {
    name: 'Free',
    price: '£0',
    highlight: 'Track tickets & deadlines',
    features: [
      'Unlimited ticket storage',
      'View fine deadlines',
      'Upload letters & photos',
    ],
    cta: 'Included with every account',
    href: '',
    isPopular: false,
    disabled: true,
  },
  {
    name: 'Ticket Basic',
    price: '£2.99',
    highlight: 'SMS + Email Alerts',
    features: [
      'Everything in Free',
      'Smart deadline reminders (SMS & Email)',
      'Peace of mind, never miss a date',
    ],
    cta: 'Get Reminders',
    href: '/sign-up?tier=reminders&utm_source=homepage_pricing',
    isPopular: false,
    disabled: false,
  },
  {
    name: 'Ticket Pro',
    price: '£9.99',
    highlight: 'Full AI Support & Submission',
    features: [
      'Everything in Ticket Basic',
      'AI-generated appeal letters',
      'Appeal success prediction',
      'Optional auto-submission for common fines',
    ],
    cta: 'Get Full AI Help',
    href: '/sign-up?tier=pro&utm_source=homepage_pricing',
    isPopular: true,
    disabled: false,
  },
];

const PricingTeaser = () => (
  <section className="py-16 md:py-24 bg-white dark:bg-slate-900">
    <div className="container mx-auto px-4 md:px-6 max-w-6xl">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-800 dark:text-slate-100">
          📦 Simple Pricing, Powerful Help
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Start for free by adding your tickets. Upgrade anytime you need
          reminders or our AI-powered appeal assistance.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3 items-stretch">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              'rounded-xl border flex flex-col shadow-lg hover:shadow-2xl transition-shadow duration-300',
              tier.isPopular
                ? 'border-primary ring-2 ring-primary dark:border-primary'
                : 'border-slate-200 dark:border-slate-700',
              tier.disabled
                ? 'bg-slate-100 dark:bg-slate-800'
                : 'bg-white dark:bg-slate-900',
            )}
          >
            {tier.isPopular && (
              <div className="bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider py-1.5 px-4 rounded-t-lg text-center">
                Most Popular
              </div>
            )}
            <div className="p-6 md:p-8 flex flex-col flex-grow">
              <div className="mb-6">
                <h3
                  className={cn(
                    'text-2xl font-semibold mb-1',
                    tier.isPopular
                      ? 'text-primary'
                      : 'text-slate-800 dark:text-slate-100',
                  )}
                >
                  {tier.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tier.highlight}
                </p>
              </div>
              <div className="mb-6">
                <span
                  className={cn(
                    'text-4xl md:text-5xl font-bold',
                    tier.isPopular
                      ? 'text-primary'
                      : 'text-slate-900 dark:text-slate-50',
                  )}
                >
                  {tier.price}
                </span>
                {tier.name !== 'Free' && (
                  <span className="text-sm text-muted-foreground">
                    {' '}
                    / ticket issue
                  </span>
                )}
              </div>
              <ul className="space-y-3 text-sm flex-grow mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <FontAwesomeIcon
                      icon={faCheck}
                      size="lg"
                      className="text-green-500"
                    />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              {tier.disabled ? (
                <Button
                  disabled
                  variant="outline"
                  size="lg"
                  className="w-full mt-auto"
                >
                  {tier.cta}
                </Button>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    'w-full mt-auto',
                    !tier.isPopular && 'bg-primary hover:bg-primary/90',
                  )}
                >
                  <a href={tier.href}>{tier.cta}</a>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground text-center mt-10 md:mt-12 italic">
        Add your tickets for free. Upgrade only when you&apos;re ready.
      </p>
    </div>
  </section>
);

export default PricingTeaser;
