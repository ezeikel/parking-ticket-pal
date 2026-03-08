'use server';

import { db } from '@parking-ticket-pal/db';
import { calculatePrediction } from '@/services/prediction-service';
import { getStatutoryGroundById } from '@/constants/statutory-grounds';
import { getEducationalContentForCode } from '@/data/contravention-codes/educational-content';
import { getContraventionDetails } from '@parking-ticket-pal/constants';
import type { LetterEnrichment } from './generateChallengeContent';

const REASON_TO_STATUTORY_GROUND: Record<string, string> = {
  CONTRAVENTION_DID_NOT_OCCUR: 'contravention-did-not-occur',
  NOT_VEHICLE_OWNER: 'not-owner-at-time',
  VEHICLE_STOLEN: 'vehicle-taken-without-consent',
  HIRE_FIRM: 'hired-vehicle',
  EXCEEDED_AMOUNT: 'penalty-exceeded',
  INVALID_TMO: 'invalid-tro',
  PROCEDURAL_IMPROPRIETY: 'procedural-impropriety',
  UNCLEAR_SIGNAGE: 'inadequate-signage',
  NO_BREACH_CONTRACT: 'contravention-did-not-occur',
  MITIGATING_CIRCUMSTANCES: 'medical-emergency',
};

/**
 * Gather enrichment data (tribunal intelligence, statutory grounds, appeal guidance)
 * for challenge text generation. Used by both letter and auto-challenge pathways.
 */
export default async function gatherEnrichment({
  contraventionCode,
  issuer,
  challengeReason,
}: {
  contraventionCode: string | null;
  issuer: string | null;
  challengeReason: string;
}): Promise<LetterEnrichment | undefined> {
  try {
    const [prediction, exampleCases] = await Promise.all([
      calculatePrediction({
        contraventionCode,
        issuer,
      }),
      db.londonTribunalCase.findMany({
        where: {
          normalizedContraventionCode: contraventionCode || undefined,
          appealDecision: 'ALLOWED',
          reasons: { not: '' },
        },
        select: { reasons: true },
        orderBy: { decisionDate: 'desc' },
        take: 2,
      }),
    ]);

    const statutoryGroundId = REASON_TO_STATUTORY_GROUND[challengeReason];
    const statutoryGround = statutoryGroundId
      ? getStatutoryGroundById(statutoryGroundId)
      : undefined;

    let appealGuidance: string[] | undefined;
    if (contraventionCode) {
      const codeDetails = getContraventionDetails(contraventionCode);
      const educationalContent = getEducationalContentForCode(
        contraventionCode,
        codeDetails.category,
      );
      appealGuidance = educationalContent.appealApproach;
    }

    return {
      successRate:
        prediction.numberOfCases > 0
          ? {
              percentage: prediction.percentage,
              numberOfCases: prediction.numberOfCases,
            }
          : undefined,
      winningPatterns:
        prediction.metadata.winningPatterns.length > 0
          ? prediction.metadata.winningPatterns
          : undefined,
      losingPatterns:
        prediction.metadata.losingPatterns.length > 0
          ? prediction.metadata.losingPatterns
          : undefined,
      statutoryGround: statutoryGround
        ? {
            label: statutoryGround.label,
            description: statutoryGround.description,
          }
        : undefined,
      appealGuidance,
      exampleWinningReasons:
        exampleCases.length > 0
          ? exampleCases.map((c) =>
              c.reasons.length > 500
                ? `${c.reasons.slice(0, 500)}...`
                : c.reasons,
            )
          : undefined,
    };
  } catch {
    return undefined;
  }
}
