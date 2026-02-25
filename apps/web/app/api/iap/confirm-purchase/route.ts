import { db, TicketTier, OnboardingExitReason } from '@parking-ticket-pal/db';
import { verifyPurchase } from '@/lib/revenuecat';
import { decrypt } from '@/app/lib/session';
import { createServerLogger } from '@/lib/logger';
import { exitOnboardingSequenceForTicket } from '@/services/onboarding-sequence';

const log = createServerLogger({ action: 'iap-confirm-purchase' });

/**
 * POST /api/iap/confirm-purchase
 *
 * Confirms a RevenueCat consumable purchase and upgrades the ticket tier.
 * Called by the mobile app after a successful purchase of premium_ticket.
 */
// eslint-disable-next-line import-x/prefer-default-export
export const POST = async (req: Request) => {
  try {
    // Authenticate the user
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const session = await decrypt(token);

    if (!session || !session.id) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = session.id as string;

    // Parse request body
    const { ticketId, productId } = await req.json();

    if (!ticketId || !productId) {
      return Response.json(
        { error: 'Missing ticketId or productId' },
        { status: 400 },
      );
    }

    // Verify the ticket exists and belongs to the user
    const ticket = await db.ticket.findFirst({
      where: {
        id: ticketId,
        vehicle: {
          userId,
        },
      },
      include: {
        vehicle: true,
      },
    });

    if (!ticket) {
      return Response.json(
        { error: 'Ticket not found or does not belong to user' },
        { status: 404 },
      );
    }

    // Only Premium purchases are supported
    if (!productId.startsWith('premium_ticket')) {
      return Response.json(
        {
          error: 'Invalid product ID. Expected premium_ticket_*',
        },
        { status: 400 },
      );
    }

    // Check if ticket already has Premium tier
    if (ticket.tier === TicketTier.PREMIUM) {
      return Response.json(
        {
          success: true,
          message: 'Ticket already has Premium tier',
          ticket: {
            id: ticket.id,
            tier: ticket.tier,
          },
        },
        { status: 200 },
      );
    }

    // Verify the purchase with RevenueCat
    const isPurchaseValid = await verifyPurchase(userId, productId);

    if (!isPurchaseValid) {
      return Response.json(
        {
          error:
            'Purchase verification failed. Please try again or contact support.',
        },
        { status: 400 },
      );
    }

    // Update the ticket tier
    const updatedTicket = await db.ticket.update({
      where: { id: ticketId },
      data: { tier: TicketTier.PREMIUM },
      include: {
        vehicle: true,
      },
    });

    // Update lastPremiumPurchaseAt for ad-free tracking
    await db.user.update({
      where: { id: userId },
      data: { lastPremiumPurchaseAt: new Date() },
    });

    // Exit onboarding sequence on tier upgrade
    await exitOnboardingSequenceForTicket(
      ticketId,
      OnboardingExitReason.UPGRADED,
    ).catch((err) =>
      log.error(
        'Failed to exit onboarding on IAP upgrade',
        undefined,
        err instanceof Error ? err : undefined,
      ),
    );

    return Response.json(
      {
        success: true,
        message: `Ticket upgraded to PREMIUM`,
        ticket: {
          id: updatedTicket.id,
          tier: updatedTicket.tier,
          pcnNumber: updatedTicket.pcnNumber,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    log.error(
      'Error confirming purchase',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
