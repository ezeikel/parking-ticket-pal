/* eslint-disable import/prefer-default-export */

import { getTickets } from '@/app/actions/ticket';

export async function GET() {
  const tickets = await getTickets();

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
}
