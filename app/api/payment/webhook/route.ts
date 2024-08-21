/* eslint-disable import/prefer-default-export */

import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { SubscriptionType } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: '2024-04-10',
});

export const POST = async (request: Request) => {
  const body = await request.json();
  // Only verify the event if you have an endpoint secret defined.
  // Otherwise use the basic event deserialized with JSON.parse
  // if (endpointSecret) {
  //   // Get the signature sent by Stripe
  //   const signature = req.headers["stripe-signature"];
  //   try {
  //     event = stripe.webhooks.constructEvent(
  //       req.body,
  //       signature,
  //       endpointSecret,
  //     );
  //   } catch (err) {
  //     console.log(`⚠️  Webhook signature verification failed.`, err.message);
  //     return res.sendStatus(400);
  //   }
  // }

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = body as Stripe.Event;
  } catch (error) {
    console.error(`Error parsing event body: ${error}`);

    return Response.json(
      {
        error: 'Bad request',
      },
      {
        status: 400,
      },
    );
  }

  // handle the event
  if (stripeEvent.type === 'checkout.session.completed') {
    const completedCheckoutSession = stripeEvent.data
      .object as Stripe.Checkout.Session;

    const { id, email } = (await stripe.customers.retrieve(
      completedCheckoutSession.customer as string,
    )) as Stripe.Customer; // casting because of union type - https://github.com/stripe/stripe-node/issues/1032

    if (email) {
      // retrieve the line items from the session
      const lineItems = await stripe.checkout.sessions.listLineItems(
        completedCheckoutSession.id,
        {
          limit: 5,
        },
      );

      // eslint-disable-next-line no-restricted-syntax
      for (const item of lineItems.data) {
        if (item.price?.id === process.env.PAY_PER_TICKET_STRIPE_PRICE_ID) {
          // update user subscription
          // eslint-disable-next-line no-await-in-loop
          await prisma.user.update({
            where: {
              email,
            },
            data: {
              // increment credits
              credits: {
                increment: item.quantity as number,
              },
            },
          });
        }
      }
    } else {
      console.error(
        `No customer email provided for ${id} to update credits balance`,
      );
    }
  } else if (stripeEvent.type === 'customer.subscription.created') {
    const createdCustomerSubscription = stripeEvent.data
      .object as Stripe.Subscription;

    const { id, email } = (await stripe.customers.retrieve(
      createdCustomerSubscription.customer as string,
    )) as Stripe.Customer; // casting because of union type - https://github.com/stripe/stripe-node/issues/1032

    if (email) {
      // update user subscription
      // TODO: had to use updateMany as email is not considered to be unique
      await prisma.subscription.updateMany({
        where: {
          user: {
            email,
          },
        },
        data: {
          stripeCustomerId: createdCustomerSubscription.customer as string,
          // will always be PRO since BASIC is the default
          type: SubscriptionType.PRO,
        },
      });
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

    await prisma.subscription.updateMany({
      where: {
        stripeCustomerId: updatedCustomerSubscription.customer as string,
      },
      data: {
        // will always be PRO since BASIC is the default
        type: SubscriptionType.PRO,
      },
    });
  } else if (stripeEvent.type === 'customer.subscription.deleted') {
    const deletedCustomerSubscription = stripeEvent.data
      .object as Stripe.Subscription;

    // reset user subscription to basic
    // TODO: had to use updateMany as stripeCustomerId is not considered to be unique
    await prisma.subscription.updateMany({
      where: {
        stripeCustomerId: deletedCustomerSubscription.customer as string,
      },
      data: {
        type: SubscriptionType.BASIC,
      },
    });
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
