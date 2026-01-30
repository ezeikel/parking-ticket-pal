/**
 * Seed Tribunal Data to Production
 *
 * This script exports tribunal data from the development database and seeds it
 * to the production database. It handles:
 * - LondonTribunalCase (raw tribunal cases)
 * - ContraventionStats (aggregated stats by contravention)
 * - IssuerContraventionStats (aggregated stats by issuer + contravention)
 * - AppealPattern (GPT-extracted patterns)
 *
 * Usage:
 *   cd packages/db
 *
 *   # Export from dev to JSON files
 *   pnpm tsx scripts/seed-tribunal-data.ts export
 *
 *   # Import from JSON files to current DATABASE_URL (run against prod)
 *   DATABASE_URL=<prod_url> pnpm tsx scripts/seed-tribunal-data.ts import
 *
 *   # Or use Neon branch IDs directly
 *   pnpm tsx scripts/seed-tribunal-data.ts export --branch br-winter-feather-a4oxk7a5
 *   pnpm tsx scripts/seed-tribunal-data.ts import --branch br-red-sun-a4ynxrao
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { gzipSync, gunzipSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../../../apps/web/.env.local') });

const { prisma } = await import('../src/client.js');

const DATA_DIR = resolve(__dirname, '../data/tribunal-seed');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

async function exportData() {
  console.log('Exporting tribunal data from database...');
  console.log('---');

  // 1. Export LondonTribunalCase
  console.log('Exporting LondonTribunalCase...');
  const tribunalCases = await prisma.londonTribunalCase.findMany();
  writeFileSync(
    resolve(DATA_DIR, 'london-tribunal-cases.json.gz'),
    gzipSync(JSON.stringify(tribunalCases))
  );
  console.log(`  Exported ${tribunalCases.length} tribunal cases`);

  // 2. Export ContraventionStats
  console.log('Exporting ContraventionStats...');
  const contraventionStats = await prisma.contraventionStats.findMany();
  writeFileSync(
    resolve(DATA_DIR, 'contravention-stats.json.gz'),
    gzipSync(JSON.stringify(contraventionStats))
  );
  console.log(`  Exported ${contraventionStats.length} contravention stats`);

  // 3. Export IssuerContraventionStats
  console.log('Exporting IssuerContraventionStats...');
  const issuerStats = await prisma.issuerContraventionStats.findMany();
  writeFileSync(
    resolve(DATA_DIR, 'issuer-contravention-stats.json.gz'),
    gzipSync(JSON.stringify(issuerStats))
  );
  console.log(`  Exported ${issuerStats.length} issuer contravention stats`);

  // 4. Export AppealPattern
  console.log('Exporting AppealPattern...');
  const appealPatterns = await prisma.appealPattern.findMany();
  writeFileSync(
    resolve(DATA_DIR, 'appeal-patterns.json.gz'),
    gzipSync(JSON.stringify(appealPatterns))
  );
  console.log(`  Exported ${appealPatterns.length} appeal patterns`);

  console.log('---');
  console.log(`Export complete! Data saved to: ${DATA_DIR}`);
  console.log('\nFiles created (gzipped):');
  console.log('  - london-tribunal-cases.json.gz');
  console.log('  - contravention-stats.json.gz');
  console.log('  - issuer-contravention-stats.json.gz');
  console.log('  - appeal-patterns.json.gz');
}

async function importData() {
  console.log('Importing tribunal data to database...');
  console.log('---');

  // Check if data files exist
  const files = [
    'london-tribunal-cases.json.gz',
    'contravention-stats.json.gz',
    'issuer-contravention-stats.json.gz',
    'appeal-patterns.json.gz',
  ];

  for (const file of files) {
    if (!existsSync(resolve(DATA_DIR, file))) {
      console.error(`Missing data file: ${file}`);
      console.error(`Run 'pnpm tsx scripts/seed-tribunal-data.ts export' first`);
      process.exit(1);
    }
  }

  // Helper to read gzipped JSON
  const readGzippedJson = (filename: string) => {
    const compressed = readFileSync(resolve(DATA_DIR, filename));
    return JSON.parse(gunzipSync(compressed).toString('utf-8'));
  };

  // 1. Import LondonTribunalCase
  console.log('Importing LondonTribunalCase...');
  const tribunalCases = readGzippedJson('london-tribunal-cases.json.gz');

  // Clear existing data
  await prisma.londonTribunalCase.deleteMany();

  // Insert in batches
  const BATCH_SIZE = 1000;
  for (let i = 0; i < tribunalCases.length; i += BATCH_SIZE) {
    const batch = tribunalCases.slice(i, i + BATCH_SIZE).map((c: any) => ({
      ...c,
      appealDate: c.appealDate ? new Date(c.appealDate) : null,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    }));
    await prisma.londonTribunalCase.createMany({ data: batch });
    console.log(`  Imported ${Math.min(i + BATCH_SIZE, tribunalCases.length)}/${tribunalCases.length} tribunal cases`);
  }

  // 2. Import ContraventionStats
  console.log('Importing ContraventionStats...');
  const contraventionStats = readGzippedJson('contravention-stats.json.gz');
  await prisma.contraventionStats.deleteMany();
  await prisma.contraventionStats.createMany({
    data: contraventionStats.map((s: any) => ({
      ...s,
      lastUpdated: new Date(s.lastUpdated),
    })),
  });
  console.log(`  Imported ${contraventionStats.length} contravention stats`);

  // 3. Import IssuerContraventionStats
  console.log('Importing IssuerContraventionStats...');
  const issuerStats = readGzippedJson('issuer-contravention-stats.json.gz');
  await prisma.issuerContraventionStats.deleteMany();
  await prisma.issuerContraventionStats.createMany({
    data: issuerStats.map((s: any) => ({
      ...s,
      lastUpdated: new Date(s.lastUpdated),
    })),
  });
  console.log(`  Imported ${issuerStats.length} issuer contravention stats`);

  // 4. Import AppealPattern
  console.log('Importing AppealPattern...');
  const appealPatterns = readGzippedJson('appeal-patterns.json.gz');
  await prisma.appealPattern.deleteMany();
  await prisma.appealPattern.createMany({
    data: appealPatterns.map((p: any) => ({
      ...p,
      lastUpdated: new Date(p.lastUpdated),
    })),
  });
  console.log(`  Imported ${appealPatterns.length} appeal patterns`);

  console.log('---');
  console.log('Import complete!');
}

// Parse command line arguments
const command = process.argv[2];

if (command === 'export') {
  exportData()
    .then(() => prisma.$disconnect())
    .catch((error) => {
      console.error('Export failed:', error);
      process.exit(1);
    });
} else if (command === 'import') {
  importData()
    .then(() => prisma.$disconnect())
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
} else {
  console.log('Usage:');
  console.log('  pnpm tsx scripts/seed-tribunal-data.ts export  # Export from current DB');
  console.log('  pnpm tsx scripts/seed-tribunal-data.ts import  # Import to current DB');
  process.exit(1);
}
