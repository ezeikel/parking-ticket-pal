import { NextRequest, NextResponse } from 'next/server';
import { db, ChallengeStatus } from '@parking-ticket-pal/db';
import { cancelChallengeJob } from '@/utils/automation/workerClient';
import { getUserId } from '@/utils/user';
import { revalidatePath } from 'next/cache';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'challenge-cancel' });

/**
 * POST /api/challenges/[id]/cancel
 *
 * Cancels an in-progress challenge.
 * Marks the challenge as CANCELLED in the DB and attempts to cancel the worker job.
 */
// eslint-disable-next-line import-x/prefer-default-export
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getUserId('cancel challenge');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get challenge with ticket info to verify ownership
    const challenge = await db.challenge.findUnique({
      where: { id },
      include: {
        ticket: {
          include: {
            vehicle: true,
          },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 },
      );
    }

    // Verify the user owns this challenge
    if (challenge.ticket.vehicle.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Can only cancel in-progress challenges
    if (challenge.status !== ChallengeStatus.IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Challenge is not in progress' },
        { status: 400 },
      );
    }

    // Try to cancel the worker job (best effort)
    if (challenge.workerJobId) {
      await cancelChallengeJob(challenge.workerJobId).catch((error) => {
        log.warn(
          'Failed to cancel worker job',
          undefined,
          error instanceof Error ? error : undefined,
        );
        // Continue even if worker cancel fails
      });
    }

    // Mark as cancelled in DB
    await db.challenge.update({
      where: { id },
      data: {
        status: ChallengeStatus.CANCELLED,
        metadata: {
          cancelledAt: new Date().toISOString(),
          cancelledBy: userId,
        },
      },
    });

    revalidatePath('/tickets/[id]', 'page');

    return NextResponse.json({
      success: true,
      message: 'Challenge cancelled',
    });
  } catch (error) {
    log.error(
      'Error cancelling challenge',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: 'Failed to cancel challenge' },
      { status: 500 },
    );
  }
}
