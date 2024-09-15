/* eslint-disable import/prefer-default-export */
import { Ticket } from '@prisma/client';
import { Page } from 'playwright';

export const issuers = {
  lewisham: {
    name: 'Lewisham Council',
    url: 'https://pcnevidence.lewisham.gov.uk/pcnonline/index.php',
    verifyPcnNumber: async (
      page: Page,
      pcnNumber: string,
      ticket: Partial<Ticket> & { vehicle: { vrm: string } },
    ) => {
      // go to the issuer's website
      await page.goto(issuers.lewisham.url);

      // fill in the ticket number
      await page.fill('#pcn-ref', pcnNumber);

      // fill in the vehicle registration
      await page.fill('#vehicle-registration-mark', ticket.vehicle.vrm);

      // click the submit button
      await page.click('#ticket-submit');

      // TODO: check for errors with registration mark and ticket number too
      await page.waitForURL('**/step2.php');

      // check if we are on the ticket details page
      await page.waitForSelector(
        'h1:has-text("Penalty Charge Notice details")',
      );

      // if we reach this point, the ticket is valid
      return true;
    },
  },
};

// function to map issuer names using regex for flexible matching
export const getIssuerKey = (issuerName: string): string | undefined => {
  const regexMapping: Record<string, RegExp> = {
    lewisham: /lewisham/i,
    horizon: /horizon parking/i,
    tfl: /(tfl|transport for london)/i,
  };

  // eslint-disable-next-line no-restricted-syntax
  for (const [key, regex] of Object.entries(regexMapping)) {
    if (regex.test(issuerName)) {
      return key;
    }
  }

  return undefined;
};
