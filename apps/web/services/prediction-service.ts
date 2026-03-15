'use server';

import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import type { Enrichment, OutcomeSignalData } from '@parking-ticket-pal/types';
import gatherEnrichment from '@/utils/ai/enrichment';

const log = createServerLogger({ action: 'prediction-service' });

/**
 * Prediction metadata returned with each prediction
 */
export type PredictionMetadata = {
  dataSource: string;
  statsLevel: 'issuer_contravention' | 'contravention' | 'baseline';
  winningPatterns: { pattern: string; frequency: number }[];
  losingPatterns: { pattern: string; frequency: number }[];
  lastUpdated: string | null;
};

/**
 * Result from prediction calculation
 */
export type PredictionResult = {
  percentage: number;
  numberOfCases: number;
  confidence: number;
  metadata: PredictionMetadata;
};

/**
 * Compute a confidence-weighted average across outcome signals of the same stage.
 * Returns undefined if no signals exist for that stage.
 *
 *   avg = sum(percentage_i * weight_i * confidence_i) / sum(weight_i * confidence_i)
 */
function weightedAverage(
  items: { percentage: number; weight: number; confidence: number }[],
): { percentage: number; confidence: number } | undefined {
  if (items.length === 0) return undefined;

  const { weightedSum, totalWeight } = items.reduce(
    (acc, s) => {
      const effective = s.weight * s.confidence;
      return {
        weightedSum: acc.weightedSum + s.percentage * effective,
        totalWeight: acc.totalWeight + effective,
      };
    },
    { weightedSum: 0, totalWeight: 0 },
  );

  if (totalWeight === 0) return undefined;

  return {
    percentage: weightedSum / totalWeight,
    confidence: Math.max(...items.map((s) => s.confidence)),
  };
}

/**
 * Extract prediction from enrichment items using two-stage outcome model.
 *
 * ## Two-stage prediction
 *
 * The user-facing prediction answers: "what's the chance this ticket goes away?"
 *
 * That depends on two sequential stages:
 *   1. Council challenge — will the council/operator accept it? (`challenge_outcome`)
 *   2. Tribunal appeal   — if the council rejects, will the tribunal overturn? (`tribunal_outcome`)
 *
 * Combined probability:
 *   overall = P(challenge_accepted) + (1 - P(challenge_accepted)) * P(tribunal_wins)
 *
 * When only one stage has data (currently we only have tribunal stats), we use
 * that single signal directly. As council-specific data is added, the formula
 * kicks in automatically.
 *
 * Within each stage, multiple sources (e.g. London Tribunal + POPLA for tribunal)
 * are blended via confidence-weighted averaging.
 */
function predictionFromEnrichment(enrichment: Enrichment): PredictionResult {
  const defaultResult: PredictionResult = {
    percentage: 46,
    numberOfCases: 0,
    confidence: 0.3,
    metadata: {
      dataSource: 'london_tribunal',
      statsLevel: 'baseline',
      winningPatterns: [],
      losingPatterns: [],
      lastUpdated: null,
    },
  };

  // Collect outcome signals by stage
  const tribunalSignals = enrichment.items
    .filter((i) => i.category === 'tribunal_outcome' && i.data)
    .map((i) => ({
      item: i,
      signal: i.data as OutcomeSignalData,
      weight: i.weight ?? 1,
    }))
    .filter((s) => typeof s.signal.percentage === 'number');

  const challengeSignals = enrichment.items
    .filter((i) => i.category === 'challenge_outcome' && i.data)
    .map((i) => ({
      item: i,
      signal: i.data as OutcomeSignalData,
      weight: i.weight ?? 1,
    }))
    .filter((s) => typeof s.signal.percentage === 'number');

  // Weighted average within each stage
  const tribunal = weightedAverage(
    tribunalSignals.map((s) => ({
      percentage: s.signal.percentage,
      weight: s.weight,
      confidence: s.signal.confidence,
    })),
  );
  const challenge = weightedAverage(
    challengeSignals.map((s) => ({
      percentage: s.signal.percentage,
      weight: s.weight,
      confidence: s.signal.confidence,
    })),
  );

  // No outcome data at all
  if (!tribunal && !challenge) return defaultResult;

  // Two-stage combination:
  //   overall = P(challenge) + (1 - P(challenge)) * P(tribunal)
  //
  // Fallbacks:
  //   - Only tribunal data → use tribunal directly
  //   - Only challenge data → use challenge directly
  //   - Both → combine
  let percentage: number;
  let confidence: number;

  if (challenge && tribunal) {
    const pChallenge = challenge.percentage / 100;
    const pTribunal = tribunal.percentage / 100;
    percentage = Math.round((pChallenge + (1 - pChallenge) * pTribunal) * 100);
    confidence = Math.max(challenge.confidence, tribunal.confidence);
  } else if (tribunal) {
    percentage = Math.round(tribunal.percentage);
    confidence = tribunal.confidence;
  } else {
    percentage = Math.round(challenge!.percentage);
    confidence = challenge!.confidence;
  }

  // Total cases across all signals
  const totalCases = [...tribunalSignals, ...challengeSignals].reduce(
    (sum, s) => sum + s.signal.numberOfCases,
    0,
  );

  // Metadata provenance: use highest-confidence signal across both stages
  const allSignals = [...tribunalSignals, ...challengeSignals];
  const primary = allSignals.reduce((best, s) =>
    s.signal.confidence > best.signal.confidence ? s : best,
  );

  const winningPatterns = enrichment.items
    .filter((i) => i.category === 'winning_pattern')
    .map((i) => {
      const d = i.data as { pattern: string; frequency: number } | undefined;
      return d || { pattern: i.content, frequency: 0 };
    });

  const losingPatterns = enrichment.items
    .filter((i) => i.category === 'losing_pattern')
    .map((i) => {
      const d = i.data as { pattern: string; frequency: number } | undefined;
      return d || { pattern: i.content, frequency: 0 };
    });

  return {
    percentage,
    numberOfCases: totalCases,
    confidence,
    metadata: {
      dataSource: primary.item.source,
      statsLevel:
        (primary.signal.statsLevel as PredictionMetadata['statsLevel']) ||
        'baseline',
      winningPatterns,
      losingPatterns,
      lastUpdated: primary.signal.lastUpdated ?? null,
    },
  };
}

