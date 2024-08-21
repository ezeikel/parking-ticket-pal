import { createTicket, getTickets } from '@/app/actions';

// longer duration to account for openai api calls
export const maxDuration = 30;

export const POST = async (request: Request) => {
  const data = await request.formData();

  await createTicket(data);

  return Response.json(
    { success: true },
    {
      status: 200,
    },
  );
};

export async function GET() {
  const tickets = await getTickets();

  return Response.json(
    { tickets },
    {
      status: 200,
    },
  );
}
