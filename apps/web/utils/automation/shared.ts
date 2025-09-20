import { Page } from 'playwright';
import { chromium } from 'playwright-extra';
import { Ticket } from '@prisma/client';
import { put, list } from '@vercel/blob';
import { Address } from '@parking-ticket-pal/types';
import { STORAGE_PATHS } from '@/constants';

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
  userId: string;
  ticketId: string;
  name?: string;
  fullPage?: boolean;
};

export const takeScreenShot = async ({
  page,
  userId,
  ticketId,
  name,
  fullPage = true,
}: TakeScreenShotArgs) => {
  const buffer = await page.screenshot({ fullPage });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotName = name || `${timestamp}-screenshot`;

  await put(
    STORAGE_PATHS.AUTOMATION_SCREENSHOT.replace('%s', userId)
      .replace('%s', ticketId)
      .replace('%s', screenshotName)
      .replace('%s', timestamp),
    buffer,
    {
      access: 'public',
      contentType: 'image/png',
    },
  );
};

type UploadEvidenceArgs = {
  page: Page;
  userId: string;
  ticketId: string;
  imageSources: string[];
};

export const uploadEvidence = async ({
  page,
  userId,
  ticketId,
  imageSources,
}: UploadEvidenceArgs) => {
  // check if evidence folder exists by trying to list blobs with the evidence prefix
  const evidencePath = STORAGE_PATHS.AUTOMATION_EVIDENCE.replace('%s', userId)
    .replace('%s', ticketId)
    .replace('%s', '1')
    .replace('/evidence-1.jpg', '/');

  const existingEvidence = await list({ prefix: evidencePath });

  // if evidence already exists, skip uploading
  if (existingEvidence.blobs.length > 0) {
    console.log('Evidence folder already exists, skipping upload');
    return true;
  }

  const uploadPromises = imageSources.map(async (src, i) => {
    try {
      const imageResponse = await page.request.get(src);
      const imageBuffer = await imageResponse.body();

      await put(
        STORAGE_PATHS.AUTOMATION_EVIDENCE.replace('%s', userId)
          .replace('%s', ticketId)
          .replace('%s', (i + 1).toString()),
        imageBuffer,
        {
          access: 'public',
          contentType: 'image/jpeg',
        },
      );
    } catch (error) {
      console.error(`Failed to process evidence image ${i + 1}:`, error);
    }
  });

  await Promise.all(uploadPromises);
  return imageSources.length > 0;
};
