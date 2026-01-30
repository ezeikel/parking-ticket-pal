/**
 * Import London Tribunal Cases from CSV
 *
 * This script imports tribunal cases from the scraped CSV file into the database.
 * It handles:
 * - Proper CSV parsing (handles quoted fields with embedded commas)
 * - Deduplication by case reference
 * - Normalization of authority names and contravention descriptions
 *
 * Usage:
 *   cd packages/db
 *   pnpm tsx scripts/import-tribunal-cases.ts /path/to/raw-appeals.csv.gz
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
config({ path: resolve(__dirname, '../../../apps/web/.env.local') });

// Now dynamically import prisma after env is loaded
const { prisma } = await import('../src/client.js');

import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import { normalizeAuthority, normalizeContravention } from './normalization.js';

// Map CSV appeal decision to enum
function mapAppealDecision(
  decision: string
): 'ALLOWED' | 'REFUSED' | 'PARTIALLY_ALLOWED' | 'WITHDRAWN' | 'STRUCK_OUT' | null {
  const normalized = decision?.trim()?.toLowerCase();
  if (normalized === 'appeal allowed') return 'ALLOWED';
  if (normalized === 'appeal refused') return 'REFUSED';
  if (normalized === 'appeal refused with recommendation') return 'PARTIALLY_ALLOWED';
  if (normalized === 'appeal withdrawn') return 'WITHDRAWN';
  if (normalized === 'struck out') return 'STRUCK_OUT';
  return null;
}

// Parse date from various formats
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr || dateStr === '-' || dateStr.trim() === '') return null;

  // Try parsing "DD Mon YYYY" format (e.g., "26 Nov 2024")
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

// Parse GBP amount
function parseAmount(amountStr: string | undefined): number | null {
  if (!amountStr) return null;
  const match = amountStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

async function importTribunalCases(csvPath: string) {
  console.log(`Starting import from: ${csvPath}`);
  console.log('---');

  const seenCaseRefs = new Set<string>();
  let totalRows = 0;
  let imported = 0;
  let skipped = 0;
  let duplicates = 0;
  let errors = 0;

  // Stats for normalization coverage
  const unmappedAuthorities = new Map<string, number>();
  const unmappedContraventions = new Map<string, number>();

  // Determine if gzipped
  const isGzipped = csvPath.endsWith('.gz');

  // Create read stream
  let inputStream: NodeJS.ReadableStream = createReadStream(csvPath);
  if (isGzipped) {
    inputStream = inputStream.pipe(createGunzip());
  }

  // Create CSV parser
  const parser = inputStream.pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      trim: true,
    })
  );

  const batch: Parameters<typeof prisma.londonTribunalCase.createMany>[0]['data'] = [];
  const BATCH_SIZE = 500;

  async function flushBatch() {
    if (batch.length === 0) return;

    try {
      await prisma.londonTribunalCase.createMany({
        data: batch,
        skipDuplicates: true,
      });
      imported += batch.length;
      console.log(`Imported ${imported} cases...`);
    } catch (error) {
      console.error('Batch insert error:', error);
      errors += batch.length;
    }

    batch.length = 0;
  }

  for await (const record of parser) {
    totalRows++;

    // Get case reference
    const caseRef = record['Case Reference']?.trim();
    if (!caseRef) {
      skipped++;
      continue;
    }

    // Check for duplicates
    if (seenCaseRefs.has(caseRef)) {
      duplicates++;
      continue;
    }
    seenCaseRefs.add(caseRef);

    // Parse and validate appeal decision
    const appealDecision = mapAppealDecision(record['Appeal Decision']);
    if (!appealDecision) {
      skipped++;
      continue;
    }

    // Get authority and contravention
    const authority = record['Authority']?.trim() || '';
    const contravention = record['Contravention']?.trim() || null;

    // Normalize
    const normalizedIssuer = normalizeAuthority(authority);
    const normalizedContravention = normalizeContravention(contravention);

    // Track unmapped values for analysis
    if (authority && !normalizedIssuer) {
      unmappedAuthorities.set(authority, (unmappedAuthorities.get(authority) || 0) + 1);
    }
    if (contravention && !normalizedContravention) {
      unmappedContraventions.set(
        contravention,
        (unmappedContraventions.get(contravention) || 0) + 1
      );
    }

    // Build record
    batch.push({
      caseReference: caseRef,
      declarant: record['Declarant']?.trim() || null,
      authority,
      normalizedIssuerId: normalizedIssuer,
      vrm: record['VRM']?.trim() || null,
      pcn: record['PCN']?.trim() || null,
      contraventionDate: parseDate(record['Contravention Date']),
      contraventionTime: record['Contravention Time']?.trim() || null,
      contraventionLocation: record['Contravention Location']?.trim() || null,
      penaltyAmount: parseAmount(record['Penalty Amount']),
      contravention,
      normalizedContraventionCode: normalizedContravention,
      referralDate: parseDate(record['Referral Date']),
      decisionDate: parseDate(record['Decision Date']),
      adjudicator: record['Adjudicator']?.trim() || null,
      appealDecision,
      direction: record['Direction']?.trim() || null,
      reasons: record['Reasons']?.trim() || '',
    });

    // Flush batch if full
    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
    }
  }

  // Flush remaining records
  await flushBatch();

  // Update data source record
  await prisma.appealDataSource.upsert({
    where: { name: 'london_tribunal' },
    update: {
      totalCases: imported,
      lastImport: new Date(),
    },
    create: {
      name: 'london_tribunal',
      description: 'London Tribunals appeal register (londontribunals.gov.uk)',
      totalCases: imported,
      lastImport: new Date(),
    },
  });

  // Print summary
  console.log('---');
  console.log('Import complete!');
  console.log(`  Total rows processed: ${totalRows}`);
  console.log(`  Successfully imported: ${imported}`);
  console.log(`  Skipped (invalid): ${skipped}`);
  console.log(`  Duplicates: ${duplicates}`);
  console.log(`  Errors: ${errors}`);

  // Print unmapped values (top 10)
  if (unmappedAuthorities.size > 0) {
    console.log('\n--- Unmapped Authorities (top 10) ---');
    const sorted = [...unmappedAuthorities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    for (const [auth, count] of sorted) {
      console.log(`  ${count}x: "${auth}"`);
    }
  }

  if (unmappedContraventions.size > 0) {
    console.log('\n--- Unmapped Contraventions (top 20) ---');
    const sorted = [...unmappedContraventions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    for (const [contrav, count] of sorted) {
      console.log(`  ${count}x: "${contrav}"`);
    }
  }

  await prisma.$disconnect();
}

// Main
const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: pnpm tsx scripts/import-tribunal-cases.ts /path/to/raw-appeals.csv.gz');
  process.exit(1);
}

importTribunalCases(csvPath).catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
