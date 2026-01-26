import { findIssuer, isAutomationSupported } from '@/constants/index';
import { db } from '@parking-ticket-pal/db';
import { lewisham, horizon } from './issuers';
import {
  CommonPcnArgs,
  setupBrowserWithRecording,
  stopRecordingAndUpload,
} from './shared';

const CHALLENGE_FUNCTIONS = {
  lewisham: lewisham.challenge,
  horizon: horizon.challenge,
};

type IssuerId = keyof typeof CHALLENGE_FUNCTIONS;

export type ChallengeResult = {
  success: boolean;
  challengeText?: string;
  screenshotUrls?: string[];
  videoUrl?: string;
};

export type ChallengeOptions = {
  dryRun?: boolean;
  challengeId?: string;
  recordVideo?: boolean;
};

const challenge = async (
  pcnNumber: string,
  challengeReason: string,
  additionalDetails?: string,
  options?: ChallengeOptions,
): Promise<ChallengeResult> => {
  const { dryRun = false, challengeId, recordVideo = true } = options || {};

  const ticket = await db.ticket.findFirst({
    where: { pcnNumber },
    select: {
      id: true,
      pcnNumber: true,
      issuer: true,
      contraventionCode: true,
      media: true,
      vehicle: {
        select: {
          registrationNumber: true,
          make: true,
          model: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              address: true,
              phoneNumber: true,
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    console.error('Ticket not found.');
    return { success: false, screenshotUrls: [] };
  }

  const issuer = findIssuer(ticket.issuer);

  if (!issuer || !isAutomationSupported(issuer.id)) {
    console.error('Automation not supported for this issuer.');
    return { success: false, screenshotUrls: [] };
  }

  const challengeFunction = CHALLENGE_FUNCTIONS[issuer.id as IssuerId];

  if (!challengeFunction) {
    console.error('Challenge function not implemented for this issuer.');
    return { success: false, screenshotUrls: [] };
  }

  const { browser, page } = await setupBrowserWithRecording({
    challengeId: challengeId || ticket.id,
    recordVideo,
  });

  let videoUrl: string | undefined;

  try {
    const result = await challengeFunction(
      {
        page,
        pcnNumber,
        // TODO: fix this type cast
        ticket: ticket as unknown as CommonPcnArgs['ticket'],
        challengeReason,
        additionalDetails,
      },
      { dryRun, challengeId },
    );

    // Upload video recording if enabled
    if (recordVideo && challengeId) {
      videoUrl = await stopRecordingAndUpload(page, challengeId, { dryRun });
    }

    return {
      ...result,
      videoUrl,
    };
  } catch (error) {
    console.error('Error challenging ticket:', error);

    // Still try to upload video on error for debugging
    if (recordVideo && challengeId) {
      try {
        videoUrl = await stopRecordingAndUpload(page, challengeId, { dryRun });
      } catch {
        // Ignore video upload errors
      }
    }

    return { success: false, screenshotUrls: [], videoUrl };
  } finally {
    await browser.close();
  }
};

export default challenge;
