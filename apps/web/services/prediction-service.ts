'use server';

import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';

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
 * Normalize an issuer name to an issuer ID
 *
 * Handles various formats:
 * - "London Borough of Lewisham" -> "lewisham"
 * - "Lewisham" -> "lewisham"
 * - "lewisham" -> "lewisham"
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
 * Calculate prediction for a ticket based on historical tribunal data
 *
 * Uses a tiered approach:
 * 1. Issuer + contravention specific stats (highest confidence)
 * 2. Contravention-only stats (medium confidence)
 * 3. Baseline overall success rate (low confidence)
 */
export async function calculatePrediction(ticket: {
  contraventionCode: string | null;
  issuer: string | null;
}): Promise<PredictionResult> {
  const issuerId = normalizeIssuerId(ticket.issuer || '');
  const contravention = ticket.contraventionCode || '';

  // Default result for when we have no data
  const defaultResult: PredictionResult = {
    percentage: 46, // Overall historical success rate
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

  if (!contravention) {
    return defaultResult;
  }

  try {
    // 1. Try issuer + contravention specific stats (most accurate)
    let issuerStats = null;
    if (issuerId) {
      issuerStats = await db.issuerContraventionStats.findUnique({
        where: {
          issuerId_contraventionCode: {
            issuerId,
            contraventionCode: contravention,
          },
        },
      });
    }

    // 2. Fall back to contravention-only stats
    const contraventionStats = await db.contraventionStats.findUnique({
      where: { contraventionCode: contravention },
    });

    // 3. Calculate score based on available data
    let percentage: number;
    let numberOfCases: number;
    let confidence: number;
    let statsLevel: PredictionResult['metadata']['statsLevel'];
    let lastUpdated: Date | null = null;

    // Minimum case thresholds for confidence
    const MIN_CASES_ISSUER = 10;
    const MIN_CASES_CONTRAVENTION = 30;

    if (issuerStats && issuerStats.totalCases >= MIN_CASES_ISSUER) {
      // High confidence: issuer + contravention specific
      percentage = Math.round(issuerStats.successRate * 100);
      numberOfCases = issuerStats.totalCases;
      // Confidence scales from 0.5 at 10 cases to 0.95 at 200+ cases
      confidence = Math.min(0.95, 0.5 + issuerStats.totalCases / 200);
      statsLevel = 'issuer_contravention';
      lastUpdated = issuerStats.lastUpdated;
    } else if (
      contraventionStats &&
      contraventionStats.totalCases >= MIN_CASES_CONTRAVENTION
    ) {
      // Medium confidence: contravention-only
      percentage = Math.round(contraventionStats.successRate * 100);
      numberOfCases = contraventionStats.totalCases;
      // Confidence scales from 0.4 at 30 cases to 0.8 at 500+ cases
      confidence = Math.min(0.8, 0.4 + contraventionStats.totalCases / 500);
      statsLevel = 'contravention';
      lastUpdated = contraventionStats.lastUpdated;
    } else {
      // Low confidence: baseline
      return defaultResult;
    }

    // 4. Fetch patterns (both winning and losing)
    const patterns = await db.appealPattern.findMany({
      where: {
        contraventionCode: contravention,
        OR: issuerId
          ? [{ issuerId }, { issuerId: null }]
          : [{ issuerId: null }],
      },
      orderBy: { frequency: 'desc' },
    });

    const winningPatterns = patterns
      .filter((p) => p.outcome === 'WINNING')
      .slice(0, 5)
      .map((p) => ({ pattern: p.pattern, frequency: p.frequency }));

    const losingPatterns = patterns
      .filter((p) => p.outcome === 'LOSING')
      .slice(0, 5)
      .map((p) => ({ pattern: p.pattern, frequency: p.frequency }));

    return {
      percentage,
      numberOfCases,
      confidence,
      metadata: {
        dataSource: 'london_tribunal',
        statsLevel,
        winningPatterns,
        losingPatterns,
        lastUpdated: lastUpdated?.toISOString() ?? null,
      },
    };
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

    // Map patterns to challenge reasons
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

    // Get unique recommended reasons from winning patterns
    const recommended = [
      ...new Set(
        winningPatterns
          .map((p) => PATTERN_TO_REASON[p.pattern])
          .filter(Boolean),
      ),
    ];

    // Get reasons to avoid from losing patterns
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
