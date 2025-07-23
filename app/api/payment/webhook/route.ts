/* eslint-disable import/prefer-default-export */

import Stripe from 'stripe';
import { db } from '@/lib/prisma';
import { SubscriptionType, TicketTier } from '@prisma/client';
import {
  STRIPE_API_VERSION,
  isTierUpgradePrice,
  isSubscriptionPrice,
} from '@/constants';
import { revalidatePath } from 'next/cache';

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: STRIPE_API_VERSION,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const POST = async (req: Request) => {
  // get the raw body for signature verification
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('Missing Stripe signature header');
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
    console.error(
      `Webhook signature verification failed:`,
      (err as Error).message,
    );
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // handle the event
  if (stripeEvent.type === 'checkout.session.completed') {
    const completedCheckoutSession = stripeEvent.data
      .object as Stripe.Checkout.Session;

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

          // check if any line item matches our tier price IDs (one-time payments)
          const isTierUpgrade = lineItems.data.some(
            (item) => item.price?.id && isTierUpgradePrice(item.price.id),
          );

          if (isTierUpgrade) {
            await db.ticket.update({
              where: { id: ticketId },
              data: { tier: tier as TicketTier },
            });

            // if this created a new customer, store the customer ID for future payments
            if (customerId) {
              await db.user.updateMany({
                where: {
                  email,
                },
                data: {
                  stripeCustomerId: customerId,
                },
              });
            }

            // revalidate the specific ticket page and related routes
            revalidatePath(`/tickets/${ticketId}`);
            revalidatePath('/tickets'); // in case ticket list shows tier info
            revalidatePath('/dashboard'); // if dashboard shows ticket info
          }
        } catch (error) {
          console.error('Error retrieving line items:', error);
          // for test events, we might not be able to retrieve line items
          // so we'll update the ticket based on metadata alone
          if (ticketId && tier) {
            await db.ticket.update({
              where: { id: ticketId },
              data: { tier: tier as TicketTier },
            });

            // if this created a new customer, store the customer ID for future payments
            if (customerId) {
              await db.user.updateMany({
                where: {
                  email,
                },
                data: {
                  stripeCustomerId: customerId,
                },
              });
            }
          }
        }
      }

      // handle subscription payments
      const { subscriptionType } = completedCheckoutSession.metadata || {};

      if (subscriptionType) {
        try {
          // retrieve the line items from the session
          const lineItems = await stripe.checkout.sessions.listLineItems(
            completedCheckoutSession.id,
            {
              limit: 5,
            },
          );

          // check if any line item matches our subscription price IDs
          const isSubscriptionPayment = lineItems.data.some(
            (item) => item.price?.id && isSubscriptionPrice(item.price.id),
          );

          if (isSubscriptionPayment) {
            // update user subscription
            await db.subscription.updateMany({
              where: {
                user: {
                  email,
                },
              },
              data: {
                type: SubscriptionType.PREMIUM,
              },
            });

            // update user's stripe customer ID
            if (customerId) {
              await db.user.updateMany({
                where: {
                  email,
                },
                data: {
                  stripeCustomerId: customerId,
                },
              });
            }

            // revalidate user-related routes
            revalidatePath('/dashboard');
            revalidatePath('/tickets');
            revalidatePath('/profile');
            revalidatePath('/billing');
          }
        } catch (error) {
          console.error('Error handling subscription payment:', error);
        }
      }
    } else {
      console.error(`No customer email provided to complete the payment`);
    }
  } else if (stripeEvent.type === 'customer.subscription.created') {
    const createdCustomerSubscription = stripeEvent.data
      .object as Stripe.Subscription;

    const { id, email } = (await stripe.customers.retrieve(
      createdCustomerSubscription.customer as string,
    )) as Stripe.Customer; // casting because of union type - https://github.com/stripe/stripe-node/issues/1032

    if (email) {
      // update user subscription
      await db.subscription.updateMany({
        where: {
          user: {
            email,
          },
        },
        data: {
          // TODO: is this still true?
          // will always be PREMIUM since this is a subscription payment
          type: SubscriptionType.PREMIUM,
        },
      });

      // update user's stripe customer ID
      await db.user.updateMany({
        where: {
          email,
        },
        data: {
          stripeCustomerId: createdCustomerSubscription.customer as string,
        },
      });

      // revalidate subscription-related routes
      revalidatePath('/dashboard');
      revalidatePath('/tickets');
      revalidatePath('/profile');
      revalidatePath('/billing');
    } else {
      console.error(
        `No customer email provided for ${id} to update Subscription to "SUBSCRIBED"`,
      );
    }
  } else if (stripeEvent.type === 'customer.subscription.updated') {
    // handle subscription updated event
    const updatedCustomerSubscription = stripeEvent.data
      .object as Stripe.Subscription;

    // update user subscription
    await db.subscription.updateMany({
      where: {
        user: {
          stripeCustomerId: updatedCustomerSubscription.customer as string,
        },
      },
      data: {
        // TODO: is this still true?
        // will always be PREMIUM since this is a subscription payment
        type: SubscriptionType.PREMIUM,
      },
    });

    // revalidate subscription-related routes
    revalidatePath('/dashboard');
    revalidatePath('/tickets');
    revalidatePath('/profile');
    revalidatePath('/billing');
  } else if (stripeEvent.type === 'customer.subscription.deleted') {
    const deletedCustomerSubscription = stripeEvent.data
      .object as Stripe.Subscription;

    // delete the subscription record when subscription is cancelled
    await db.subscription.deleteMany({
      where: {
        user: {
          stripeCustomerId: deletedCustomerSubscription.customer as string,
        },
      },
    });

    // revalidate subscription-related routes
    revalidatePath('/dashboard');
    revalidatePath('/tickets');
    revalidatePath('/profile');
    revalidatePath('/billing');
  } else {
    console.error(`Unhandled event type ${stripeEvent.type}`);
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
