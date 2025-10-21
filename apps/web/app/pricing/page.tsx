'use client';

import * as React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PriceCard } from '@/components/pricing/PriceCard';
import { BillingToggle } from '@/components/pricing/BillingToggle';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark } from '@fortawesome/pro-regular-svg-icons';
import {
  PRICING_COPY,
  ONE_TIME_PRICING,
  SUBSCRIPTION_PRICING,
  BUSINESS_PRICING,
  FAQ_ITEMS,
  COMPARISON_FEATURES,
} from '@/lib/pricing-data';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

function renderFeatureCell(value: boolean | string) {
  if (typeof value === 'string') {
    return <span className="text-sm text-muted-foreground">{value}</span>;
  }
  if (value) {
    return (
      <FontAwesomeIcon
        icon={faCheck}
        className="h-5 w-5 text-green-600 mx-auto"
      />
    );
  }
  return (
    <FontAwesomeIcon
      icon={faXmark}
      className="h-5 w-5 text-muted-foreground/40 mx-auto"
    />
  );
}

const PricingPage = () => {
  const { track } = useAnalytics();
  const [billingPeriod, setBillingPeriod] = React.useState<
    'monthly' | 'yearly'
  >('monthly');
  const [currentTab, setCurrentTab] = React.useState<
    'one-time' | 'subscriptions' | 'business'
  >('one-time');

  const subscriptionPlans = SUBSCRIPTION_PRICING[billingPeriod];
  const businessPlans = BUSINESS_PRICING[billingPeriod];

  // Track page view on mount
  React.useEffect(() => {
    track(TRACKING_EVENTS.PRICING_PAGE_VIEWED, {});
  }, [track]);

  const handleTabChange = (value: string) => {
    const newTab = value as 'one-time' | 'subscriptions' | 'business';
    track(TRACKING_EVENTS.PRICING_TAB_CHANGED, {
      fromTab: currentTab,
      toTab: newTab,
    });
    setCurrentTab(newTab);
  };

  const handleComparePlansClick = () => {
    track(TRACKING_EVENTS.PRICING_COMPARE_PLANS_CLICKED, {});
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="font-slab text-4xl md:text-5xl font-extrabold mb-4 text-primary">
          {PRICING_COPY.header.title}
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          {PRICING_COPY.header.subtitle}
        </p>
      </header>

      {/* Tabs */}
      <Tabs
        defaultValue="one-time"
        value={currentTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="flex justify-center mb-8">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="one-time">
              {PRICING_COPY.tabs.oneTime}
            </TabsTrigger>
            <TabsTrigger value="subscriptions">
              {PRICING_COPY.tabs.subscriptions}
            </TabsTrigger>
            <TabsTrigger value="business">
              {PRICING_COPY.tabs.business}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* One-Time Pricing */}
        <TabsContent value="one-time" className="mt-8">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {ONE_TIME_PRICING.map((plan) => (
              <PriceCard
                key={plan.title}
                {...plan}
                planType="one-time"
                dataAttrs={{
                  'data-sku':
                    plan.title.toLowerCase() === 'standard'
                      ? 'standard_one_time'
                      : 'premium_one_time',
                }}
              />
            ))}
          </section>
        </TabsContent>

        {/* Subscriptions */}
        <TabsContent value="subscriptions" className="mt-8">
          <div className="flex flex-col items-center">
            <BillingToggle
              value={billingPeriod}
              onChange={setBillingPeriod}
              tab="subscriptions"
            />
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-6 w-full">
              {subscriptionPlans.map((plan) => (
                <PriceCard
                  key={plan.title}
                  {...plan}
                  planType="subscription"
                  billingPeriod={billingPeriod}
                  dataAttrs={{
                    'data-plan':
                      plan.title.toLowerCase().includes('standard')
                        ? `standard_${billingPeriod}`
                        : `premium_${billingPeriod}`,
                  }}
                />
              ))}
            </section>
          </div>
        </TabsContent>

        {/* Business & Fleet */}
        <TabsContent value="business" className="mt-8">
          <div className="flex flex-col items-center">
            <BillingToggle
              value={billingPeriod}
              onChange={setBillingPeriod}
              tab="business"
            />
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-6 w-full">
              {businessPlans.map((plan) => (
                <PriceCard
                  key={plan.title}
                  {...plan}
                  planType="business"
                  billingPeriod={billingPeriod}
                  dataAttrs={{
                    'data-interest': plan.href.split('interest=')[1],
                  }}
                />
              ))}
            </section>
          </div>
        </TabsContent>
      </Tabs>

      {/* Compare Plans Link */}
      <div className="text-center mt-16 mb-24">
        <a
          href="#compare-plans"
          className="text-primary hover:underline font-medium text-lg"
          onClick={handleComparePlansClick}
        >
          Compare all plans →
        </a>
      </div>

      {/* Comparison Table */}
      <section id="compare-plans" className="mt-8 max-w-5xl mx-auto scroll-mt-8">
        <h2 className="font-slab text-3xl font-bold mb-8 text-center">
          Compare Plans
        </h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Feature</TableHead>
                <TableHead className="text-center">Free</TableHead>
                <TableHead className="text-center">
                  Standard
                  <div className="text-xs font-normal text-muted-foreground">
                    £2.99/ticket
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  Premium
                  <div className="text-xs font-normal text-muted-foreground">
                    £9.99/ticket
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPARISON_FEATURES.map((feature) => (
                <TableRow key={feature.name}>
                  <TableCell className="font-medium">{feature.name}</TableCell>
                  <TableCell className="text-center">
                    {renderFeatureCell(feature.free)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderFeatureCell(feature.standard)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderFeatureCell(feature.premium)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="font-slab text-3xl font-bold mb-8 text-center">
          Frequently Asked Questions
        </h2>
        <ul className="space-y-6">
          {FAQ_ITEMS.map((item) => (
            <li key={item.question}>
              <h3 className="font-semibold text-lg mb-2">{item.question}</h3>
              <p className="text-muted-foreground">{item.answer}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default PricingPage;
