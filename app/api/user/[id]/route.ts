/* eslint-disable import/prefer-default-export */

import { db } from '@/lib/prisma';

// longer duration to account for openai api calls
export const maxDuration = 30;

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;

  const user = await db.user.findUnique({
    where: {
      id: id as string,
    },
  });

  return Response.json(
    { user },
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
