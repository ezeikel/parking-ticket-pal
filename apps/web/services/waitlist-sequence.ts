'use server';

import { db, WaitlistExitReason } from '@parking-ticket-pal/db';
import { addHours } from 'date-fns';
import { createServerLogger } from '@/lib/logger';
import { posthogServer } from '@/lib/posthog-server';

const logger = createServerLogger({ action: 'waitlist-sequence' });

// Step 1: Welcome (immediate, ~1 hour after signup)
// Step 2: Value/Trust (7 days after signup)
// Step 3: Launch day (manual broadcast — not scheduled automatically)
const STEP_OFFSETS_HOURS = [1, 168];

/**
 * Creates a waitlist signup record and initializes the email sequence.
 */
export const createWaitlistSignup = async (email: string) => {
  // Guard: skip if already signed up
  const existing = await db.waitlistSignup.findUnique({
    where: { email },
  });

  if (existing) {
    logger.debug('Skipping waitlist signup — email already exists', { email });
    return existing;
  }

  const now = new Date();
  const nextSendAt = addHours(now, STEP_OFFSETS_HOURS[0]);

  const signup = await db.waitlistSignup.create({
    data: {
      email,
      currentStep: 1,
      nextSendAt,
    },
  });

  if (posthogServer) {
    posthogServer.capture({
      distinctId: email,
      event: 'waitlist_sequence_started',
      properties: { email },
    });
    await posthogServer.shutdown();
  }

  logger.info('Created waitlist signup', {
    signupId: signup.id,
    email,
    nextSendAt: nextSendAt.toISOString(),
  });

  return signup;
};

/**
 * Advances a waitlist sequence to the next step or marks it complete.
 * Steps 1 and 2 are automated. Step 3 (launch) is a manual broadcast.
 */
export const advanceWaitlistSequence = async (
  signupId: string,
  currentStep: number,
  createdAt: Date,
) => {
  // Only 2 automated steps. After step 2, mark as complete (waiting for launch broadcast).
  if (currentStep >= 2) {
    await db.waitlistSignup.update({
      where: { id: signupId },
      data: {
        completedAt: new Date(),
        exitReason: WaitlistExitReason.SEQUENCE_COMPLETE,
      },
    });
    return;
  }

  const nextStep = currentStep + 1;
  const offsetHours = STEP_OFFSETS_HOURS[nextStep - 1];

  if (offsetHours === undefined) {
    // Shouldn't happen — mark complete
    await db.waitlistSignup.update({
      where: { id: signupId },
      data: {
        completedAt: new Date(),
        exitReason: WaitlistExitReason.SEQUENCE_COMPLETE,
      },
    });
    return;
  }

  const nextSendAt = addHours(createdAt, offsetHours);

  await db.waitlistSignup.update({
    where: { id: signupId },
    data: {
      currentStep: nextStep,
      nextSendAt,
    },
  });
};

/**
 * Sends the launch email (step 3) to all waitlist signups.
 * Called manually on launch day via the broadcast endpoint.
 */
export const getWaitlistEmailsForBroadcast = async () => {
  // Get all signups that haven't been sent the launch email
  // (exitReason is SEQUENCE_COMPLETE means they finished steps 1+2,
  //  or they might still be mid-sequence — send to all regardless)
  const signups = await db.waitlistSignup.findMany({
    where: {
      exitReason: { not: WaitlistExitReason.APP_LAUNCHED },
    },
    select: {
      id: true,
      email: true,
    },
  });

  return signups;
};

/**
 * Marks all waitlist signups as launched after the broadcast.
 */
export const markWaitlistAsLaunched = async (signupIds: string[]) => {
  await db.waitlistSignup.updateMany({
    where: {
      id: { in: signupIds },
    },
    data: {
      completedAt: new Date(),
      exitReason: WaitlistExitReason.APP_LAUNCHED,
    },
  });
};
