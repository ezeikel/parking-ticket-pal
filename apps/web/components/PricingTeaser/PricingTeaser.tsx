'use client';

import { faCheck } from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

const PRICING_TIERS = [
  {
    name: 'Free',
    price: '£0',
    highlight: 'Track tickets & never miss a deadline',
    features: [
      'Unlimited tickets',
      'Email + push reminders',
      'Timeline tracking',
      'Document storage',
      'Key deadline notifications',
    ],
    cta: 'Included with every account',
    href: '',
    isPopular: false,
    disabled: true,
  },
  {
    name: 'Premium',
    price: '£14.99',
    highlight: 'Everything you need to challenge and win',
    features: [
      'Everything in Free',
      'Challenge/appeal letter with AI assist',
      'Auto-submission to council',
      'Success prediction score',
      'SMS reminders',
      '30-day ad-free experience',
    ],
    cta: 'Upgrade to Premium — £14.99',
    href: '/new?tier=premium&source=homepage',
    isPopular: true,
    disabled: false,
  },
];

const PricingTeaser = () => {
  const { track } = useAnalytics();

  const handlePlanClick = (planName: string, price: string) => {
    track(TRACKING_EVENTS.PRICING_PLAN_CLICKED, {
      plan_name: planName,
      plan_type: 'one-time',
      price,
      location: 'homepage',
    });
  };

  return (
    <section className="py-16 md:py-24 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-800 dark:text-slate-100">
            Simple Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free. Upgrade when you need to challenge.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 items-stretch">
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
                  {tier.name === 'Premium' && (
                    <span className="text-sm text-muted-foreground">
                      {' '}
                      / ticket
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
                  <Button asChild size="lg" className="w-full mt-auto">
                    <a
                      href={tier.href}
                      onClick={() => handlePlanClick(tier.name, tier.price)}
                    >
                      {tier.cta}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground text-center mt-10 md:mt-12 italic">
          Add your tickets for free. Upgrade only when you&apos;re ready.{' '}
          <a
            href="/pricing"
            className="text-primary hover:underline font-medium"
          >
            View full pricing details &rarr;
          </a>
        </p>
      </div>
    </section>
  );
};

export default PricingTeaser;
