'use server';

import { headers } from 'next/headers';
import { ProductType } from '@prisma/client';
import { db } from '@/lib/prisma';
import stripe from '@/lib/stripe';
import { getUserId } from './user';

export const createCheckoutSession = async (
  productType: ProductType,
): Promise<{
  id: string;
} | null> => {
  let priceId;
  let mode: 'payment' | 'subscription';

  switch (productType) {
    case ProductType.PAY_PER_TICKET:
      priceId = process.env.PAY_PER_TICKET_STRIPE_PRICE_ID;
      mode = 'payment';
      break;
    case ProductType.PRO_MONTHLY:
      priceId = process.env.PRO_MONTHLY_STRIPE_PRICE_ID;
      mode = 'subscription';
      break;
    case ProductType.PRO_ANNUAL:
      priceId = process.env.PRO_ANNUAL_STRIPE_PRICE_ID;
      mode = 'subscription';
      break;
    default:
      throw new Error('Invalid product type');
  }

  const headersList = await headers();
  const origin = headersList.get('origin');

  const userId = await getUserId('create a checkout session');

  if (!userId) {
    return null;
  }

  // get user information
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      name: true,
      address: true,
      email: true,
    },
  });

  if (!user) {
    console.error('User not found.');
    return null;
  }

  // TODO: findUnique instead of findFirst
  const subscription = await db.subscription.findFirst({
    where: {
      user: {
        id: userId,
      },
    },
  });

  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode,
    success_url: `${origin}/account/billing/success`,
    cancel_url: `${origin}/account/billing`,
    client_reference_id: userId,

    // send stripe customer id if user already exists in stripe
    customer: subscription?.stripeCustomerId ?? undefined,
    customer_email: subscription ? undefined : user.email,
  });

  return {
    id: stripeSession.id,
  };
};

export const createCustomerPortalSession = async () => {
  const headersList = await headers();
  const origin = headersList.get('origin');

  const userId = await getUserId('create a customer portal session');

  if (!userId) {
    return null;
  }

  const subscription = await db.subscription.findFirst({
    where: {
      user: {
        id: userId,
      },
    },
  });

  if (!subscription?.stripeCustomerId) {
    console.error('No subscription found for this user.');
    return null;
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${origin}/account/billing`,
  });

  return {
    url: portalSession.url,
  };
};

export const getSubscriptionDetails = async () => {
  const userId = await getUserId('get subscription details');

  if (!userId) {
    console.error('You need to be logged in to get subscription details.');
    return null;
  }

  const subscription = await db.subscription.findFirst({
    where: {
      user: {
        id: userId,
      },
    },
  });

  if (!subscription?.stripeCustomerId) {
    console.error('no stripe customer id');
    return null;
  }

  try {
    // Get subscription details from Stripe
    const stripeSubscription = await stripe.subscriptions.list({
      customer: subscription.stripeCustomerId,
      status: 'active',
      expand: ['data.items.data.price.product'],
    });

    if (stripeSubscription.data.length === 0) {
      return {
        type: subscription.type,
        productType: null,
      };
    }

    // Get the product ID from the subscription
    const { product } = stripeSubscription.data[0].items.data[0].price;

    // Handle different possible types of the product field
    const productId = typeof product === 'string' ? product : product.id;

    // Determine product type based on product ID
    let productType = null;
    if (productId === process.env.PRO_MONTHLY_STRIPE_PRODUCT_ID) {
      productType = ProductType.PRO_MONTHLY;
    } else if (productId === process.env.PRO_ANNUAL_STRIPE_PRODUCT_ID) {
      productType = ProductType.PRO_ANNUAL;
    }

    return {
      type: subscription.type,
      productType,
    };
  } catch (error) {
    console.error('Error fetching subscription details from Stripe:', error);
    return {
      type: subscription.type,
      productType: null,
    };
  }
};
