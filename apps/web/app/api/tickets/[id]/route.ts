import { NextRequest } from 'next/server';
import {
  getTicket,
  deleteTicketById,
  updateTicket,
} from '@/app/actions/ticket';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'ticket-detail' });

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;

  if (!id) {
    return Response.json(
      { error: 'Ticket ID is required' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 400,
      },
    );
  }

  try {
    const ticket = await getTicket(id);

    if (!ticket) {
      return Response.json(
        { error: 'Ticket not found' },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': 'application/json',
          },
          status: 404,
        },
      );
    }

    return Response.json(
      { ticket },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    );
  } catch (error) {
    log.error(
      'Error fetching ticket',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return Response.json(
      { error: 'Failed to fetch ticket' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    );
  }
};

export const DELETE = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;

  if (!id) {
    return Response.json(
      { success: false, error: 'Ticket ID is required' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 400,
      },
    );
  }

  const userId = await getUserId('delete a ticket');

  if (!userId) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: 401,
      },
    );
  }

  // Use shared deleteTicketById function
  const result = await deleteTicketById(id, userId);

  if (!result.success) {
    let statusCode = 500;
    if (result.error === 'Ticket not found') {
      statusCode = 404;
    } else if (
      result.error === 'You are not authorized to delete this ticket'
    ) {
      statusCode = 403;
    }

    return Response.json(
      { success: false, error: result.error },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
        status: statusCode,
      },
    );
  }

  return Response.json(
    { success: true },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
      },
      status: 200,
    },
  );
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;

  if (!id) {
    return Response.json(
      { error: 'Ticket ID is required' },
      { headers: corsHeaders, status: 400 },
    );
  }

  const userId = await getUserId('update a ticket');

  if (!userId) {
    return Response.json(
      { error: 'Unauthorized' },
      { headers: corsHeaders, status: 401 },
    );
  }

  try {
    const body = await request.json();

    // Parse issuedAt string to Date if provided
    if (body.issuedAt && typeof body.issuedAt === 'string') {
      body.issuedAt = new Date(body.issuedAt);
    }

    const ticket = await updateTicket(id, body);

    if (!ticket) {
      return Response.json(
        { error: 'Failed to update ticket' },
        { headers: corsHeaders, status: 500 },
      );
    }

    return Response.json({ ticket }, { headers: corsHeaders, status: 200 });
  } catch (error) {
    log.error(
      'Error updating ticket',
      { ticketId: id },
      error instanceof Error ? error : undefined,
    );
    return Response.json(
      { error: 'Failed to update ticket' },
      { headers: corsHeaders, status: 500 },
    );
  }
};
