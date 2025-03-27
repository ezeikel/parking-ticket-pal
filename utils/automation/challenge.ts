import { findIssuer, isAutomationSupported } from '@/constants/index';
import { db } from '@/lib/prisma';
import { ChallengeReasonId } from '@/types';
import { lewisham, horizon } from './issuers';
import { CommonPcnArgs, setupBrowser } from './shared';

const CHALLENGE_FUNCTIONS = {
  lewisham: lewisham.challenge,
  horizon: horizon.challenge,
};

type IssuerId = keyof typeof CHALLENGE_FUNCTIONS;

export default async (pcnNumber: string, reason: ChallengeReasonId) => {
  const ticket = await db.ticket.findFirst({
    where: { pcnNumber },
    select: {
      pcnNumber: true,
      issuer: true,
      contraventionCode: true,
      media: true,
      vehicle: {
        select: {
          registrationNumber: true,
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
    },
  });

  if (!ticket) {
    console.error('Ticket not found.');
    return false;
  }

  const issuer = findIssuer(ticket.issuer);

  if (!issuer || !isAutomationSupported(issuer.id)) {
    console.error('Automation not supported for this issuer.');
    return false;
  }

  const challengeFunction = CHALLENGE_FUNCTIONS[issuer.id as IssuerId];

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
