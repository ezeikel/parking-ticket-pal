/* eslint-disable import/prefer-default-export */

import { db } from '@parking-ticket-pal/db';
import { TicketTier } from '@parking-ticket-pal/db';
import { verifyPurchase } from '@/lib/revenuecat';
import { decrypt } from '@/app/lib/session';

/**
 * POST /api/iap/confirm-purchase
 *
 * Confirms a RevenueCat consumable purchase and upgrades the ticket tier.
 * Called by the mobile app after a successful purchase of standard_ticket or premium_ticket.
 */
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

    // Determine the target tier based on product ID
    let targetTier: TicketTier;

    if (productId.startsWith('standard_ticket')) {
      targetTier = TicketTier.STANDARD;
    } else if (productId.startsWith('premium_ticket')) {
      targetTier = TicketTier.PREMIUM;
    } else {
      return Response.json(
        {
          error:
            'Invalid product ID. Expected standard_ticket_* or premium_ticket_*',
        },
        { status: 400 },
      );
    }

    // Check if ticket already has equal or higher tier
    const tierHierarchy = {
      [TicketTier.FREE]: 0,
      [TicketTier.STANDARD]: 1,
      [TicketTier.PREMIUM]: 2,
    };

    if (tierHierarchy[ticket.tier] >= tierHierarchy[targetTier]) {
      return Response.json(
        {
          success: true,
          message: 'Ticket already has equal or higher tier',
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
      data: { tier: targetTier },
      include: {
        vehicle: true,
      },
    });

    return Response.json(
      {
        success: true,
        message: `Ticket upgraded to ${targetTier}`,
        ticket: {
          id: updatedTicket.id,
          tier: updatedTicket.tier,
          pcnNumber: updatedTicket.pcnNumber,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error confirming purchase:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
