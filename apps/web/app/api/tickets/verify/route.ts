import { verifyTicket } from '@/app/actions/ticket';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const OPTIONS = () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const POST = async (req: Request) => {
  const { pcnNumber, ticketId } = await req.json();

  const valid = await verifyTicket(pcnNumber, ticketId);

  return Response.json({ valid }, { headers: corsHeaders, status: 200 });
};
