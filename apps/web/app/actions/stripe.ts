'use server';

import { headers } from 'next/headers';
import Stripe from 'stripe';
import { ProductType, TicketTier, UserRole, db } from '@parking-ticket-pal/db';
import { track } from '@/utils/analytics-server';
import { getPremiumPriceId } from '@/constants';
import { TRACKING_EVENTS } from '@/constants/events';
import stripe from '@/lib/stripe';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';
import { createReferralCoupon } from '@/lib/referral-stripe';

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
    user_id: userId,
    stripe_customer_id: user.stripeCustomerId,
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
      limit: 24,
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      date: new Date((invoice.created || 0) * 1000).toISOString(),
      description: invoice.lines.data[0]?.description || 'Payment',
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

export const createTicketCheckoutSession = async (
  _tier: unknown,
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

  const priceId = getPremiumPriceId();

  if (!priceId) {
    logger.error('No price ID configured for Premium tier', {
      userId,
    });
    return null;
  }

  await track(TRACKING_EVENTS.CHECKOUT_SESSION_CREATED, {
    product_type: ProductType.PAY_PER_TICKET,
    ticket_id: ticketId,
    tier: TicketTier.PREMIUM,
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
      tier: TicketTier.PREMIUM,
      userId,
    },

    // conditionally set customer parameters - use existing customer OR create new one
    ...(user.stripeCustomerId
      ? { customer: user.stripeCustomerId }
      : {
          customer_creation: 'always',
          customer_email: user.email || undefined,
        }),
  };

  const userRole = await getUserRole();

  if (userRole === UserRole.ADMIN && process.env.STRIPE_ADMIN_COUPON_ID) {
    sessionOptions.discounts = [
      {
        coupon: process.env.STRIPE_ADMIN_COUPON_ID,
      },
    ];
  } else {
    // Apply referral credit coupon if user has balance
    const referralCouponId = await createReferralCoupon(userId);
    if (referralCouponId) {
      sessionOptions.discounts = [{ coupon: referralCouponId }];
    }
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
  tier: 'premium';
  imageUrl?: string;
  tempImagePath?: string;
  initialAmount?: number;
  issuer?: string;
  createdAt: string;
  email?: string;
};

export const createGuestCheckoutSession = async (
  _tier: string,
  guestData: GuestTicketCheckoutData,
): Promise<{ url: string } | null> => {
  const headersList = await headers();
  const origin = headersList.get('origin');

  const priceId = getPremiumPriceId();

  if (!priceId) {
    logger.error('No price ID configured for Premium tier');
    return null;
  }

  await track(TRACKING_EVENTS.CHECKOUT_SESSION_CREATED, {
    product_type: ProductType.PAY_PER_TICKET,
    tier: TicketTier.PREMIUM,
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
      tier: 'PREMIUM',
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
