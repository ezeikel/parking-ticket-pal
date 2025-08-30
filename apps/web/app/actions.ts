'use server';

import { revalidatePath } from 'next/cache';
import { MediaType, MediaSource } from '@prisma/client';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import { db } from '@/lib/prisma';
import { getUserId } from '@/utils/user';

chromium.use(
  RecaptchaPlugin({
    provider: {
      id: '2captcha',
      token: process.env.TWO_CAPTCHA_API_KEY,
    },
    // TODO: only set to true if running on localhost
    visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
  }),
);

chromium.use(stealth());

export const getSubscription = async () => {
  const userId = await getUserId('get the subscription');

  if (!userId) {
    console.error('You need to be logged in to get the subscription.');

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
  const ticketWithMedia = await db.ticket.findUnique({
    where: {
      pcnNumber,
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
    console.error('Ticket not found.');
    return null;
  }

  return ticketWithMedia.media.map((m) => m.url);
};

export const refresh = async (path = '/') => revalidatePath(path);
