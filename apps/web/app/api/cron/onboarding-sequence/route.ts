import { NextResponse } from 'next/server';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { sendOnboardingEmail } from '@/lib/email';
import { posthogServer } from '@/lib/posthog-server';
import {
  checkExitConditions,
  buildOnboardingEmailData,
  advanceSequence,
  shouldJumpToFinalStep,
} from '@/services/onboarding-sequence';

const logger = createServerLogger({ action: 'cron-onboarding-sequence' });

// eslint-disable-next-line import-x/prefer-default-export
export async function POST(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Find sequences that are due to send
    const dueSequences = await db.onboardingSequence.findMany({
      where: {
        nextSendAt: { lte: now },
        completedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticket: {
          select: {
            id: true,
            pcnNumber: true,
            issuer: true,
            initialAmount: true,
            issuedAt: true,
            contraventionCode: true,
            prediction: {
              select: { numberOfCases: true },
            },
          },
        },
      },
    });

    logger.info('Found due onboarding sequences', {
      count: dueSequences.length,
    });

    let sent = 0;
    let exited = 0;
    let failed = 0;

    const results = await Promise.allSettled(
      dueSequences.map(async (sequence) => {
        // Skip if user has no email
        if (!sequence.user.email) {
          logger.warn('Skipping sequence — user has no email', {
            sequenceId: sequence.id,
            userId: sequence.userId,
          });
          return;
        }

        // Check exit conditions
        const exitReason = await checkExitConditions({
          id: sequence.id,
          userId: sequence.userId,
          ticketId: sequence.ticketId,
          currentStep: sequence.currentStep,
        });

        if (exitReason) {
          await db.onboardingSequence.update({
            where: { id: sequence.id },
            data: {
              completedAt: new Date(),
              exitReason,
            },
          });

          if (posthogServer) {
            posthogServer.capture({
              distinctId: sequence.userId,
              event: 'onboarding_sequence_exited',
              properties: {
                ticketId: sequence.ticketId,
                step: sequence.currentStep,
                exitReason,
              },
            });
          }

          logger.info('Exited onboarding sequence', {
            sequenceId: sequence.id,
            exitReason,
          });

          exited += 1;
          return;
        }

        // Determine step to send — jump to step 6 if deadline is <=2 days away
        let stepToSend = sequence.currentStep;
        if (await shouldJumpToFinalStep(stepToSend, sequence.ticket.issuedAt)) {
          stepToSend = 6;
        }

        // Build email data
        const emailData = await buildOnboardingEmailData(
          stepToSend,
          { name: sequence.user.name, email: sequence.user.email },
          sequence.ticket,
        );

        // Send email
        const result = await sendOnboardingEmail(
          sequence.user.email,
          emailData,
        );

        if (!result.success) {
          logger.error('Failed to send onboarding email', {
            sequenceId: sequence.id,
            step: stepToSend,
            error: result.error,
          });
          failed += 1;
          return;
        }

        // Track send event
        if (posthogServer) {
          posthogServer.capture({
            distinctId: sequence.userId,
            event: 'onboarding_email_sent',
            properties: {
              ticketId: sequence.ticketId,
              step: stepToSend,
              pcnNumber: sequence.ticket.pcnNumber,
            },
          });
        }

        // Advance sequence (if we jumped to step 6, pass that as currentStep)
        await advanceSequence(
          sequence.id,
          stepToSend,
          sequence.ticket.issuedAt,
          sequence.createdAt,
        );

        if (stepToSend >= 6 && posthogServer) {
          posthogServer.capture({
            distinctId: sequence.userId,
            event: 'onboarding_sequence_completed',
            properties: {
              ticketId: sequence.ticketId,
              step: stepToSend,
            },
          });
        }

        logger.info('Sent onboarding email', {
          sequenceId: sequence.id,
          step: stepToSend,
          pcnNumber: sequence.ticket.pcnNumber,
        });

        sent += 1;
      }),
    );

    // Count additional failures from rejected promises
    results.forEach((result) => {
      if (result.status === 'rejected') {
        failed += 1;
        logger.error(
          'Onboarding sequence processing failed',
          {},
          result.reason instanceof Error
            ? result.reason
            : new Error(String(result.reason)),
        );
      }
    });

    // Flush PostHog
    if (posthogServer) {
      await posthogServer.shutdown();
    }

    return NextResponse.json({
      success: true,
      processed: dueSequences.length,
      sent,
      exited,
      failed,
    });
  } catch (error) {
    logger.error(
      'Cron onboarding-sequence failed',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
