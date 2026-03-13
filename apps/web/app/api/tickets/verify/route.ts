import { verifyTicket } from '@/app/actions/ticket';

export const maxDuration = 120;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const OPTIONS = () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const POST = async (req: Request) => {
  try {
    const { pcnNumber, ticketId } = await req.json();

    if (!pcnNumber && !ticketId) {
      return Response.json(
        { valid: false, error: 'pcnNumber or ticketId is required' },
        { headers: corsHeaders, status: 400 },
      );
    }

    const valid = await verifyTicket(pcnNumber, ticketId);

    return Response.json({ valid }, { headers: corsHeaders, status: 200 });
  } catch {
    return Response.json(
      { valid: false, error: 'Internal server error' },
      { headers: corsHeaders, status: 500 },
    );
  }
};
