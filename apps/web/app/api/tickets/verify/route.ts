/* eslint-disable import/prefer-default-export */

import { verifyTicket } from '@/app/actions/ticket';

export const POST = async (req: Request) => {
  const { pcnNumber } = await req.json();

  const valid = await verifyTicket(pcnNumber);

  return Response.json(
    { valid },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
      },
      status: 200,
    },
  );
};
