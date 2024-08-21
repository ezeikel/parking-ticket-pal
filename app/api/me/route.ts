/* eslint-disable import/prefer-default-export */

import prisma from '@/lib/prisma';

// longer duration to account for openai api calls
export const maxDuration = 30;

export const GET = async (
  request: Request & {
    id?: string;
  },
) => {
  const userId = request.headers.get('x-user-id');

  const user = await prisma.user.findUnique({
    where: {
      id: userId as string,
    },
  });

  return Response.json(
    { user },
    {
      status: 200,
    },
  );
};
