import * as Sentry from '@sentry/nextjs';
import generateChallengeContent from '@/utils/ai/generateChallengeContent';
import {
  ChallengeArgs,
  CommonPcnArgs,
  takeScreenShot,
} from '../shared';

export type ChallengeResult = {
  success: boolean;
  challengeText?: string;
  screenshotUrls: string[];
};

export type ChallengeOptions = {
  dryRun?: boolean;
  challengeId?: string;
};

/**
 * Access the Westminster City Council PCN portal
 * Auto-generated from website exploration
 */
export const access = async ({ page, pcnNumber, ticket }: CommonPcnArgs) => {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await page.goto('<UNKNOWN>');

  // Fill Enter your ticket reference
  await page.fill('[0-249] textbox', /* TODO: Map field "ticket_reference" */);
  // Fill Enter your vehicle registration number
  await page.fill('[0-200] textbox', ticket.vehicle.registrationNumber);

      // Submit lookup form
      await page.click('[0-262] button');

      // Wait for results
      await page.waitForLoadState('networkidle');

      return;
    } catch (error) {
      if (attempt === maxRetries) {
        Sentry.captureException(error, {
          tags: { issuer: 'westminster_test2', action: 'access' },
        });
        throw error;
      }
      console.log(`Attempt ${attempt} failed, retrying...`);
      await page.waitForTimeout(3000);
    }
  }
};

/**
 * Verify a PCN on Westminster City Council
 */
export const verify = async (args: CommonPcnArgs) => {
  await access(args);
  const { page, ticket } = args;

  // Take screenshot of PCN details
  await takeScreenShot({
    page,
    ticketId: ticket.id,
  });

  return true;
};

/**
 * Submit a challenge on Westminster City Council
 * Auto-generated from website exploration
 */
export const challenge = async (
  args: ChallengeArgs,
  options?: ChallengeOptions,
): Promise<ChallengeResult> => {
  const screenshotUrls: string[] = [];
  const { dryRun = false, challengeId } = options || {};

  await access(args);

  const { page, challengeReason, additionalDetails } = args;

  // Screenshot: Before challenge
  const detailsScreenshot = await takeScreenShot(
    {
      page,
      ticketId: args.ticket.id,
      challengeId,
      stepName: '01-pcn-details',
    },
    { dryRun },
  );
  screenshotUrls.push(detailsScreenshot);

  // Navigate to challenge form
  await page.click('[0-262] button'); // Click Show ticket button to proceed to ticket details

  // Fill contact/user information
  const { user } = args.ticket.vehicle;



  // Generate challenge content
  const challengeText = await generateChallengeContent({
    pcnNumber: args.pcnNumber,
    challengeReason,
    additionalDetails,
    contentType: 'form-field',
    formFieldPlaceholderText: '',
    userEvidenceImageUrls: [],
  });

  // Fill challenge text
  // No textarea found for challenge text

  // Screenshot: Form filled
  const formFilledScreenshot = await takeScreenShot(
    {
      page,
      ticketId: args.ticket.id,
      challengeId,
      stepName: '02-form-filled',
      fullPage: true,
    },
    { dryRun },
  );
  screenshotUrls.push(formFilledScreenshot);

  // If dry run, don't submit
  if (dryRun) {
    return {
      success: true,
      challengeText: challengeText ?? undefined,
      screenshotUrls,
    };
  }

  // Submit the challenge
  await page.click('[0-262] button');

  // Screenshot: After submission
  const submittedScreenshot = await takeScreenShot(
    {
      page,
      ticketId: args.ticket.id,
      challengeId,
      stepName: '03-submitted',
    },
    { dryRun },
  );
  screenshotUrls.push(submittedScreenshot);

  return { success: true, challengeText: challengeText ?? undefined, screenshotUrls };
};
