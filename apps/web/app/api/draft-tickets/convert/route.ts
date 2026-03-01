import { db, TicketTier } from '@parking-ticket-pal/db';
import { decrypt } from '@/app/lib/session';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'draft-ticket-convert' });

/**
 * POST /api/draft-tickets/convert
 *
 * Applies a DraftTicket's PREMIUM tier to an existing ticket and deletes the draft.
 * Called after the wizard has already created the ticket normally.
 *
 * Body: { draftTicketId: string, ticketId: string }
 */
// eslint-disable-next-line import-x/prefer-default-export
export const POST = async (req: Request) => {
  try {
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

    const { draftTicketId, ticketId } = await req.json();

    if (!draftTicketId || !ticketId) {
      return Response.json(
        { error: 'Missing draftTicketId or ticketId' },
        { status: 400 },
      );
    }

    // Validate the DraftTicket exists and belongs to the user
    const draftTicket = await db.draftTicket.findFirst({
      where: { id: draftTicketId, userId },
    });

    if (!draftTicket) {
      return Response.json(
        { error: 'Draft ticket not found or does not belong to user' },
        { status: 404 },
      );
    }

    // Validate the ticket exists and belongs to the user
    const ticket = await db.ticket.findFirst({
      where: {
        id: ticketId,
        vehicle: { userId },
      },
    });

    if (!ticket) {
      return Response.json(
        { error: 'Ticket not found or does not belong to user' },
        { status: 404 },
      );
    }

    // Upgrade tier, delete draft, and update user atomically
    const [updatedTicket] = await db.$transaction([
      db.ticket.update({
        where: { id: ticketId },
        data: { tier: TicketTier.PREMIUM },
      }),
      db.draftTicket.delete({
        where: { id: draftTicketId },
      }),
      db.user.update({
        where: { id: userId },
        data: { lastPremiumPurchaseAt: new Date() },
      }),
    ]);

    log.info('DraftTicket converted to real ticket', {
      userId,
      draftTicketId,
      ticketId,
    });

    return Response.json(
      {
        success: true,
        ticket: {
          id: updatedTicket.id,
          tier: TicketTier.PREMIUM,
          pcnNumber: updatedTicket.pcnNumber,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    log.error(
      'Error converting draft ticket',
      undefined,
      error instanceof Error ? error : undefined,
    );

    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
