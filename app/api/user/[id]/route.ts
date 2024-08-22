/* eslint-disable import/prefer-default-export */

import prisma from '@/lib/prisma';

// longer duration to account for openai api calls
export const maxDuration = 30;

export const GET = async (
  req: Request,
  { params }: { params: { id: string } },
) => {
  const { id } = params;

  const user = await prisma.user.findUnique({
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
