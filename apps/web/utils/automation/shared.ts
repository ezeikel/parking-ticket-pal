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
  challengeId?: string;
  stepName?: string;
  fullPage?: boolean;
};

type TakeScreenShotOptions = {
  dryRun?: boolean;
};

/**
 * Take a screenshot and upload to R2 storage.
 * Returns the URL of the uploaded screenshot.
 *
 * Storage paths:
 * - Normal: automation/challenges/{challengeId}/screenshots/{stepName}-{timestamp}.png
 * - Dry run: automation/dry-runs/{challengeId}/screenshots/{stepName}-{timestamp}.png
 * - Legacy: automation/{ticketId}/screenshot-{timestamp}.png
 */
export const takeScreenShot = async (
  { page, ticketId, challengeId, stepName, fullPage = true }: TakeScreenShotArgs,
  options?: TakeScreenShotOptions,
): Promise<string> => {
  const buffer = await page.screenshot({ fullPage });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const { dryRun = false } = options || {};

  let storagePath: string;

  if (challengeId) {
    const fileName = stepName
      ? `${stepName}-${timestamp}.png`
      : `screenshot-${timestamp}.png`;
    // Use separate folder for dry runs (easy cleanup)
    const baseFolder = dryRun ? 'automation/dry-runs' : 'automation/challenges';
    storagePath = `${baseFolder}/${challengeId}/screenshots/${fileName}`;
  } else {
    // Legacy path for backward compatibility
    storagePath = STORAGE_PATHS.AUTOMATION_SCREENSHOT.replace(
      '%s',
      ticketId,
    ).replace('%s', timestamp);
  }

  const blob = await put(storagePath, buffer, {
    contentType: 'image/png',
  });

  return blob.url;
};

/**
 * Options for setting up browser with video recording
 */
export type SetupBrowserWithRecordingOptions = {
  challengeId: string;
  recordVideo?: boolean;
};

/**
 * Setup browser with optional video recording.
 * Video is saved to a temp directory and uploaded to R2 when stopRecordingAndUpload is called.
 */
export const setupBrowserWithRecording = async (
  options?: SetupBrowserWithRecordingOptions,
) => {
  const recordVideo = options?.recordVideo ?? true;
  const tempDir = `/tmp/automation-recordings/${options?.challengeId || 'temp'}`;

  const browser = await chromium.launch({
    headless: false,
  });

  const contextOptions: Parameters<typeof browser.newContext>[0] = {
    viewport: { width: 1920, height: 1080 },
  };

  if (recordVideo) {
    contextOptions.recordVideo = {
      dir: tempDir,
      size: { width: 1920, height: 1080 },
    };
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  return { browser, context, page, tempDir, recordVideo };
};

type StopRecordingOptions = {
  dryRun?: boolean;
};

/**
 * Stop recording and upload video to R2 storage.
 * Returns the URL of the uploaded video.
 *
 * Storage paths:
 * - Normal: automation/challenges/{challengeId}/video/recording-{timestamp}.webm
 * - Dry run: automation/dry-runs/{challengeId}/video/recording-{timestamp}.webm
 */
export const stopRecordingAndUpload = async (
  page: Page,
  challengeId: string,
  options?: StopRecordingOptions,
): Promise<string | undefined> => {
  const { dryRun = false } = options || {};

  try {
    // Close the page to finalize the video
    const videoPath = await page.video()?.path();

    if (!videoPath) {
      console.warn('No video recording found');
      return undefined;
    }

    // Read the video file
    const fs = await import('fs/promises');
    const videoBuffer = await fs.readFile(videoPath);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Use separate folder for dry runs (easy cleanup)
    const baseFolder = dryRun ? 'automation/dry-runs' : 'automation/challenges';
    const storagePath = `${baseFolder}/${challengeId}/video/recording-${timestamp}.webm`;

    const blob = await put(storagePath, videoBuffer, {
      contentType: 'video/webm',
    });

    // Clean up temp file
    try {
      await fs.unlink(videoPath);
    } catch {
      // Ignore cleanup errors
    }

    return blob.url;
  } catch (error) {
    console.error('Failed to upload video recording:', error);
    return undefined;
  }
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
      const storagePath = STORAGE_PATHS.TICKET_EVIDENCE.replace('%s', ticketId)
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
