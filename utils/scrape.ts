/* eslint-disable import/prefer-default-export */
import { put } from '@vercel/blob';
import { Ticket } from '@prisma/client';
import { Page } from 'playwright';

type VerifyPcnNumberArgs = {
  page: Page;
  pcnNumber: string;
  ticket: Partial<Ticket> & { vehicle: { vrm: string; userId: string } };
};

const takeScreenShot = async (
  page: Page,
  pcnNumber: string,
  userId: string,
  name?: string,
) => {
  const buffer = await page.screenshot();
  // save the page screenshot to blob storage
  await put(
    `uploads/users/${userId}/${pcnNumber}/screenshots/${name || `${new Date().toISOString()}-screenshot`}.png`,
    buffer,
    {
      access: 'public',
      contentType: 'image/png', // assuming png format (react-native-document-scanner-plugin uses png)
    },
  );
};

export const ISSUERS = {
  lewisham: {
    name: 'Lewisham Council',
    url: 'https://pcnevidence.lewisham.gov.uk/pcnonline/index.php',
    verifyPcnNumber: async ({
      page,
      pcnNumber,
      ticket,
    }: VerifyPcnNumberArgs) => {
      // go to the issuer's website
      await page.goto(ISSUERS.lewisham.url);

      // fill in the ticket number
      await page.fill('#pcn-ref', pcnNumber);

      // fill in the vehicle registration
      await page.fill('#vehicle-registration-mark', ticket.vehicle.vrm);

      // click the submit button
      await page.click('#ticket-submit');

      // TODO: check for errors with registration mark and ticket number too
      await page.waitForURL('**/step2.php');
      await page.waitForURL('**/#viewPCN/**');

      // check if we are on the ticket details page
      await page.waitForSelector(
        'h1:has-text("Penalty Charge Notice details")',
      );

      await takeScreenShot(page, pcnNumber, ticket.vehicle.userId);

      // if we reach this point, the ticket is valid
      return true;
    },
  },
  horizon: {
    name: 'Horizon Parking',
    url: 'https://horizonparkingportal.co.uk/#manage',
    verifyPcnNumber: async ({
      page,
      pcnNumber,
      ticket,
    }: VerifyPcnNumberArgs) => {
      // go to the issuer's website
      await page.goto(ISSUERS.horizon.url);

      // fill in the ticket number
      await page.fill('#pcn_reference', pcnNumber);

      // fill in the vehicle registration
      await page.fill('#plate', ticket.vehicle.vrm);

      // get past the recaptcha
      await page.solveRecaptchas();

      // click the submit button
      await page.click('#view');

      await page.waitForURL('**/#viewPCN/**');

      // check if we are on the ticket details page
      await page.waitForSelector('h2:has-text("View your PCN")');

      await takeScreenShot(page, pcnNumber, ticket.vehicle.userId);

      await page.screenshot({ path: 'stealth.png', fullPage: true });

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
