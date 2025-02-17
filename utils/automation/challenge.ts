import { findIssuer } from '@/constants';
import { db } from '@/lib/prisma';
import { ChallengeReasonId } from '@/types';
import { lewisham, horizon } from './issuers';
import { CommonPcnArgs, setupBrowser } from './shared';

const CHALLENGE_FUNCTIONS = {
  lewisham: lewisham.challenge,
  horizon: horizon.challenge,
};

export default async (pcnNumber: string, reason: ChallengeReasonId) => {
  const ticket = await db.ticket.findFirst({
    where: { pcnNumber },
    include: {
      vehicle: {
        select: {
          vrm: true,
          make: true,
          model: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              address: true,
              phoneNumber: true,
            },
          },
        },
      },
      contravention: true,
      media: true,
    },
  });

  console.log('ticket', ticket);

  if (!ticket) {
    console.error('Ticket not found.');
    return false;
  }

  const issuer = findIssuer(ticket.issuer);

  if (!issuer?.automationSupported) {
    console.error('Automation not supported for this issuer.');
    return false;
  }

  const challengeFunction = CHALLENGE_FUNCTIONS[issuer.id];

  if (!challengeFunction) {
    console.error('Challenge function not implemented for this issuer.');
    return false;
  }

  const { browser, page } = await setupBrowser();

  try {
    return await challengeFunction({
      page,
      pcnNumber,
      ticket: ticket as unknown as CommonPcnArgs['ticket'],
      reason,
    });
  } catch (error) {
    console.error('Error challenging ticket:', error);
    return false;
  } finally {
    await browser.close();
  }
};
