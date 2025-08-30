import { headers } from 'next/headers';
import { auth } from '@/auth';
import { db } from '@/lib/prisma';
import { CurrentUser } from '@/types';

export const getUserId = async (action?: string) => {
  const session = await auth();
  const headersList = await headers();

  const userId = session?.user.dbId || headersList.get('x-user-id');

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
    },
  });

  return user;
};
