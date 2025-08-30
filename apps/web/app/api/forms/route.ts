import { db } from '@/lib/prisma';
import { auth } from '@/auth';

export const GET = async () => {
  try {
    // Get user from auth
    const session = await auth();
    if (!session?.user) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Get all forms for the user
    const forms = await db.form.findMany({
      where: {
        ticket: {
          vehicle: {
            userId: session.user.id,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        ticket: {
          select: {
            pcnNumber: true,
          },
        },
      },
    });

    return Response.json(
      { success: true, forms },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      },
    );
  } catch (error) {
    console.error('Error getting forms:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// Handle OPTIONS requests for CORS preflight
export const OPTIONS = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
