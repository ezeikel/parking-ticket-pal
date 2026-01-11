import { Page } from 'playwright';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import { Ticket } from '@parking-ticket-pal/db/types';
import { Address } from '@parking-ticket-pal/types';
import { STORAGE_PATHS } from '@/constants';
import { put, list } from '@/lib/storage';

// Configure browser plugins for stealth and reCAPTCHA solving
// TODO: Migrate from playwright-extra + puppeteer plugins to pure Playwright solution
// when a native Playwright stealth/anti-detection library becomes available.
// Current approach uses puppeteer-extra-plugin-stealth which has complex dependencies
// that cause module resolution issues in serverless environments (Vercel).
// Requirements for migration:
// - Anti-bot detection bypass (equivalent to puppeteer-extra-plugin-stealth)
// - reCAPTCHA solving integration (currently using 2captcha via puppeteer-extra-plugin-recaptcha)
chromium.use(
  RecaptchaPlugin({
    provider: {
      id: '2captcha',
      token: process.env.TWO_CAPTCHA_API_KEY,
    },
    visualFeedback: true,
  }),
);
chromium.use(stealth());

export type CommonPcnArgs = {
  page: Page;
  pcnNumber: string;
  ticket: Partial<Ticket> & {
    id: string;
    vehicle: {
      registrationNumber: string;
      make: string;
      model: string;
      user: {
        id: string;
        name: string;
        email: string;
        address: Address;
      };
    };
  };
};

export type ChallengeArgs = CommonPcnArgs & {
  challengeReason: string;
  additionalDetails?: string;
};

export const setupBrowser = async () => {
  const browser = await chromium.launch({
    headless: false,
  });
  const page = await browser.newPage();

  // large viewport to simulate fullscreen
  await page.setViewportSize({ width: 1920, height: 1080 });

  return { browser, page };
};

type TakeScreenShotArgs = {
  page: Page;
  ticketId: string;
  fullPage?: boolean;
};

export const takeScreenShot = async ({
  page,
  ticketId,
  fullPage = true,
}: TakeScreenShotArgs) => {
  const buffer = await page.screenshot({ fullPage });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // New path: automation/{ticketId}/screenshot-{timestamp}.png
  const storagePath = STORAGE_PATHS.AUTOMATION_SCREENSHOT
    .replace('%s', ticketId)
    .replace('%s', timestamp);

  await put(storagePath, buffer, {
    contentType: 'image/png',
  });
};

type UploadEvidenceArgs = {
  page: Page;
  ticketId: string;
  imageSources: string[];
};

export const uploadEvidence = async ({
  page,
  ticketId,
  imageSources,
}: UploadEvidenceArgs) => {
  // check if evidence folder exists by trying to list files with the evidence prefix
  // New path pattern: tickets/{ticketId}/evidence/
  const evidencePath = `tickets/${ticketId}/evidence/`;

  const existingEvidence = await list({ prefix: evidencePath });

  // if evidence already exists, skip uploading
  if (existingEvidence.blobs && existingEvidence.blobs.length > 0) {
    console.log('Evidence folder already exists, skipping upload');
    return true;
  }

  const uploadPromises = imageSources.map(async (src, i) => {
    try {
      const imageResponse = await page.request.get(src);
      const imageBuffer = await imageResponse.body();

      // New path: tickets/{ticketId}/evidence/{evidenceId}.jpg
      const evidenceId = crypto.randomUUID();
      const storagePath = STORAGE_PATHS.TICKET_EVIDENCE
        .replace('%s', ticketId)
        .replace('%s', evidenceId)
        .replace('%s', 'jpg');

      await put(storagePath, imageBuffer, {
        contentType: 'image/jpeg',
      });
    } catch (error) {
      console.error(`Failed to process evidence image ${i + 1}:`, error);
    }
  });

  await Promise.all(uploadPromises);
  return imageSources.length > 0;
};
