import { NextRequest } from 'next/server';
import { TicketStatus, db } from '@parking-ticket-pal/db';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'ticket-status-api' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const OPTIONS = () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: ticketId } = await params;

  if (!ticketId) {
    return Response.json(
      { success: false, error: 'Ticket ID is required' },
      { status: 400, headers: corsHeaders },
    );
  }

  const userId = await getUserId('update ticket status');

  if (!userId) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: corsHeaders },
    );
  }

  try {
    const body = await request.json();
    const { status } = body as { status: TicketStatus };

    if (!status) {
      return Response.json(
        { success: false, error: 'Status is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Verify ticket belongs to user
    const ticket = await db.ticket.findFirst({
      where: {
        id: ticketId,
        vehicle: { userId },
      },
    });

    if (!ticket) {
      return Response.json(
        { success: false, error: 'Ticket not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    await db.ticket.update({
      where: { id: ticketId },
      data: { status },
    });

    return Response.json(
      { success: true },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    log.error(
      'Error updating ticket status via API',
      { ticketId, userId },
      error instanceof Error ? error : new Error(String(error)),
    );
    return Response.json(
      { success: false, error: 'Failed to update ticket status' },
      { status: 500, headers: corsHeaders },
    );
  }
};
