import { findIssuer, isAutomationSupported } from '@/constants/index';
import { db } from '@parking-ticket-pal/db';
import { lewisham, horizon } from './issuers';
import { CommonPcnArgs, setupBrowser } from './shared';

const VERIFY_FUNCTIONS = {
  lewisham: lewisham.verify,
  horizon: horizon.verify,
};

type IssuerId = keyof typeof VERIFY_FUNCTIONS;

const verify = async (pcnNumber: string) => {
  const ticket = await db.ticket.findFirst({
    where: { pcnNumber },
    include: {
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

  const verifyFunction = VERIFY_FUNCTIONS[issuer.id as IssuerId];

  if (!verifyFunction) {
    console.error('Verification function not implemented for this issuer.');
    return false;
  }

  const { browser, page } = await setupBrowser();

  try {
    return await verifyFunction({
      page,
      pcnNumber,
      ticket: ticket as unknown as CommonPcnArgs['ticket'],
    });
  } catch (error) {
    console.error('Error verifying ticket:', error);
    return false;
  } finally {
    await browser.close();
  }
};

export default verify;
