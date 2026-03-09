import { NextRequest } from 'next/server';
import { getTicketByPcnNumber } from '@/app/actions/ticket';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'ticket-lookup-api' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const OPTIONS = () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const GET = async (request: NextRequest) => {
  const pcnNumber = request.nextUrl.searchParams.get('pcnNumber');

  if (!pcnNumber) {
    return Response.json(
      { success: false, error: 'PCN number is required' },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const ticket = await getTicketByPcnNumber(pcnNumber);

    if (!ticket) {
      return Response.json(
        { success: true, ticket: null },
        { status: 200, headers: corsHeaders },
      );
    }

    return Response.json(
      { success: true, ticket },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    log.error(
      'Error looking up ticket by PCN',
      { pcnNumber },
      error instanceof Error ? error : new Error(String(error)),
    );
    return Response.json(
      { success: false, error: 'Failed to look up ticket' },
      { status: 500, headers: corsHeaders },
    );
  }
};
