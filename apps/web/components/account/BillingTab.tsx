/* eslint-disable no-nested-ternary */
'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrown,
  faCreditCard,
  faReceipt,
  faDownload,
  faSpinnerThird,
  faCircleCheck,
} from '@fortawesome/pro-solid-svg-icons';
import {
  faCcVisa,
  faCcMastercard,
  faCcAmex,
} from '@fortawesome/free-brands-svg-icons';
import { User } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';
import {
  createCustomerPortalSession,
  getPaymentMethods,
  getInvoices,
  type PaymentMethodData,
  type InvoiceData,
} from '@/app/actions/stripe';
import { toast } from 'sonner';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';
import { logger } from '@/lib/logger';

type BillingTabProps = {
  user: Partial<User>;
};

const BillingTab = ({ user }: BillingTabProps) => {
  const { track } = useAnalytics();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  // Real data from Stripe
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Track billing page view on mount
  useEffect(() => {
    track(TRACKING_EVENTS.BILLING_PAGE_VISITED, {
      hasStripeCustomer: !!user.stripeCustomerId,
    });
  }, [track, user.stripeCustomerId]);

  // Fetch Stripe data on mount
  useEffect(() => {
    const fetchStripeData = async () => {
      if (!user.stripeCustomerId) {
        setIsLoading(false);
        return;
      }

      try {
        const [methods, invoiceList] = await Promise.all([
          getPaymentMethods(),
          getInvoices(),
        ]);

        setPaymentMethods(methods);
        setInvoices(invoiceList);
      } catch (error) {
        logger.error(
          'Error fetching Stripe data',
          { page: 'billing' },
          error instanceof Error ? error : undefined,
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchStripeData();
  }, [user.stripeCustomerId]);

  // Get the default payment method
  const defaultPaymentMethod =
    paymentMethods.find((pm) => pm.isDefault) || paymentMethods[0];

  const handleManagePayment = async () => {
    setIsLoadingPortal(true);
    try {
      const session = await createCustomerPortalSession();
      if (session?.url) {
        window.location.href = session.url;
      } else {
        toast.error('Unable to open billing portal. Please try again.');
      }
    } catch (_error) {
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
              <p className="text-2xl font-bold text-dark">Free</p>
              <p className="mt-1 text-sm text-gray">
                Upgrade individual tickets to Premium for £14.99
              </p>
            </div>
          </div>
        </div>

        {/* Current Plan Features */}
        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-3 text-sm font-medium text-gray">
            Your plan includes:
          </p>
          <ul className="space-y-2">
            {[
              'Unlimited tickets',
              'Email + push reminders',
              'Timeline tracking',
              'Document storage',
              'Key deadline notifications',
            ].map((feature) => (
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
