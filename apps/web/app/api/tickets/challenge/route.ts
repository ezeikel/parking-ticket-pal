import { challengeTicket } from '@/app/actions/ticket';

// longer duration to account for openai api calls
export const maxDuration = 30;

// TODO: Add authentication check — this endpoint currently has no auth guard.
// Validate the user's session and verify ticket ownership before challenging.
export const POST = async (req: Request) => {
  const { pcnNumber, challengeReason, additionalDetails } = await req.json();

  await challengeTicket(pcnNumber, challengeReason, additionalDetails);

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
