'use server';

import { headers } from 'next/headers';
import Stripe from 'stripe';
import { ProductType, TicketTier, UserRole } from '@prisma/client';
import { track } from '@/utils/analytics-server';
import { getTierPriceId, getSubscriptionPriceId } from '@/constants';
import { TRACKING_EVENTS } from '@/constants/events';
import { db } from '@/lib/prisma';
import stripe from '@/lib/stripe';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'stripe' });

const getUserRole = async () => {
  const userId = await getUserId('get user role');

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    return null;
  }

  return user.role;
};

export const createCheckoutSession = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _productType: ProductType,
): Promise<{
  id: string;
  // eslint-disable-next-line arrow-body-style
} | null> => {
  // TODO: reinstate this once pricing page ctas are refactored - using createTicketCheckoutSession directly for now
  return {
    id: 'no-id',
  };

  // let priceId;
  // let mode: 'payment' | 'subscription';

  // switch (productType) {
  //   case ProductType.PAY_PER_TICKET:
  //     priceId = process.env.PAY_PER_TICKET_STRIPE_PRICE_ID;
  //     mode = 'payment';
  //     break;
  //   case ProductType.PRO_MONTHLY:
  //     priceId = process.env.PRO_MONTHLY_STRIPE_PRICE_ID;
  //     mode = 'subscription';
  //     break;
  //   case ProductType.PRO_ANNUAL:
  //     priceId = process.env.PRO_ANNUAL_STRIPE_PRICE_ID;
  //     mode = 'subscription';
  //     break;
  //   default:
  //     throw new Error('Invalid product type');
  // }

  // const headersList = await headers();
  // const origin = headersList.get('origin');

  // const userId = await getUserId('create a checkout session');

  // if (!userId) {
  //   return null;
  // }

  // // get user information
  // const user = await db.user.findUnique({
  //   where: {
  //     id: userId,
  //   },
  //   select: {
  //     name: true,
  //     address: true,
  //     email: true,
  //     stripeCustomerId: true,
  //   },
  // });

  // if (!user) {
  //   console.error('User not found.');
  //   return null;
  // }

  // const stripeSession = await stripe.checkout.sessions.create({
  //   payment_method_types: ['card'],
  //   line_items: [
  //     {
  //       price: priceId,
  //       quantity: 1,
  //     },
  //   ],
  //   mode,
  //   success_url: `${origin}/account/billing/success`,
  //   cancel_url: `${origin}/account/billing`,
  //   client_reference_id: userId,

  //   // conditionally set customer parameters - use existing customer OR create new one
  //   ...(user.stripeCustomerId
  //     ? { customer: user.stripeCustomerId }
  //     : {
  //         customer_creation: 'always',
  //         customer_email: user.email,
  //       }),
  // });

  // await track(TRACKING_EVENTS.CHECKOUT_SESSION_CREATED, {
  //   productType,
  // });

  // return {
  //   id: stripeSession.id,
  // };
};

