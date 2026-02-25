/* eslint-disable import-x/prefer-default-export */
import { db } from '@parking-ticket-pal/db';
import crypto from 'crypto';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'revenuecat-webhook' });

/**
 * RevenueCat Webhook Event Types
 * https://www.revenuecat.com/docs/webhooks
 */
type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'NON_RENEWING_PURCHASE'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE'
  | 'SUBSCRIBER_ALIAS'
  | 'SUBSCRIPTION_PAUSED'
  | 'SUBSCRIPTION_EXTENDED'
  | 'TRANSFER';

type RevenueCatWebhookEvent = {
  api_version: string;
  event: {
    type: RevenueCatEventType;
    app_user_id: string;
    original_app_user_id: string;
    aliases: string[];
    product_id: string;
    entitlement_id: string | null;
    entitlement_ids: string[];
    period_type: 'NORMAL' | 'TRIAL' | 'INTRO' | 'PROMOTIONAL';
    purchased_at_ms: number;
    expiration_at_ms: number | null;
    environment: 'SANDBOX' | 'PRODUCTION';
    presented_offering_id: string | null;
    store:
      | 'APP_STORE'
      | 'MAC_APP_STORE'
      | 'PLAY_STORE'
      | 'PROMOTIONAL'
      | 'STRIPE'
      | 'AMAZON';
    transaction_id: string;
    original_transaction_id: string;
    is_family_share: boolean;
    country_code: string;
    price: number;
    currency: string;
    price_in_purchased_currency: number;
    subscriber_attributes: Record<
      string,
      { value: string; updated_at_ms: number }
    >;
    takehome_percentage: number;
    offer_code: string | null;
    tax_percentage: number;
    commission_percentage: number;
    is_trial_conversion: boolean;
    id: string;
    app_id: string;
  };
};

/**
 * Verify RevenueCat webhook signature
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
): boolean {
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (!webhookSecret) {
    log.error('REVENUECAT_WEBHOOK_SECRET not set');
    return false;
  }

  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');

  return signature === expectedSignature;
}

/**
 * POST /api/webhooks/revenuecat
 *
 * Handles RevenueCat webhook events for one-time purchases.
 * Subscriptions are no longer supported — only per-ticket Premium purchases.
 */
export const POST = async (req: Request) => {
  try {
    // Get raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('x-revenuecat-signature');

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      log.error('Invalid RevenueCat webhook signature');
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Parse the event
    const webhookEvent: RevenueCatWebhookEvent = JSON.parse(body);
    const { event } = webhookEvent;

    log.info(
      `Event type: ${event.type}, User: ${event.app_user_id}, Product: ${event.product_id}`,
    );

    // Get the user ID (this should match User.id in our database)
    const userId = event.app_user_id;

    // Find the user in our database
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      log.error(`User not found: ${userId}`);
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Update RevenueCat customer ID if not set
    if (!user.revenueCatCustomerId) {
      await db.user.update({
        where: { id: userId },
        data: { revenueCatCustomerId: event.original_app_user_id },
      });
    }

    // Handle different event types
    switch (event.type) {
      case 'NON_RENEWING_PURCHASE': {
        // This is a consumable purchase (e.g., premium_ticket_v1)
        // The mobile app handles the actual ticket upgrade via /api/iap/confirm-purchase
        // Update lastPremiumPurchaseAt for ad-free tracking
        if (event.product_id.startsWith('premium_ticket')) {
          await db.user.update({
            where: { id: userId },
            data: { lastPremiumPurchaseAt: new Date() },
          });
          log.info(
            `Premium ticket purchase recorded for ad-free tracking: ${event.product_id} for user ${userId}`,
          );
        } else {
          log.info(
            `Non-renewing purchase: ${event.product_id} for user ${userId}`,
          );
        }
        break;
      }

      case 'BILLING_ISSUE': {
        log.warn(`Billing issue for user ${userId}`);
        break;
      }

      default:
        // Subscription events (INITIAL_PURCHASE, RENEWAL, CANCELLATION, etc.)
        // are no longer handled — no subscriptions in new pricing model
        log.info(`Ignoring event type: ${event.type} (subscriptions removed)`);
    }

    return Response.json({ received: true }, { status: 200 });
  } catch (error) {
    log.error(
      'Error processing webhook',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
