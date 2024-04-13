/* eslint-disable import/prefer-default-export */

import { NextRequest } from 'next/server';
import { generateChallengeLetter } from '@/app/actions';

// longer duration to account for openai api calls
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const { ticketId } = await request.json();

  await generateChallengeLetter(ticketId);

  return Response.json(
    { success: true },
    {
      status: 200,
    },
  );
}
