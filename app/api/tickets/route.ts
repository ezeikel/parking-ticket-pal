import { createTicket, getTickets } from '@/app/actions';

// longer duration to account for openai api calls
export const maxDuration = 30;

export const POST = async (req: Request) => {
  const data = await req.formData();

  await createTicket(data);

  return Response.json(
    { success: true },
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
