import generateChallengeContent from '@/utils/ai/generateChallengeContent';
import { ChallengeArgs, CommonPcnArgs, takeScreenShot } from '../shared';

export const access = async ({ page, pcnNumber, ticket }: CommonPcnArgs) => {
  await page.goto('https://horizonparkingportal.co.uk/#manage');
  await page.fill('#pcn_reference', pcnNumber);
  await page.fill('#plate', ticket.vehicle.registrationNumber);
  await page.solveRecaptchas();
  await page.click('#view');
  await page.waitForURL('**/#viewPCN/**');
  await page.waitForSelector('h2:has-text("View your PCN")');
  await takeScreenShot({
    page,
    userId: ticket.vehicle.user.id,
    ticketId: ticket.id,
  });
  return true;
};

export const verify = async (args: CommonPcnArgs) => {
  await access(args);
  await takeScreenShot({
    page: args.page,
    userId: args.ticket.vehicle.user.id,
    ticketId: args.ticket.id,
  });
  return true;
};

export const challenge = async (args: ChallengeArgs) => {
  await access(args);

  const { challengeReason, additionalDetails } = args;

  // TODO: Add challenge-specific steps

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

  await takeScreenShot({
    page: args.page,
    userId: args.ticket.vehicle.user.id,
    ticketId: args.ticket.id,
    name: 'challenge-submitted',
  });
  return {
    success: true,
    challengeText,
  };
};
