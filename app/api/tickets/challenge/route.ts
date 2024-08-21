/* eslint-disable import/prefer-default-export */

import { generateChallengeLetter } from '@/app/actions';

// longer duration to account for openai api calls
export const maxDuration = 30;

export const POST = async (request: Request) => {
  const { ticketId } = await request.json();

  await generateChallengeLetter(ticketId);

  return Response.json(
    { success: true },
    {
      status: 200,
    },
  );
};
