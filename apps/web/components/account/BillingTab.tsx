'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrown,
  faCreditCard,
  faReceipt,
  faDownload,
  faSpinnerThird,
  faCircleCheck,
  faArrowUpRight,
} from '@fortawesome/pro-solid-svg-icons';
import {
  faCcVisa,
  faCcMastercard,
  faCcAmex,
} from '@fortawesome/free-brands-svg-icons';
import { User } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';
import BillingToggle from '@/components/pricing/BillingToggle';
import { SUBSCRIPTION_PRICING } from '@/lib/pricing-data';
import {
  createSubscriptionCheckoutSession,
  createCustomerPortalSession,
  getPaymentMethods,
  getInvoices,
  getActiveSubscription,
  type PaymentMethodData,
  type InvoiceData,
  type SubscriptionData,
} from '@/app/actions/stripe';
import { toast } from 'sonner';

type BillingTabProps = {
  user: Partial<User>;
};

const BillingTab = ({ user }: BillingTabProps) => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>(
    'monthly',
  );
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  // Real data from Stripe
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Stripe data on mount
  useEffect(() => {
    const fetchStripeData = async () => {
      if (!user.stripeCustomerId) {
        setIsLoading(false);
        return;
      }

      try {
        const [methods, invoiceList, activeSub] = await Promise.all([
          getPaymentMethods(),
          getInvoices(),
          getActiveSubscription(),
        ]);

        setPaymentMethods(methods);
        setInvoices(invoiceList);
        setSubscription(activeSub);
      } catch (error) {
        console.error('Error fetching Stripe data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStripeData();
  }, [user.stripeCustomerId]);

  // Get the default payment method
  const defaultPaymentMethod =
    paymentMethods.find((pm) => pm.isDefault) || paymentMethods[0];

  // Determine current plan based on subscription
  const currentPlan = subscription
    ? {
        name: subscription.plan.name,
        price: subscription.plan.amount,
        interval: subscription.plan.interval,
        renewalDate: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        features: subscription.plan.name.toLowerCase().includes('premium')
          ? [
              'Up to 10 tickets per month',
              'Everything in Standard',
              'AI appeal letter generation',
              'Success prediction score',
            ]
          : [
              'Up to 5 tickets per month',
              'Email + SMS reminders',
              'Timeline tracking',
              'Storage for letters and tickets',
            ],
      }
    : {
        name: 'Free',
        price: 0,
        interval: 'month' as const,
        renewalDate: null,
        cancelAtPeriodEnd: false,
        features: ['1 active ticket', 'Basic appeal letters', 'Email support'],
      };

  const handleUpgrade = async (tier: 'standard' | 'premium') => {
    setIsUpgrading(tier);
    try {
      const session = await createSubscriptionCheckoutSession(
        tier,
        billingPeriod,
      );
      if (session?.url) {
        window.location.href = session.url;
      } else {
        toast.error('Failed to create checkout session');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsUpgrading(null);
    }
  };

  const handleManagePayment = async () => {
    setIsLoadingPortal(true);
    try {
      const session = await createCustomerPortalSession();
      if (session?.url) {
        window.location.href = session.url;
      } else {
        toast.error('Unable to open billing portal. Please try again.');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const getCardIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return faCcVisa;
      case 'mastercard':
        return faCcMastercard;
      case 'amex':
        return faCcAmex;
      default:
        return faCreditCard;
    }
  };

  const currentPlans =
    billingPeriod === 'monthly'
      ? SUBSCRIPTION_PRICING.monthly
      : SUBSCRIPTION_PRICING.yearly;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal/10">
              <FontAwesomeIcon icon={faCrown} className="text-xl text-teal" />
            </div>
            <div>
              <h3 className="font-semibold text-dark">Current Plan</h3>
              <p className="text-2xl font-bold text-dark">
                {currentPlan.name}
                {currentPlan.price > 0 && (
                  <span className="ml-2 text-base font-normal text-gray">
                    {'\u00A3'}
                    {(currentPlan.price / 100).toFixed(2)}/
                    {currentPlan.interval === 'year' ? 'year' : 'month'}
                  </span>
                )}
              </p>
              {currentPlan.renewalDate && (
                <p className="mt-1 text-sm text-gray">
                  {currentPlan.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
                  {new Date(currentPlan.renewalDate).toLocaleDateString(
                    'en-GB',
                  )}
                </p>
              )}
            </div>
          </div>
          {subscription && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManagePayment}
                disabled={isLoadingPortal}
              >
                {isLoadingPortal ? (
                  <FontAwesomeIcon
                    icon={faSpinnerThird}
                    className="animate-spin"
                  />
                ) : (
                  'Manage Plan'
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Current Plan Features */}
        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-3 text-sm font-medium text-gray">
            Your plan includes:
          </p>
          <ul className="space-y-2">
            {currentPlan.features.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2 text-sm text-dark"
              >
                <FontAwesomeIcon icon={faCircleCheck} className="text-teal" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Upgrade Plans */}
      {!subscription && (
        <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
          <h3 className="text-lg font-semibold text-dark">Upgrade Your Plan</h3>
          <p className="mt-1 text-sm text-gray">
            Get unlimited tickets and AI-powered appeal letters.
          </p>

          <div className="mt-6 flex justify-center">
            <BillingToggle
              value={billingPeriod}
              onChange={setBillingPeriod}
              tab="subscriptions"
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {currentPlans.map((plan) => (
              <motion.div
                key={plan.title}
                whileHover={{ y: -2 }}
                className={`relative rounded-xl border-2 p-5 transition-all ${
                  'variant' in plan && plan.variant === 'highlighted'
                    ? 'border-teal bg-teal/5'
                    : 'border-border hover:border-teal/50'
                }`}
              >
                {'badge' in plan && plan.badge && (
                  <span className="absolute -top-3 left-4 rounded-full bg-teal px-3 py-1 text-xs font-medium text-white">
                    {plan.badge}
                  </span>
                )}
                <h4 className="text-lg font-bold text-dark">{plan.title}</h4>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-dark">
                    {plan.price}
                  </span>
                  <span className="text-gray">
                    /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>
                <ul className="mt-4 space-y-2">
                  {plan.features.slice(0, 4).map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-gray"
                    >
                      <FontAwesomeIcon
                        icon={faCircleCheck}
                        className="text-teal"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() =>
                    handleUpgrade(
                      plan.title.toLowerCase().replace(' plan', '') as
                        | 'standard'
                        | 'premium',
                    )
                  }
                  disabled={isUpgrading !== null}
                  className={`mt-4 h-10 w-full ${
                    'variant' in plan && plan.variant === 'highlighted'
                      ? 'bg-teal text-white hover:bg-teal-dark'
                      : 'bg-dark text-white hover:bg-dark/90'
                  }`}
                >
                  {isUpgrading ===
                  plan.title.toLowerCase().replace(' plan', '') ? (
                    <>
                      <FontAwesomeIcon
                        icon={faSpinnerThird}
                        className="mr-2 animate-spin"
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      Upgrade
                      <FontAwesomeIcon icon={faArrowUpRight} className="ml-2" />
                    </>
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Method Card - only show if user has made a payment */}
      {user.stripeCustomerId && (
        <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-light">
                <FontAwesomeIcon
                  icon={faCreditCard}
                  className="text-xl text-gray"
                />
              </div>
              <div>
                <h3 className="font-semibold text-dark">Payment Method</h3>
                {isLoading ? (
                  <p className="text-sm text-gray">Loading...</p>
                ) : defaultPaymentMethod ? (
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={getCardIcon(defaultPaymentMethod.brand)}
                      className="text-2xl text-dark"
                    />
                    <span className="text-gray">
                      ···· {defaultPaymentMethod.last4} · Expires{' '}
                      {defaultPaymentMethod.expMonth}/
                      {defaultPaymentMethod.expYear}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-gray">No payment method on file</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManagePayment}
              disabled={isLoadingPortal}
            >
              {isLoadingPortal ? (
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="animate-spin"
                />
              ) : defaultPaymentMethod ? (
                'Update'
              ) : (
                'Add Card'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Billing History Card - only show if user has made a payment */}
      {user.stripeCustomerId && (
        <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-light">
              <FontAwesomeIcon icon={faReceipt} className="text-xl text-gray" />
            </div>
            <div>
              <h3 className="font-semibold text-dark">Billing History</h3>
              <p className="text-sm text-gray">
                View past invoices and receipts.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 flex justify-center py-8">
              <FontAwesomeIcon
                icon={faSpinnerThird}
                className="animate-spin text-2xl text-gray"
              />
            </div>
          ) : invoices.length > 0 ? (
            <div className="mt-6 overflow-hidden rounded-lg border border-border">
              <table className="w-full">
                <thead className="bg-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray">
                      Invoice
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-light/50">
                      <td className="px-4 py-3 text-sm text-dark">
                        {new Date(invoice.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 text-sm text-dark">
                        {invoice.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-dark">
                        {'\u00A3'}
                        {(invoice.amount / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            invoice.status === 'paid'
                              ? 'bg-teal/10 text-teal'
                              : invoice.status === 'open'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {invoice.status === 'paid' ? 'Paid' : invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {invoice.pdfUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-teal"
                            onClick={() =>
                              window.open(invoice.pdfUrl!, '_blank')
                            }
                          >
                            <FontAwesomeIcon
                              icon={faDownload}
                              className="mr-1.5"
                            />
                            PDF
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 rounded-lg bg-light/50 py-8 text-center">
              <p className="text-gray">No payment history yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BillingTab;
