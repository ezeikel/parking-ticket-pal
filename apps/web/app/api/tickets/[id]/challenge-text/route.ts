import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/utils/user';
import {
  generateChallengeText,
  saveChallengeText,
} from '@/app/actions/challenge';

/**
 * Generate challenge argument text for a ticket.
 *
 * POST /api/tickets/[id]/challenge-text
 * Body: { challengeReason: string, additionalInfo?: string }
 * Returns: { success: boolean, data?: { challengeId, challengeText } }
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId('generate challenge text');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: ticketId } = await params;
  const body = await request.json();
  const { challengeReason, additionalInfo } = body;

  if (!challengeReason) {
    return NextResponse.json(
      { error: 'challengeReason is required' },
      { status: 400 },
    );
  }

  const result = await generateChallengeText(
    ticketId,
    challengeReason,
    additionalInfo,
  );

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: result.data,
  });
}

/**
 * Save edited challenge text or additional info.
 *
 * PATCH /api/tickets/[id]/challenge-text
 * Body: { challengeId: string, challengeText?: string, additionalInfo?: string }
 * Returns: { success: boolean }
 */
export async function PATCH(request: NextRequest) {
  const userId = await getUserId('save challenge text');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { challengeId, challengeText, additionalInfo } = body;

  if (!challengeId) {
    return NextResponse.json(
      { error: 'challengeId is required' },
      { status: 400 },
    );
  }

  const result = await saveChallengeText(challengeId, {
    challengeText,
    additionalInfo,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
