'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TicketTier } from '@parking-ticket-pal/db';
import {
  createTicketCheckoutSession,
  createGuestCheckoutSession,
} from '@/app/actions/stripe';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/pro-regular-svg-icons';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';
import { trackInitiateCheckout } from '@/lib/facebook-pixel';
import useLogger from '@/lib/use-logger';
import {
  getGuestTicketData,
  isGuestTicketExpired,
  clearGuestTicketData,
} from '@/utils/guestTicket';

const CheckoutContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { track } = useAnalytics();
  const logger = useLogger({ page: 'checkout' });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initiateCheckout = async () => {
      try {
        // Get parameters from URL
        const ticketId = searchParams.get('ticketId');
        const tier = searchParams.get('tier') as 'standard' | 'premium' | null;
        const source = searchParams.get('source');

        // Check if this is a guest checkout (from wizard)
        const isGuestCheckout = source === 'wizard' && !ticketId;

        if (isGuestCheckout) {
          // Handle guest checkout flow
          const guestData = getGuestTicketData();

          if (!guestData) {
            logger.warn('Guest checkout attempted but no wizard data found');
            setError(
              'Your session has expired. Please upload your ticket again.',
            );
            setIsLoading(false);
            return;
          }

          if (isGuestTicketExpired(guestData)) {
            clearGuestTicketData();
            logger.warn('Guest checkout attempted with expired data');
            setError(
              'Your session has expired. Please upload your ticket again.',
            );
            setIsLoading(false);
            return;
          }

          const guestTier = tier || guestData.tier;
          if (
            !guestTier ||
            (guestTier !== 'standard' && guestTier !== 'premium')
          ) {
            logger.warn('Guest checkout with invalid tier', {
              tier: guestTier,
            });
            setError('Invalid pricing tier selected.');
            setIsLoading(false);
            return;
          }

          // Track guest checkout initiation
          await track(TRACKING_EVENTS.CHECKOUT_SESSION_CREATED, {
            productType: 'PAY_PER_TICKET' as any,
            tier: guestTier.toUpperCase() as TicketTier,
          });
          trackInitiateCheckout({
            content_name: 'ticket_tier_upgrade',
            content_category: guestTier,
          });

          // Create guest Stripe checkout session
          // Ensure tier is set (we've already validated it above)
          const checkoutData = {
            ...guestData,
            tier: guestTier as 'standard' | 'premium' | 'subscription',
          };
          const session = await createGuestCheckoutSession(
            guestTier.toUpperCase() as 'STANDARD' | 'PREMIUM',
            checkoutData,
          );

          if (!session?.url) {
            logger.error('Guest checkout session created but no URL returned');
            setError(
              'Unable to create checkout session. Please try again or contact support.',
            );
            setIsLoading(false);
            return;
          }

          // Redirect to Stripe checkout
          window.location.href = session.url;
          return;
        }

        // Standard checkout flow (existing ticket)
        if (!ticketId) {
          logger.warn('Checkout attempted without ticket ID');
          setError('Missing ticket ID. Please create a ticket first.');
          setIsLoading(false);
          return;
        }

        if (!tier || (tier !== 'standard' && tier !== 'premium')) {
          logger.warn('Checkout attempted with invalid tier', { tier });
          setError('Invalid pricing tier selected.');
          setIsLoading(false);
          return;
        }

        // Convert tier to TicketTier enum (STANDARD or PREMIUM)
        const ticketTier = tier.toUpperCase() as Omit<TicketTier, 'FREE'>;

        // Track checkout initiation
        await track(TRACKING_EVENTS.CHECKOUT_SESSION_CREATED, {
          productType: 'PAY_PER_TICKET' as any,
          ticketId,
          tier: ticketTier as TicketTier,
        });
        trackInitiateCheckout({
          content_name: 'ticket_tier_upgrade',
          content_category: tier,
        });

        // Create Stripe checkout session
        const session = await createTicketCheckoutSession(ticketTier, ticketId);

        if (!session?.url) {
          logger.error('Checkout session created but no URL returned', {
            ticketId,
            tier: ticketTier,
          });
          setError(
            'Unable to create checkout session. Please try again or contact support.',
          );
          setIsLoading(false);
          return;
        }

        // Redirect to Stripe checkout
        window.location.href = session.url;
      } catch (err) {
        logger.error(
          'Checkout error',
          {
            ticketId: searchParams.get('ticketId'),
            tier: searchParams.get('tier'),
          },
          err instanceof Error ? err : undefined,
        );
        setError(
          'An unexpected error occurred. Please try again or contact support.',
        );
        setIsLoading(false);
      }
    };

    initiateCheckout();
  }, [searchParams, track, logger]);

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="font-slab text-center">
              {isLoading ? 'Preparing Checkout...' : 'Checkout Error'}
            </CardTitle>
            <CardDescription className="text-center">
              {isLoading
                ? 'Please wait while we redirect you to secure payment.'
                : 'We encountered an issue.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="h-12 w-12 text-primary animate-spin"
                />
                <p className="text-sm text-muted-foreground text-center">
                  Redirecting to Stripe...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Go Home
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const CheckoutPage = () => (
  <Suspense
    fallback={
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="font-slab text-center">
                Loading...
              </CardTitle>
              <CardDescription className="text-center">
                Please wait
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 py-8">
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="h-12 w-12 text-primary animate-spin"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }
  >
    <CheckoutContent />
  </Suspense>
);

export default CheckoutPage;
