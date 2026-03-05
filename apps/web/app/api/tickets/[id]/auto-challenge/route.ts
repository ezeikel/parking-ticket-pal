import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/utils/user';
import { initiateAutoChallenge } from '@/app/actions/autoChallenge';

/**
 * Start an auto-challenge for a ticket
 *
 * POST /api/tickets/[id]/auto-challenge
 *
 * Body: { challengeReason: string, customReason?: string, existingChallengeId?: string }
 *
 * This wraps the initiateAutoChallenge server action so mobile can call it.
 */
// eslint-disable-next-line import-x/prefer-default-export
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId('start auto-challenge');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: ticketId } = await params;

  const body = await request.json();
  const { challengeReason, customReason, existingChallengeId } = body;

  if (!challengeReason) {
    return NextResponse.json(
      { error: 'challengeReason is required' },
      { status: 400 },
    );
  }

  const result = await initiateAutoChallenge(
    ticketId,
    challengeReason,
    customReason,
    existingChallengeId,
  );

  return NextResponse.json(result);
}
