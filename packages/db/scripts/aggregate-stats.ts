/**
 * Aggregate Tribunal Statistics
 *
 * This script aggregates appeal outcomes into statistics tables:
 * - ContraventionStats: Success rates by contravention code
 * - IssuerContraventionStats: Success rates by issuer + contravention
 *
 * Usage:
 *   cd packages/db
 *   pnpm tsx scripts/aggregate-stats.ts
 *
 * TODO: Move to worker repo when Prisma is added there
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from apps/web/.env.local BEFORE importing prisma
// __dirname = packages/db/scripts, so go up 3 levels to repo root
const envPath = resolve(__dirname, '../../../apps/web/.env.local');
config({ path: envPath });

// Dynamic import after env is loaded
const { prisma } = await import('../src/client.js');

async function aggregateStats() {
  console.log('Starting statistics aggregation...');
  console.log('---');

  // 1. Aggregate by contravention code only
  console.log('Aggregating by contravention code...');

  const contraventionGroups = await prisma.londonTribunalCase.groupBy({
    by: ['normalizedContraventionCode'],
    _count: { id: true },
    where: {
      normalizedContraventionCode: { not: null },
      appealDecision: { in: ['ALLOWED', 'REFUSED', 'PARTIALLY_ALLOWED'] },
    },
  });

  let contraventionStatsCount = 0;

  for (const group of contraventionGroups) {
    if (!group.normalizedContraventionCode) continue;

    // Get outcome breakdown
    const outcomes = await prisma.londonTribunalCase.groupBy({
      by: ['appealDecision'],
      _count: { id: true },
      where: {
        normalizedContraventionCode: group.normalizedContraventionCode,
        appealDecision: { in: ['ALLOWED', 'REFUSED', 'PARTIALLY_ALLOWED'] },
      },
    });

    const allowed = outcomes.find((o) => o.appealDecision === 'ALLOWED')?._count.id ?? 0;
    const refused = outcomes.find((o) => o.appealDecision === 'REFUSED')?._count.id ?? 0;
    const partial = outcomes.find((o) => o.appealDecision === 'PARTIALLY_ALLOWED')?._count.id ?? 0;
    const total = allowed + refused + partial;

    if (total === 0) continue;

    const successRate = (allowed + partial) / total;

    await prisma.contraventionStats.upsert({
      where: { contraventionCode: group.normalizedContraventionCode },
      update: {
        totalCases: total,
        allowedCount: allowed,
        refusedCount: refused,
        partiallyAllowedCount: partial,
        successRate,
        lastUpdated: new Date(),
      },
      create: {
        contraventionCode: group.normalizedContraventionCode,
        totalCases: total,
        allowedCount: allowed,
        refusedCount: refused,
        partiallyAllowedCount: partial,
        successRate,
      },
    });

    contraventionStatsCount++;
  }

  console.log(`  Created/updated ${contraventionStatsCount} contravention stats`);

  // 2. Aggregate by issuer + contravention
  console.log('Aggregating by issuer + contravention...');

  const issuerGroups = await prisma.londonTribunalCase.groupBy({
    by: ['normalizedIssuerId', 'normalizedContraventionCode'],
    _count: { id: true },
    where: {
      normalizedIssuerId: { not: null },
      normalizedContraventionCode: { not: null },
      appealDecision: { in: ['ALLOWED', 'REFUSED', 'PARTIALLY_ALLOWED'] },
    },
  });

  let issuerStatsCount = 0;

  for (const group of issuerGroups) {
    if (!group.normalizedIssuerId || !group.normalizedContraventionCode) continue;

    // Get outcome breakdown
    const outcomes = await prisma.londonTribunalCase.groupBy({
      by: ['appealDecision'],
      _count: { id: true },
      where: {
        normalizedIssuerId: group.normalizedIssuerId,
        normalizedContraventionCode: group.normalizedContraventionCode,
        appealDecision: { in: ['ALLOWED', 'REFUSED', 'PARTIALLY_ALLOWED'] },
      },
    });

    const allowed = outcomes.find((o) => o.appealDecision === 'ALLOWED')?._count.id ?? 0;
    const refused = outcomes.find((o) => o.appealDecision === 'REFUSED')?._count.id ?? 0;
    const partial = outcomes.find((o) => o.appealDecision === 'PARTIALLY_ALLOWED')?._count.id ?? 0;
    const total = allowed + refused + partial;

    if (total === 0) continue;

    const successRate = (allowed + partial) / total;

    await prisma.issuerContraventionStats.upsert({
      where: {
        issuerId_contraventionCode: {
          issuerId: group.normalizedIssuerId,
          contraventionCode: group.normalizedContraventionCode,
        },
      },
      update: {
        totalCases: total,
        allowedCount: allowed,
        refusedCount: refused,
        partiallyAllowedCount: partial,
        successRate,
        lastUpdated: new Date(),
      },
      create: {
        issuerId: group.normalizedIssuerId,
        contraventionCode: group.normalizedContraventionCode,
        totalCases: total,
        allowedCount: allowed,
        refusedCount: refused,
        partiallyAllowedCount: partial,
        successRate,
      },
    });

    issuerStatsCount++;
  }

  console.log(`  Created/updated ${issuerStatsCount} issuer+contravention stats`);

  // 3. Print summary of top contraventions by success rate
  console.log('\n--- Top 10 Contraventions by Success Rate (min 100 cases) ---');

  const topContraventions = await prisma.contraventionStats.findMany({
    where: { totalCases: { gte: 100 } },
    orderBy: { successRate: 'desc' },
    take: 10,
  });

  for (const stat of topContraventions) {
    console.log(
      `  ${stat.contraventionCode}: ${(stat.successRate * 100).toFixed(1)}% success (${stat.totalCases} cases)`
    );
  }

  console.log('\n--- Bottom 10 Contraventions by Success Rate (min 100 cases) ---');

  const bottomContraventions = await prisma.contraventionStats.findMany({
    where: { totalCases: { gte: 100 } },
    orderBy: { successRate: 'asc' },
    take: 10,
  });

  for (const stat of bottomContraventions) {
    console.log(
      `  ${stat.contraventionCode}: ${(stat.successRate * 100).toFixed(1)}% success (${stat.totalCases} cases)`
    );
  }

  // 4. Overall stats
  const overallStats = await prisma.londonTribunalCase.groupBy({
    by: ['appealDecision'],
    _count: { id: true },
    where: {
      appealDecision: { in: ['ALLOWED', 'REFUSED', 'PARTIALLY_ALLOWED'] },
    },
  });

  const totalAllowed = overallStats.find((o) => o.appealDecision === 'ALLOWED')?._count.id ?? 0;
  const totalRefused = overallStats.find((o) => o.appealDecision === 'REFUSED')?._count.id ?? 0;
  const totalPartial =
    overallStats.find((o) => o.appealDecision === 'PARTIALLY_ALLOWED')?._count.id ?? 0;
  const grandTotal = totalAllowed + totalRefused + totalPartial;

  console.log('\n--- Overall Statistics ---');
  console.log(`  Total cases with valid outcomes: ${grandTotal}`);
  console.log(`  Allowed: ${totalAllowed} (${((totalAllowed / grandTotal) * 100).toFixed(1)}%)`);
  console.log(`  Refused: ${totalRefused} (${((totalRefused / grandTotal) * 100).toFixed(1)}%)`);
  console.log(
    `  Partially Allowed: ${totalPartial} (${((totalPartial / grandTotal) * 100).toFixed(1)}%)`
  );
  console.log(
    `  Overall Success Rate: ${(((totalAllowed + totalPartial) / grandTotal) * 100).toFixed(1)}%`
  );

  console.log('\n---');
  console.log('Aggregation complete!');

  await prisma.$disconnect();
}

aggregateStats().catch((error) => {
  console.error('Aggregation failed:', error);
  process.exit(1);
});
