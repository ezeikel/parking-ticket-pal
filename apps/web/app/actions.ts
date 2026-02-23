'use server';

import { revalidatePath } from 'next/cache';
import { MediaType, MediaSource, db } from '@parking-ticket-pal/db';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'actions' });

export const getSubscription = async () => {
  const userId = await getUserId('get the subscription');

  if (!userId) {
    logger.error('User needs to be logged in to get subscription');
    return null;
  }

  const subscription = await db.subscription.findFirst({
    where: {
      user: {
        id: userId,
      },
    },
  });

  return subscription;
};

export const getEvidenceImages = async ({
  pcnNumber,
}: {
  pcnNumber: string;
}) => {
  const userId = await getUserId('get evidence images');

  if (!userId) {
    return null;
  }

  const ticketWithMedia = await db.ticket.findFirst({
    where: {
      pcnNumber,
      vehicle: { userId },
    },
    select: {
      media: {
        where: {
          type: MediaType.IMAGE,
          source: MediaSource.ISSUER,
        },
      },
    },
  });

  if (!ticketWithMedia) {
    logger.error('Ticket not found for evidence images', {
      pcnNumber,
    });
    return null;
  }

  return ticketWithMedia.media.map((m) => m.url);
};

export const refresh = async (path = '/') => revalidatePath(path);
