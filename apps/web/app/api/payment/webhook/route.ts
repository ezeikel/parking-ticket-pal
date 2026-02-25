import Stripe from 'stripe';
import { db, TicketTier, OnboardingExitReason } from '@parking-ticket-pal/db';
import { STRIPE_API_VERSION, isOneTimePrice } from '@/constants';
import { revalidatePath } from 'next/cache';
import { createServerLogger } from '@/lib/logger';
import { exitOnboardingSequenceForTicket } from '@/services/onboarding-sequence';
import {
  applyReferralCredits,
  deleteCouponAfterUse,
} from '@/lib/referral-stripe';

const log = createServerLogger({ action: 'stripe-webhook' });

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: STRIPE_API_VERSION,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// eslint-disable-next-line import-x/prefer-default-export
export const POST = async (req: Request) => {
  // get the raw body for signature verification
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    log.error('Missing Stripe signature header');
    return Response.json({ error: 'Missing signature' }, { status: 400 });
  }

  let stripeEvent: Stripe.Event;

  try {
    // verify the webhook signature
    stripeEvent = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    );
  } catch (err) {
    log.error(
      `Webhook signature verification failed: ${(err as Error).message}`,
      undefined,
      err instanceof Error ? err : undefined,
    );
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // handle the event
  if (stripeEvent.type === 'checkout.session.completed') {
    const completedCheckoutSession = stripeEvent.data.object;

    let email: string | null = null;
    let customerId: string | null = null;

    // handle cases where customer might be null (guest checkout)
    if (completedCheckoutSession.customer) {
      const customer = (await stripe.customers.retrieve(
        completedCheckoutSession.customer as string,
      )) as Stripe.Customer;
      email = customer.email;
      customerId = customer.id;
    } else if (completedCheckoutSession.customer_details?.email) {
      // use email from customer_details for guest checkouts
      email = completedCheckoutSession.customer_details.email;
    }

    // Handle guest checkout - create PendingTicket record
    const { isGuest } = completedCheckoutSession.metadata || {};

    if (isGuest === 'true' && email) {
      const metadata = completedCheckoutSession.metadata || {};

      try {
        // Create pending ticket record for guest to claim after signup
        await db.pendingTicket.create({
          data: {
            email,
            stripeSessionId: completedCheckoutSession.id,
            pcnNumber: metadata.pcnNumber || '',
            vehicleReg: metadata.vehicleReg || '',
            issuerType: metadata.issuerType || 'council',
            ticketStage: metadata.ticketStage || 'initial',
            tier: TicketTier.PREMIUM,
            challengeReason: metadata.challengeReason || null,
            tempImagePath: metadata.tempImagePath || null,
            initialAmount: metadata.initialAmount
              ? parseInt(metadata.initialAmount, 10)
              : null,
            issuer: metadata.issuer || null,
          },
        });

        log.info(
          `Created pending ticket for guest: ${email}, PCN: ${metadata.pcnNumber}`,
        );
      } catch (error) {
        // Check for unique constraint violation (duplicate session ID)
        if (
          error instanceof Error &&
          error.message.includes('Unique constraint failed')
        ) {
          log.info(
            `Pending ticket already exists for session: ${completedCheckoutSession.id}`,
          );
        } else {
          log.error(
            'Error creating pending ticket',
            undefined,
            error instanceof Error ? error : undefined,
          );
        }
      }
    }

    if (email) {
      // check for ticket-specific tier upgrades
      const { ticketId, tier } = completedCheckoutSession.metadata || {};

      if (ticketId && tier) {
        try {
          // retrieve the line items from the session
          const lineItems = await stripe.checkout.sessions.listLineItems(
            completedCheckoutSession.id,
            {
              limit: 5,
            },
          );

          // check if any line item matches our Premium price ID
          const isTierUpgrade = lineItems.data.some(
            (item) => item.price?.id && isOneTimePrice(item.price.id),
          );

          if (isTierUpgrade) {
            await db.ticket.update({
              where: { id: ticketId },
              data: { tier: TicketTier.PREMIUM },
            });

            // Update lastPremiumPurchaseAt for ad-free tracking
            await db.user.updateMany({
              where: { email },
              data: {
                lastPremiumPurchaseAt: new Date(),
                ...(customerId ? { stripeCustomerId: customerId } : {}),
              },
            });

            // Exit onboarding sequence on tier upgrade
            await exitOnboardingSequenceForTicket(
              ticketId,
              OnboardingExitReason.UPGRADED,
            ).catch((err) =>
              log.error(
                'Failed to exit onboarding on upgrade',
                undefined,
                err instanceof Error ? err : undefined,
              ),
            );

            // revalidate the specific ticket page and related routes
            revalidatePath(`/tickets/${ticketId}`);
            revalidatePath('/tickets');
            revalidatePath('/dashboard');

            // Process referral credit usage
            const discountAmount =
              completedCheckoutSession.total_details?.amount_discount;
            if (discountAmount && discountAmount > 0) {
              const session = await stripe.checkout.sessions.retrieve(
                completedCheckoutSession.id,
                { expand: ['discounts'] },
              );
              const discounts = session.discounts || [];
              const referralDiscounts = discounts
                .map((discount) => {
                  const couponId =
                    typeof discount.coupon === 'string'
                      ? discount.coupon
                      : discount.coupon?.id;
                  const couponMeta =
                    typeof discount.coupon === 'object'
                      ? discount.coupon?.metadata
                      : null;
                  return { couponId, couponMeta };
                })
                .filter(
                  ({ couponMeta }) =>
                    couponMeta?.type === 'referral_credit' && couponMeta.userId,
                );

              await Promise.all(
                referralDiscounts.map(async ({ couponId, couponMeta }) => {
                  await applyReferralCredits(
                    couponMeta!.userId,
                    parseInt(couponMeta!.amount, 10),
                  );
                  if (couponId) {
                    await deleteCouponAfterUse(couponId);
                  }
                }),
              );
            }
          }
        } catch (error) {
          log.error(
            'Error retrieving line items',
            undefined,
            error instanceof Error ? error : undefined,
          );
          // for test events, we might not be able to retrieve line items
          // so we'll update the ticket based on metadata alone
          if (ticketId && tier) {
            await db.ticket.update({
              where: { id: ticketId },
              data: { tier: TicketTier.PREMIUM },
            });

            // Update lastPremiumPurchaseAt for ad-free tracking
            await db.user.updateMany({
              where: { email },
              data: {
                lastPremiumPurchaseAt: new Date(),
                ...(customerId ? { stripeCustomerId: customerId } : {}),
              },
            });

            // Exit onboarding sequence on tier upgrade (fallback path)
            await exitOnboardingSequenceForTicket(
              ticketId,
              OnboardingExitReason.UPGRADED,
            ).catch((err) =>
              log.error(
                'Failed to exit onboarding on upgrade (fallback)',
                undefined,
                err instanceof Error ? err : undefined,
              ),
            );
          }
        }
      }
    } else {
      log.error('No customer email provided to complete the payment');
    }
  } else {
    log.warn(`Unhandled event type ${stripeEvent.type}`);
  }

  // return a 200 response to acknowledge receipt of the event
  return Response.json(
    {
      received: true,
    },
    {
      status: 200,
    },
  );
};
