'use server';

import { headers } from 'next/headers';
import Stripe from 'stripe';
import { ProductType, TicketTier, UserRole } from '@parking-ticket-pal/db';
import { track } from '@/utils/analytics-server';
import { getTierPriceId, getConsumerSubscriptionPriceId } from '@/constants';
import { TRACKING_EVENTS } from '@/constants/events';
import { db } from '@parking-ticket-pal/db';
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
  url?: string;
} | null> => {
  // TODO: reinstate this once pricing page ctas are refactored - using createTicketCheckoutSession directly for now
  return {
    id: 'no-id',
    url: undefined,
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
      userId,
    });
    return null;
  }

  await track(TRACKING_EVENTS.CUSTOMER_PORTAL_CREATED, {
    userId,
    stripeCustomerId: user.stripeCustomerId,
  });

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/account?tab=billing`,
  });

  return {
    url: portalSession.url,
  };
};

export type PaymentMethodData = {
  id: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

export const getPaymentMethods = async (): Promise<PaymentMethodData[]> => {
  const userId = await getUserId('get payment methods');

  if (!userId) {
    return [];
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return [];
  }

  try {
    // Get the customer to find their default payment method
    const customer = await stripe.customers.retrieve(user.stripeCustomerId);
    const defaultPaymentMethodId =
      typeof customer !== 'string' && !customer.deleted
        ? (customer.invoice_settings?.default_payment_method as string | null)
        : null;

    // List all payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    return paymentMethods.data.map((pm) => ({
      id: pm.id,
      last4: pm.card?.last4 || '',
      brand: pm.card?.brand || '',
      expMonth: pm.card?.exp_month || 0,
      expYear: pm.card?.exp_year || 0,
      isDefault: pm.id === defaultPaymentMethodId,
    }));
  } catch (error) {
    logger.error('Error fetching payment methods', { userId, error });
    return [];
  }
};

export type InvoiceData = {
  id: string;
  date: string;
  description: string;
  amount: number; // in pence
  status: 'paid' | 'open' | 'draft' | 'uncollectible' | 'void';
  invoiceUrl: string | null;
  pdfUrl: string | null;
};

export const getInvoices = async (): Promise<InvoiceData[]> => {
  const userId = await getUserId('get invoices');

  if (!userId) {
    return [];
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return [];
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 24, // Last 2 years of monthly invoices
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      date: new Date((invoice.created || 0) * 1000).toISOString(),
      description: invoice.lines.data[0]?.description || 'Subscription',
      amount: invoice.amount_paid || 0,
      status: invoice.status as InvoiceData['status'],
      invoiceUrl: invoice.hosted_invoice_url || null,
      pdfUrl: invoice.invoice_pdf || null,
    }));
  } catch (error) {
    logger.error('Error fetching invoices', { userId, error });
    return [];
  }
};

export type SubscriptionData = {
  id: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: {
    name: string;
    amount: number; // in pence
    interval: 'month' | 'year';
  };
} | null;

export const getActiveSubscription = async (): Promise<SubscriptionData> => {
  const userId = await getUserId('get active subscription');

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return null;
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      expand: ['data.items.data.price.product'],
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return null;
    }

    const subscription = subscriptions.data[0];
    const price = subscription.items.data[0]?.price;
    const product = price?.product;
    const productName =
      typeof product === 'object' && product !== null && 'name' in product
        ? product.name
        : 'Subscription';

    // Access subscription properties - use type assertion for snake_case properties
    // that may not be in the TypeScript definitions for this API version
    const sub = subscription as unknown as {
      id: string;
      status: string;
      current_period_end: number;
      cancel_at_period_end: boolean;
    };

    return {
      id: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      plan: {
        name: productName,
        amount: price?.unit_amount || 0,
        interval: (price?.recurring?.interval as 'month' | 'year') || 'month',
      },
    };
  } catch (error) {
    logger.error('Error fetching subscription', { userId, error });
    return null;
  }
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
      userId,
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
      userId,
    });
    return null;
  }

  const priceId = getTierPriceId(tier);

  if (!priceId) {
    logger.error('No price ID configured for tier', {
      tier,
      userId,
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

export type GuestTicketCheckoutData = {
  pcnNumber: string;
  vehicleReg: string;
  issuerType: 'council' | 'private' | null;
  ticketStage: 'initial' | 'nto' | 'rejection' | 'charge_cert' | null;
  challengeReason: string | null;
  tier: 'standard' | 'premium' | 'subscription';
  imageUrl?: string;
  tempImagePath?: string;
  initialAmount?: number;
  issuer?: string;
  createdAt: string;
  // Optional email for pre-filling Stripe checkout and claim page
  email?: string;
};

export const createGuestCheckoutSession = async (
  tier: 'STANDARD' | 'PREMIUM',
  guestData: GuestTicketCheckoutData,
): Promise<{ url: string } | null> => {
  const headersList = await headers();
  const origin = headersList.get('origin');

  const priceId = getTierPriceId(tier);

  if (!priceId) {
    logger.error('No price ID configured for tier', {
      tier,
    });
    return null;
  }

  await track(TRACKING_EVENTS.CHECKOUT_SESSION_CREATED, {
    productType: ProductType.PAY_PER_TICKET,
    tier: tier as TicketTier,
  });

  // Store guest data in metadata (Stripe has 500 char limit per value)
  const sessionOptions: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'payment',
    // After success, redirect to claim page where user will sign up
    success_url: `${origin}/guest/claim?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?cancelled=true`,

    // Collect email for guest - pre-fill if available from wizard
    customer_creation: 'always',
    ...(guestData.email && { customer_email: guestData.email }),

    // Store ticket data in metadata
    metadata: {
      isGuest: 'true',
      tier,
      pcnNumber: guestData.pcnNumber,
      vehicleReg: guestData.vehicleReg,
      issuerType: guestData.issuerType || '',
      ticketStage: guestData.ticketStage || '',
      challengeReason: guestData.challengeReason || '',
      tempImagePath: guestData.tempImagePath || '',
      initialAmount: guestData.initialAmount?.toString() || '',
      issuer: guestData.issuer || '',
    },
  };

  const stripeSession = await stripe.checkout.sessions.create(sessionOptions);

  return {
    url: stripeSession.url!,
  };
};

export const createSubscriptionCheckoutSession = async (
  tier: 'standard' | 'premium',
  period: 'monthly' | 'yearly',
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
      userId,
    });
    return null;
  }

  const priceId = getConsumerSubscriptionPriceId(tier, period);
  if (!priceId) {
    logger.error('No price ID configured for subscription', {
      tier,
      period,
      userId,
    });
    return null;
  }

  // For subscription mode, we need to ensure customer exists
  let customerId = user.stripeCustomerId;

  if (!customerId) {
    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId,
      },
    });

    customerId = customer.id;

    // Save the Stripe customer ID to the database
    await db.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const sessionOptions: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${origin}/account/billing/success`,
    cancel_url: `${origin}/account?tab=billing`,
    client_reference_id: userId,
    customer: customerId,

    // Include subscription metadata
    metadata: {
      tier,
      period,
      userId,
    },
  };

  // Apply admin coupon for free subscriptions if user is ADMIN
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
