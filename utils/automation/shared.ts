import { Page } from 'playwright';
import { chromium } from 'playwright-extra';
import { Ticket } from '@prisma/client';
import { put, list } from '@vercel/blob';
import { Address } from '@/types';

export type CommonPcnArgs = {
  page: Page;
  pcnNumber: string;
  ticket: Partial<Ticket> & {
    vehicle: {
      vrm: string;
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

export const setupBrowser = async () => {
  const browser = await chromium.launch({
    headless: false,
  });
  const page = await browser.newPage();
  return { browser, page };
};

export const takeScreenShot = async (
  page: Page,
  pcnNumber: string,
  userId: string,
  name?: string,
) => {
  const buffer = await page.screenshot();

  await put(
    `uploads/users/${userId}/${pcnNumber}/screenshots/${name || `${new Date().toISOString()}-screenshot`}.png`,
    buffer,
    {
      access: 'public',
      contentType: 'image/png',
    },
  );
};

export const uploadEvidence = async (
  page: Page,
  pcnNumber: string,
  userId: string,
  imageSources: string[],
) => {
  // Check if evidence folder exists by trying to list blobs with the evidence prefix
  const evidencePath = `uploads/users/${userId}/${pcnNumber}/evidence/`;
  const existingEvidence = await list({ prefix: evidencePath });

  // If evidence already exists, skip uploading
  if (existingEvidence.blobs.length > 0) {
    console.log('Evidence folder already exists, skipping upload');
    return true;
  }

  const uploadPromises = imageSources.map(async (src, i) => {
    try {
      const imageResponse = await page.request.get(src);
      const imageBuffer = await imageResponse.body();

      await put(`${evidencePath}evidence-${i + 1}.jpg`, imageBuffer, {
        access: 'public',
        contentType: 'image/jpeg',
      });
    } catch (error) {
      console.error(`Failed to process evidence image ${i + 1}:`, error);
    }
  });

  await Promise.all(uploadPromises);
  return imageSources.length > 0;
};
