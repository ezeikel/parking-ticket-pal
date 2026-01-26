/* eslint-disable import/prefer-default-export */

import { getTickets } from '@/app/actions/ticket';
import { TicketStatus, IssuerType, TicketType } from '@parking-ticket-pal/db';

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const params = {
    search: searchParams.get('search') || undefined,
    status: (searchParams.getAll('status') as TicketStatus[]) || undefined,
    issuer: searchParams.getAll('issuer') || undefined,
    issuerType:
      (searchParams.getAll('issuerType') as IssuerType[]) || undefined,
    ticketType:
      (searchParams.getAll('ticketType') as TicketType[]) || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    amountMin: searchParams.get('amountMin')
      ? parseInt(searchParams.get('amountMin')!, 10)
      : undefined,
    amountMax: searchParams.get('amountMax')
      ? parseInt(searchParams.get('amountMax')!, 10)
      : undefined,
    verified: searchParams.get('verified')
      ? searchParams.get('verified') === 'true'
      : undefined,
    sortBy:
      (searchParams.get('sortBy') as
        | 'issuedAt'
        | 'initialAmount'
        | 'createdAt'
        | 'status'
        | 'issuer') || undefined,
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
  };

  const tickets = await getTickets(params);

  return Response.json(
    { tickets },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
      },
      status: 200,
    },
  );
};
