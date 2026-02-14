import { NextRequest, NextResponse } from 'next/server';
import { db, ChallengeStatus } from '@parking-ticket-pal/db';
import { getChallengeJobStatus } from '@/utils/automation/workerClient';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'challenge-status' });

/**
 * GET /api/challenges/[id]/status
 *
 * Returns the status of a challenge, including real-time progress for in-progress jobs.
 * If the challenge is IN_PROGRESS, polls the worker for progress updates.
 */
// eslint-disable-next-line import-x/prefer-default-export
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getUserId('get challenge status');

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

    // If challenge is in progress and has a worker job ID, poll the worker
    if (
      challenge.status === ChallengeStatus.IN_PROGRESS &&
      challenge.workerJobId
    ) {
      const workerStatus = await getChallengeJobStatus(challenge.workerJobId);

      if (workerStatus) {
        return NextResponse.json({
          challengeId: challenge.id,
          status: challenge.status,
          workerStatus: {
            jobId: workerStatus.jobId,
            status: workerStatus.status,
            progress: workerStatus.progress,
            error: workerStatus.error,
            startedAt: workerStatus.startedAt,
          },
        });
      }
    }

    // Return DB state for completed/failed challenges
    const metadata = challenge.metadata as Record<string, unknown> | null;

    return NextResponse.json({
      challengeId: challenge.id,
      status: challenge.status,
      submittedAt: challenge.submittedAt?.toISOString(),
      createdAt: challenge.createdAt.toISOString(),
      result: metadata
        ? {
            success: challenge.status === ChallengeStatus.SUCCESS,
            screenshotUrls: metadata.screenshotUrls as string[] | undefined,
            videoUrl: metadata.videoUrl as string | undefined,
            referenceNumber: metadata.referenceNumber as string | undefined,
            challengeText: metadata.challengeText as string | undefined,
            error: metadata.error as string | undefined,
          }
        : undefined,
    });
  } catch (error) {
    log.error(
      'Error getting challenge status',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: 'Failed to get challenge status' },
      { status: 500 },
    );
  }
}
