import { headers } from 'next/headers';
import { auth } from '@/auth';
import { db } from '@parking-ticket-pal/db';
import { CurrentUser } from '@/types';

export const getUserId = async (action?: string) => {
  const session = await auth();
  const headersList = await headers();

  console.log('session', session);

  const userId = session?.user.id || headersList.get('x-user-id');

  console.log('userId', userId);

  // TODO: create action constants
  if (action === 'get the current user') {
    return userId;
  }

  if (!userId) {
    console.error(
      `You need to be logged in to ${action || 'perform this action'}. `,
    );

    return null;
  }

  return userId;
};

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  const userId = await getUserId('get the current user');

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      address: true,
      phoneNumber: true,
      signatureUrl: true,
      stripeCustomerId: true,
    },
  });

  return user;
};
