import { findIssuer, isAutomationSupported } from '@/constants/index';
import { db } from '@/lib/prisma';
import { lewisham, horizon } from './issuers';
import { CommonPcnArgs, setupBrowser } from './shared';

const CHALLENGE_FUNCTIONS = {
  lewisham: lewisham.challenge,
  horizon: horizon.challenge,
};

type IssuerId = keyof typeof CHALLENGE_FUNCTIONS;

type ChallengeResult = {
  success: boolean;
  challengeText?: string;
};

const challenge = async (
  pcnNumber: string,
  challengeReason: string,
  additionalDetails?: string,
): Promise<ChallengeResult> => {
  const ticket = await db.ticket.findFirst({
    where: { pcnNumber },
    select: {
      id: true,
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
    return { success: false };
  }

  const issuer = findIssuer(ticket.issuer);

  if (!issuer || !isAutomationSupported(issuer.id)) {
    console.error('Automation not supported for this issuer.');
    return { success: false };
  }

  const challengeFunction = CHALLENGE_FUNCTIONS[issuer.id as IssuerId];

  if (!challengeFunction) {
    console.error('Challenge function not implemented for this issuer.');
    return { success: false };
  }

  const { browser, page } = await setupBrowser();

  try {
    const result = await challengeFunction({
      page,
      pcnNumber,
      // TODO: fix this type cast
      ticket: ticket as unknown as CommonPcnArgs['ticket'],
      challengeReason,
      additionalDetails,
    });

    return result;
  } catch (error) {
    console.error('Error challenging ticket:', error);
    return { success: false };
  } finally {
    await browser.close();
  }
};

export default challenge;
