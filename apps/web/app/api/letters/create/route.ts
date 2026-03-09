import { NextRequest } from 'next/server';
import { LetterType } from '@parking-ticket-pal/db';
import { createLetter } from '@/app/actions/letter';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'letter-create-api' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const OPTIONS = () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const POST = async (request: NextRequest) => {
  const userId = await getUserId('create a letter');

  if (!userId) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: corsHeaders },
    );
  }

  try {
    const body = await request.json();

    const {
      pcnNumber,
      vehicleReg,
      letterType,
      summary,
      sentAt,
      tempImageUrl,
      tempImagePath,
      extractedText,
      currentAmount,
      issuer,
      issuerType,
      location,
      initialAmount,
      contraventionCode,
    } = body;

    if (!pcnNumber || !vehicleReg) {
      return Response.json(
        {
          success: false,
          error: 'PCN number and vehicle registration are required',
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Map letterType string to LetterType enum, fallback to GENERIC
    const type =
      letterType && LetterType[letterType as keyof typeof LetterType]
        ? LetterType[letterType as keyof typeof LetterType]
        : LetterType.GENERIC;

    const letter = await createLetter({
      pcnNumber,
      vehicleReg,
      type,
      summary: summary || 'Letter from council',
      sentAt: sentAt ? new Date(sentAt) : new Date(),
      tempImageUrl,
      tempImagePath,
      extractedText,
      currentAmount: currentAmount || undefined,
      issuer: issuer || undefined,
      issuerType: issuerType || undefined,
      location: location || undefined,
      initialAmount: initialAmount || undefined,
      contraventionCode: contraventionCode || undefined,
    });

    if (!letter) {
      return Response.json(
        { success: false, error: 'Failed to create letter' },
        { status: 500, headers: corsHeaders },
      );
    }

    return Response.json(
      { success: true, letter },
      { status: 201, headers: corsHeaders },
    );
  } catch (error) {
    log.error(
      'Error creating letter via API',
      { userId },
      error instanceof Error ? error : new Error(String(error)),
    );
    return Response.json(
      { success: false, error: 'Failed to create letter' },
      { status: 500, headers: corsHeaders },
    );
  }
};
