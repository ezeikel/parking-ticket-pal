import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import SubscriptionPlan from '@/components/SubscriptionPlan/SubscriptionPlan';
import { getSubscriptionDetails } from '@/app/actions/stripe';
import SubscribeButton from '@/components/buttons/SubscribeButton/SubscribeButton';
import ManageSubscriptionButton from '@/components/buttons/ManageSubscriptionButton/ManageSubscriptionButton';
import { ProductType, SubscriptionType } from '@prisma/client';

const BillingPage = async () => {
  const subscriptionDetails = await getSubscriptionDetails();
  const isProSubscriber = subscriptionDetails?.type === SubscriptionType.PRO;
  const productType = subscriptionDetails?.productType;

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-slab font-bold text-3xl">Billing & Subscription</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-slab font-bold text-2xl">
            Current Plan
          </CardTitle>
          <CardDescription>
            {isProSubscriber
              ? 'You are currently on the Pro Plan.'
              : 'You are currently on the Free Plan.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isProSubscriber ? (
            <div className="flex flex-col items-center space-y-4">
              <p className="text-gray-600 md:text-lg">
                Thank you for subscribing to Pro.
              </p>
              <ManageSubscriptionButton variant="outline" />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              <SubscriptionPlan
                name="Free"
                description="Basic features for occasional users"
                price="£0"
                period="forever"
                features={[
                  'Store up to 5 tickets',
                  'Basic appeal templates',
                  'Email notifications',
                ]}
                isActive={!isProSubscriber}
                isDisabled={!isProSubscriber}
              />

              <SubscriptionPlan
                name="Pro Monthly"
                description="Advanced features for regular users"
                price="£4.99"
                period="month"
                features={[
                  'Unlimited tickets storage',
                  'Premium appeal templates',
                  'SMS reminders and notifications',
                  'Fast-track support',
                  'Analytics dashboard',
                ]}
                isActive={productType === ProductType.PRO_MONTHLY}
                isDisabled={false}
                footer={
                  <SubscribeButton productType={ProductType.PRO_MONTHLY} />
                }
              />

              <SubscriptionPlan
                name="Pro Annual"
                description="20% savings with annual billing"
                price="£47.88"
                period="year"
                badge="Save 20%"
                features={[
                  'Unlimited tickets storage',
                  'Premium appeal templates',
                  'SMS reminders and notifications',
                  'Fast-track support',
                  'Analytics dashboard',
                  'Early access to new features',
                ]}
                isActive={productType === ProductType.PRO_ANNUAL}
                isDisabled={false}
                footer={
                  <SubscribeButton productType={ProductType.PRO_ANNUAL} />
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
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
