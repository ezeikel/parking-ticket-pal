/**
 * Backfill Predictions for Existing Tickets
 *
 * This script creates or updates predictions for tickets.
 * Run this after seeding tribunal data to production.
 *
 * Usage:
 *   cd packages/db
 *   pnpm tsx scripts/backfill-predictions.ts
 *
 * Options:
 *   --dry-run       Show what would be done without making changes
 *   --limit N       Process only N tickets (for testing)
 *   --refresh-all   Update ALL predictions, not just missing ones
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from apps/web/.env.local BEFORE importing prisma
config({ path: resolve(__dirname, '../../../apps/web/.env.local') });

const { prisma } = await import('../src/client.js');
const { PredictionType } = await import('../src/generated/prisma/client.js');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const refreshAll = args.includes('--refresh-all');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : undefined;

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
 * Calculate prediction for a ticket based on historical tribunal data
 * (Simplified version of the prediction service for the backfill script)
 */
async function calculatePrediction(ticket: {
  contraventionCode: string | null;
  issuer: string | null;
}) {
  const issuerId = normalizeIssuerId(ticket.issuer || '');
  const contravention = ticket.contraventionCode || '';

  // Default result for when we have no data
  const defaultResult = {
    percentage: 46,
    numberOfCases: 0,
    confidence: 0.3,
    metadata: {
      dataSource: 'london_tribunal',
      statsLevel: 'baseline' as const,
      winningPatterns: [] as Array<{ pattern: string; frequency: number }>,
      losingPatterns: [] as Array<{ pattern: string; frequency: number }>,
      lastUpdated: null as string | null,
    },
  };

  if (!contravention) {
    return defaultResult;
  }

  try {
    // 1. Try issuer + contravention specific stats
    let issuerStats = null;
    if (issuerId) {
      issuerStats = await prisma.issuerContraventionStats.findUnique({
        where: {
          issuerId_contraventionCode: {
            issuerId,
            contraventionCode: contravention,
          },
        },
      });
    }

    // 2. Fall back to contravention-only stats
    const contraventionStats = await prisma.contraventionStats.findUnique({
      where: { contraventionCode: contravention },
    });

    // 3. Calculate score based on available data
    let percentage: number;
    let numberOfCases: number;
    let confidence: number;
    let statsLevel: 'issuer_contravention' | 'contravention' | 'baseline';
    let lastUpdated: Date | null = null;

    const MIN_CASES_ISSUER = 10;
    const MIN_CASES_CONTRAVENTION = 30;

    if (issuerStats && issuerStats.totalCases >= MIN_CASES_ISSUER) {
      percentage = Math.round(issuerStats.successRate * 100);
      numberOfCases = issuerStats.totalCases;
      confidence = Math.min(0.95, 0.5 + issuerStats.totalCases / 200);
      statsLevel = 'issuer_contravention';
      lastUpdated = issuerStats.lastUpdated;
    } else if (
      contraventionStats &&
      contraventionStats.totalCases >= MIN_CASES_CONTRAVENTION
    ) {
      percentage = Math.round(contraventionStats.successRate * 100);
      numberOfCases = contraventionStats.totalCases;
      confidence = Math.min(0.8, 0.4 + contraventionStats.totalCases / 500);
      statsLevel = 'contravention';
      lastUpdated = contraventionStats.lastUpdated;
    } else {
      return defaultResult;
    }

    // 4. Fetch patterns
    const patterns = await prisma.appealPattern.findMany({
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
    console.error('Error calculating prediction:', error);
    return defaultResult;
  }
}

async function backfillPredictions() {
  console.log('Backfill Predictions for Existing Tickets');
  console.log('=========================================');
  if (isDryRun) {
    console.log('DRY RUN MODE - no changes will be made');
  }
  if (refreshAll) {
    console.log('REFRESH ALL MODE - updating all predictions');
  }
  if (limit) {
    console.log(`LIMIT: Processing only ${limit} tickets`);
  }
  console.log('');

  // Find tickets to process
  const tickets = await prisma.ticket.findMany({
    where: refreshAll
      ? {} // All tickets
      : { prediction: null }, // Only tickets without predictions
    select: {
      id: true,
      contraventionCode: true,
      issuer: true,
      prediction: {
        select: {
          percentage: true,
        },
      },
    },
    take: limit,
  });

  const mode = refreshAll ? 'to refresh' : 'without predictions';
  console.log(`Found ${tickets.length} tickets ${mode}\n`);

  if (tickets.length === 0) {
    console.log('No tickets to process!');
    return;
  }

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const ticket of tickets) {
    try {
      const prediction = await calculatePrediction({
        contraventionCode: ticket.contraventionCode,
        issuer: ticket.issuer,
      });

      const hasPrediction = ticket.prediction !== null;
      const oldPercentage = ticket.prediction?.percentage;

      if (isDryRun) {
        if (hasPrediction) {
          console.log(
            `[DRY RUN] Would update prediction for ticket ${ticket.id}: ${oldPercentage}% -> ${prediction.percentage}% (${prediction.metadata.statsLevel})`
          );
        } else {
          console.log(
            `[DRY RUN] Would create prediction for ticket ${ticket.id}: ${prediction.percentage}% (${prediction.metadata.statsLevel})`
          );
        }
      } else {
        await prisma.prediction.upsert({
          where: { ticketId: ticket.id },
          update: {
            percentage: prediction.percentage,
            numberOfCases: prediction.numberOfCases,
            confidence: prediction.confidence,
            metadata: prediction.metadata,
            lastUpdated: new Date(),
          },
          create: {
            ticketId: ticket.id,
            type: PredictionType.CHALLENGE_SUCCESS,
            percentage: prediction.percentage,
            numberOfCases: prediction.numberOfCases,
            confidence: prediction.confidence,
            metadata: prediction.metadata,
            lastUpdated: new Date(),
          },
        });

        if (hasPrediction) {
          console.log(
            `Updated prediction for ticket ${ticket.id}: ${oldPercentage}% -> ${prediction.percentage}% (${prediction.metadata.statsLevel})`
          );
          updated++;
        } else {
          console.log(
            `Created prediction for ticket ${ticket.id}: ${prediction.percentage}% (${prediction.metadata.statsLevel})`
          );
          created++;
        }
      }

      if (isDryRun) {
        hasPrediction ? updated++ : created++;
      }
    } catch (error) {
      console.error(`Failed to process prediction for ticket ${ticket.id}:`, error);
      failed++;
    }
  }

  console.log('\n=========================================');
  console.log(`Backfill complete!`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed: ${failed}`);
  if (isDryRun) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

backfillPredictions()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