export const createCustomerPortalSession = async () => {
  const headersList = await headers();
  const origin = headersList.get('origin');

  const userId = await getUserId('create a customer portal session');

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    logger.error('No stripe customer id for this user', {
      userId
    });
    return null;
  }

  await track(TRACKING_EVENTS.CUSTOMER_PORTAL_CREATED, {
    userId,
    stripeCustomerId: user.stripeCustomerId,
  });

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/account/billing`,
  });

  return {
    url: portalSession.url,
  };
};

// eslint-disable-next-line arrow-body-style
export const getSubscriptionDetails = async () => {
  // TODO: reinstate this once we have subscription products in stripe
  return {
    type: null,
    productType: null,
  };

  // const userId = await getUserId('get subscription details');

  // if (!userId) {
  //   console.error('You need to be logged in to get subscription details.');
  //   return null;
  // }

  // const user = await db.user.findUnique({
  //   where: { id: userId },
  //   select: { stripeCustomerId: true },
  // });

  // const subscription = await db.subscription.findFirst({
  //   where: {
  //     user: {
  //       id: userId,
  //     },
  //   },
  // });

  // if (!user?.stripeCustomerId) {
  //   console.error('no stripe customer id');
  //   return null;
  // }

  // try {
  //   // Get subscription details from Stripe
  //   const stripeSubscription = await stripe.subscriptions.list({
  //     customer: user.stripeCustomerId,
  //     status: 'active',
  //     expand: ['data.items.data.price.product'],
  //   });

  //   if (stripeSubscription.data.length === 0) {
  //     return {
  //       type: subscription?.type,
  //       productType: null,
  //     };
  //   }

  //   // Get the product ID from the subscription
  //   const { product } = stripeSubscription.data[0].items.data[0].price;

  //   // Handle different possible types of the product field
  //   const productId = typeof product === 'string' ? product : product.id;

  //   // Determine product type based on product ID
  //   let productType = null;

  //   if (productId === process.env.PRO_MONTHLY_STRIPE_PRODUCT_ID) {
  //     productType = ProductType.PRO_MONTHLY;
  //   } else if (productId === process.env.PRO_ANNUAL_STRIPE_PRODUCT_ID) {
  //     productType = ProductType.PRO_ANNUAL;
  //   }

  //   return {
  //     type: subscription?.type,
  //     productType,
  //   };
  // } catch (error) {
  //   console.error('Error fetching subscription details from Stripe:', error);
  //   return {
  //     type: subscription?.type,
  //     productType: null,
  //   };
  // }
};

export const createTicketCheckoutSession = async (
  tier: Omit<TicketTier, 'FREE'>,
  ticketId: string,
): Promise<{ url: string } | null> => {
  const userId = await getUserId('create a ticket checkout session');

  if (!userId) {
    return null;
  }

  // verify the ticket exists and belongs to the user
  const ticket = await db.ticket.findFirst({
    where: {
      id: ticketId,
      vehicle: {
        userId,
      },
    },
  });

  if (!ticket) {
    logger.error('Ticket not found or does not belong to user', {
      ticketId,
      userId
    });
    return null;
  }

  const headersList = await headers();
  const origin = headersList.get('origin');

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, address: true, email: true, stripeCustomerId: true },
  });

  if (!user) {
    logger.error('User not found', {
      userId
    });
    return null;
  }

  const priceId = getTierPriceId(tier);

  if (!priceId) {
    logger.error('No price ID configured for tier', {
      tier,
      userId
    });
    return null;
  }

  await track(TRACKING_EVENTS.CHECKOUT_SESSION_CREATED, {
    productType: ProductType.PAY_PER_TICKET,
    ticketId,
    tier: tier as TicketTier,
  });

  const sessionOptions: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${origin}/tickets/${ticketId}?success=true`,
    cancel_url: `${origin}/tickets/${ticketId}?cancelled=true`,
    client_reference_id: userId,

    // include ticket metadata
    metadata: {
      ticketId,
      tier: tier as TicketTier,
      userId,
    },

    // conditionally set customer parameters - use existing customer OR create new one
    ...(user.stripeCustomerId
      ? { customer: user.stripeCustomerId }
      : {
          customer_creation: 'always',
          customer_email: user.email,
        }),
  };

  const userRole = await getUserRole();

  if (userRole === UserRole.ADMIN && process.env.STRIPE_ADMIN_COUPON_ID) {
    sessionOptions.discounts = [
      {
        coupon: process.env.STRIPE_ADMIN_COUPON_ID,
      },
    ];
  }

  const stripeSession = await stripe.checkout.sessions.create(sessionOptions);

  return {
    url: stripeSession.url!,
  };
};

export const createSubscriptionCheckoutSession = async (
  subscriptionType: 'monthly' | 'annual',
): Promise<{ url: string } | null> => {
  const userId = await getUserId('create a subscription checkout session');

  if (!userId) {
    return null;
  }

  const headersList = await headers();
  const origin = headersList.get('origin');

  // Get user information
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, address: true, email: true, stripeCustomerId: true },
  });

  if (!user) {
    logger.error('User not found', {
      userId
    });
    return null;
  }

  const priceId = getSubscriptionPriceId(subscriptionType);
  if (!priceId) {
    logger.error('No price ID configured for subscription type', {
      subscriptionType,
      userId
    });
    return null;
  }

  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${origin}/account/billing/success`,
    cancel_url: `${origin}/account/billing`,
    client_reference_id: userId,

    // Include subscription metadata
    metadata: {
      subscriptionType,
      userId,
    },

    // conditionally set customer parameters - use existing customer OR create new one
    ...(user.stripeCustomerId
      ? { customer: user.stripeCustomerId }
      : {
          customer_creation: 'always',
          customer_email: user.email,
        }),
  });

  return {
    url: stripeSession.url!,
  };
};
