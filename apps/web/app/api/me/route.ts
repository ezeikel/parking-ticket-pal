import { db } from '@parking-ticket-pal/db';

// longer duration to account for openai api calls
export const maxDuration = 30;

// TODO: Restrict CORS — replace wildcard '*' origin with allowed domains (web app + mobile).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-user-id, x-user-email',
  'Content-Type': 'application/json',
};

export const GET = async (req: Request) => {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return Response.json(
      { user: null, isLinked: false },
      { headers: corsHeaders, status: 401 },
    );
  }

  const user = await db.user.findUnique({
    where: { id: userId },
  });

  return Response.json(
    { user, isLinked: !!user?.email },
    { headers: corsHeaders, status: 200 },
  );
};
