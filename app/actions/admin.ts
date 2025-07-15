/* eslint-disable import/prefer-default-export */

'use server';

import { revalidatePath } from 'next/cache';
import { UserRole, TicketTier } from '@prisma/client';
import { db } from '@/lib/prisma';
import { getUserId } from '@/app/actions/user';

const getIsAdmin = async (): Promise<boolean> => {
  const userId = await getUserId('check if user is admin');

  if (!userId) {
    return false;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
    },
  });

  if (!user) {
    return false;
  }

  return user.role === UserRole.ADMIN;
};

export const forceUpgradeTicketTierAction = async (
  ticketId: string,
  newTier: TicketTier,
) => {
  const isAdmin = await getIsAdmin();

  if (!isAdmin) {
    return { success: false, error: 'Unauthorised: User is not an admin.' };
  }

  if (newTier === TicketTier.FREE) {
    return { success: false, error: 'Cannot downgrade to FREE.' };
  }

  try {
    console.log(
      `ADMIN ACTION: Forcing upgrade for ticket ${ticketId} to tier ${newTier}`,
    );

    await db.ticket.update({
      where: { id: ticketId },
      data: { tier: newTier },
    });

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath(`/admin/tickets/${ticketId}`);

    return {
      success: true,
      message: `Ticket successfully upgraded to ${newTier}.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: `Failed to upgrade ticket: ${message}` };
  }
};
