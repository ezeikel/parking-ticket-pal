import { ChallengeReasonId } from '@/types';
import { CommonPcnArgs, takeScreenShot } from '../shared';

export const access = async ({ page, pcnNumber, ticket }: CommonPcnArgs) => {
  await page.goto('https://horizonparkingportal.co.uk/#manage');
  await page.fill('#pcn_reference', pcnNumber);
  await page.fill('#plate', ticket.vehicle.registrationNumber);
  await page.solveRecaptchas();
  await page.click('#view');
  await page.waitForURL('**/#viewPCN/**');
  await page.waitForSelector('h2:has-text("View your PCN")');
  await takeScreenShot(page, pcnNumber, ticket.vehicle.user.id);
  return true;
};

export const verify = async (args: CommonPcnArgs) => {
  await access(args);
  await takeScreenShot(args.page, args.pcnNumber, args.ticket.vehicle.user.id);
  return true;
};

export const challenge = async (
  args: CommonPcnArgs & { reason: ChallengeReasonId },
) => {
  await access(args);
  // TODO: Add challenge-specific steps
  await takeScreenShot(
    args.page,
    args.pcnNumber,
    args.ticket.vehicle.user.id,
    'challenge-submitted',
  );
  return true;
};