/**
 * Calculate prediction for a ticket based on enrichment data.
 *
 * Delegates to gatherEnrichment() and extracts prediction values
 * from outcome signal items, so the same data pipeline feeds both
 * predictions and AI prompt builders.
 *
 * ## Adding a new data source that affects the prediction
 *
 * 1. Write a collector in `apps/web/utils/ai/enrichment.ts`
 * 2. Emit the right outcome category:
 *    - `tribunal_outcome` for tribunal/POPLA/IAS win rate data
 *    - `challenge_outcome` for council/operator acceptance rate data
 *    Put `OutcomeSignalData` in the item's `data` field.
 * 3. The two-stage formula here automatically incorporates it.
 */
export async function calculatePrediction(ticket: {
  contraventionCode: string | null;
  issuer: string | null;
  id?: string;
}): Promise<PredictionResult> {
  const defaultResult: PredictionResult = {
    percentage: 46,
    numberOfCases: 0,
    confidence: 0.3,
    metadata: {
      dataSource: 'london_tribunal',
      statsLevel: 'baseline',
      winningPatterns: [],
      losingPatterns: [],
      lastUpdated: null,
    },
  };

  try {
    const enrichment = await gatherEnrichment({
      contraventionCode: ticket.contraventionCode,
      issuer: ticket.issuer,
      challengeReason: '', // Not needed for prediction (only affects statutory ground collector)
      ticketId: ticket.id,
    });

    if (!enrichment) return defaultResult;

    return predictionFromEnrichment(enrichment);
  } catch (error) {
    log.error(
      'Error calculating prediction',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return defaultResult;
  }
}

/**
 * Calculate prediction from pre-gathered enrichment data.
 * Used when enrichment is already available (avoids duplicate DB queries).
 */
export async function calculatePredictionFromEnrichment(
  enrichment: Enrichment,
): Promise<PredictionResult> {
  return predictionFromEnrichment(enrichment);
}

/**
 * Normalize an issuer name to an issuer ID
 */
function normalizeIssuerId(issuer: string): string {
  if (!issuer) return '';
  return issuer
    .toLowerCase()
    .replace(/^(london borough of |royal borough of |city of )/i, '')
    .replace(/\s+/g, '-')
    .trim();
}

/**
 * Get recommended challenge reasons based on winning patterns
 *
 * Maps extracted patterns to the standard challenge reason codes
 */
export async function getRecommendedReasons(
  contraventionCode: string | null,
  issuerId: string | null,
): Promise<{
  recommended: string[];
  toAvoid: string[];
}> {
  if (!contraventionCode) {
    return { recommended: [], toAvoid: [] };
  }

  const normalizedIssuer = normalizeIssuerId(issuerId || '');

  try {
    const patterns = await db.appealPattern.findMany({
      where: {
        contraventionCode,
        OR: normalizedIssuer
          ? [{ issuerId: normalizedIssuer }, { issuerId: null }]
          : [{ issuerId: null }],
      },
      orderBy: { frequency: 'desc' },
    });

    const PATTERN_TO_REASON: Record<string, string> = {
      SIGNAGE_INADEQUATE: 'PROCEDURAL_IMPROPRIETY',
      PROCEDURAL_ERROR: 'PROCEDURAL_IMPROPRIETY',
      TMO_INVALID: 'INVALID_TMO',
      NOTICE_NOT_SERVED: 'PROCEDURAL_IMPROPRIETY',
      LOADING_EXEMPTION: 'CONTRAVENTION_DID_NOT_OCCUR',
      PERMIT_WAS_VALID: 'CONTRAVENTION_DID_NOT_OCCUR',
      BLUE_BADGE_DISPLAYED: 'CONTRAVENTION_DID_NOT_OCCUR',
      VEHICLE_SOLD: 'NOT_VEHICLE_OWNER',
      VEHICLE_STOLEN: 'VEHICLE_STOLEN',
      HIRE_VEHICLE: 'HIRE_FIRM',
      CCTV_UNCLEAR: 'CONTRAVENTION_DID_NOT_OCCUR',
      EVIDENCE_INSUFFICIENT: 'CONTRAVENTION_DID_NOT_OCCUR',
      TIME_DISCREPANCY: 'CONTRAVENTION_DID_NOT_OCCUR',
    };

    const winningPatterns = patterns.filter((p) => p.outcome === 'WINNING');
    const losingPatterns = patterns.filter((p) => p.outcome === 'LOSING');

    const recommended = [
      ...new Set(
        winningPatterns
          .map((p) => PATTERN_TO_REASON[p.pattern])
          .filter(Boolean),
      ),
    ];

    const toAvoid = [
      ...new Set(
        losingPatterns.map((p) => PATTERN_TO_REASON[p.pattern]).filter(Boolean),
      ),
    ];

    return { recommended, toAvoid };
  } catch (error) {
    log.error(
      'Error getting recommended reasons',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return { recommended: [], toAvoid: [] };
  }
}
