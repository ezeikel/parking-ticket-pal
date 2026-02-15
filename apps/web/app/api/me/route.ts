import { db } from '@parking-ticket-pal/db';

// longer duration to account for openai api calls
export const maxDuration = 30;

export const GET = async (req: Request) => {
  const userId = req.headers.get('x-user-id');

  const user = await db.user.findUnique({
    where: {
      id: userId as string,
    },
  });

  return Response.json(
    { user, isLinked: !!user?.email },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type, Authorization, x-user-id, x-user-email',
        'Content-Type': 'application/json',
      },
      status: 200,
    },
  );
};
