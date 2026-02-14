/* eslint-disable import-x/prefer-default-export */
import {
  db,
  SubscriptionType,
  SubscriptionSource,
} from '@parking-ticket-pal/db';
import { revalidatePath } from 'next/cache';
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
 * Map product ID to subscription type
 * Handles versioned product IDs with durations (e.g., standard_sub_monthly_v1, premium_sub_yearly_v2)
 */
function getSubscriptionTypeFromProductId(
  productId: string,
): SubscriptionType | null {
  if (productId.startsWith('standard_sub')) {
    return SubscriptionType.STANDARD;
  }
  if (productId.startsWith('premium_sub')) {
    return SubscriptionType.PREMIUM;
  }
  return null;
}

/**
 * POST /api/webhooks/revenuecat
 *
 * Handles RevenueCat webhook events for subscriptions and purchases.
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
      include: { subscription: true },
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
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
      case 'PRODUCT_CHANGE': {
        const subscriptionType = getSubscriptionTypeFromProductId(
          event.product_id,
        );

        if (subscriptionType) {
          // This is a subscription purchase/renewal
          await db.subscription.upsert({
            where: { userId },
            create: {
              userId,
              type: subscriptionType,
              source: SubscriptionSource.REVENUECAT,
              revenueCatSubscriptionId: event.original_transaction_id,
            },
            update: {
              type: subscriptionType,
              source: SubscriptionSource.REVENUECAT,
              revenueCatSubscriptionId: event.original_transaction_id,
            },
          });

          log.info(
            `Subscription updated: ${subscriptionType} for user ${userId}`,
          );

          // Revalidate relevant paths
          revalidatePath('/dashboard');
          revalidatePath('/tickets');
          revalidatePath('/account/billing');
        }
        break;
      }

      case 'CANCELLATION':
      case 'EXPIRATION': {
        // Remove the subscription
        if (
          user.subscription &&
          user.subscription.source === SubscriptionSource.REVENUECAT
        ) {
          await db.subscription.delete({
            where: { userId },
          });

          log.info(`Subscription removed for user ${userId}`);

          // Revalidate relevant paths
          revalidatePath('/dashboard');
          revalidatePath('/tickets');
          revalidatePath('/account/billing');
        }
        break;
      }

      case 'NON_RENEWING_PURCHASE': {
        // This is a consumable purchase (e.g., standard_ticket_v1 or premium_ticket_v1)
        // The mobile app should handle this via /api/iap/confirm-purchase
        // We just log it here for tracking
        log.info(
          `Non-renewing purchase: ${event.product_id} for user ${userId}`,
        );
        break;
      }

      case 'BILLING_ISSUE': {
        // Handle billing issues - could send notification to user
        log.warn(`Billing issue for user ${userId}`);
        break;
      }

      case 'SUBSCRIPTION_PAUSED': {
        // Handle subscription pause - keep subscription but mark as paused
        log.info(`Subscription paused for user ${userId}`);
        break;
      }

      default:
        log.warn(`Unhandled event type: ${event.type}`);
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
