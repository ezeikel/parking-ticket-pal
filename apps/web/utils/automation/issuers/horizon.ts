import generateChallengeContent from '@/utils/ai/generateChallengeContent';
import { ChallengeArgs, CommonPcnArgs, takeScreenShot } from '../shared';

export type ChallengeResult = {
  success: boolean;
  challengeText?: string;
  screenshotUrls: string[];
};

export type ChallengeOptions = {
  dryRun?: boolean;
  challengeId?: string;
};

export const access = async (
  { page, pcnNumber, ticket }: CommonPcnArgs,
  options?: { challengeId?: string; dryRun?: boolean },
): Promise<string[]> => {
  const screenshotUrls: string[] = [];
  const { challengeId, dryRun = false } = options || {};

  await page.goto('https://horizonparkingportal.co.uk/#manage');
  await page.fill('#pcn_reference', pcnNumber);
  await page.fill('#plate', ticket.vehicle.registrationNumber);
  await page.solveRecaptchas();
  await page.click('#view');
  await page.waitForURL('**/#viewPCN/**');
  await page.waitForSelector('h2:has-text("View your PCN")');

  const screenshot = await takeScreenShot(
    {
      page,
      ticketId: ticket.id,
      challengeId,
      stepName: '01-pcn-details',
    },
    { dryRun },
  );
  screenshotUrls.push(screenshot);

  return screenshotUrls;
};

export const verify = async (args: CommonPcnArgs) => {
  await access(args);
  const screenshot = await takeScreenShot({
    page: args.page,
    ticketId: args.ticket.id,
    stepName: 'verify',
  });
  return { success: true, screenshotUrls: [screenshot] };
};

export const challenge = async (
  args: ChallengeArgs,
  options?: ChallengeOptions,
): Promise<ChallengeResult> => {
  const { dryRun = false, challengeId } = options || {};

  const accessScreenshots = await access(args, { challengeId, dryRun });

  const { challengeReason, additionalDetails } = args;

  // TODO: Add challenge-specific steps (form filling, etc.)

  // util function to generate challenge text
  const challengeText = await generateChallengeContent({
    pcnNumber: args.pcnNumber,
    challengeReason,
    additionalDetails,
    contentType: 'form-field',
    formFieldPlaceholderText: '',
    // TODO: add user evidence image urls
    userEvidenceImageUrls: [],
  });

  // Screenshot before any submission
  const preSubmitScreenshot = await takeScreenShot(
    {
      page: args.page,
      ticketId: args.ticket.id,
      challengeId,
      stepName: '02-form-ready',
    },
    { dryRun },
  );

  const screenshotUrls = [...accessScreenshots, preSubmitScreenshot];

  // If dry run, don't proceed with submission
  if (dryRun) {
    return {
      success: true,
      challengeText: challengeText ?? undefined,
      screenshotUrls,
    };
  }

  // TODO: Implement actual submission steps for Horizon

  return {
    success: true,
    challengeText: challengeText ?? undefined,
    screenshotUrls,
  };
};
