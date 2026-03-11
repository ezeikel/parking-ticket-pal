/**
 * Dry-run script: test AI extraction pipeline against document images.
 * Supports both windshield tickets and letters.
 * Uses the ACTUAL production flow: Google Vision OCR → text to GPT-5-mini.
 *
 * Expectations are loaded from scripts/fixtures/letter-expectations.json.
 * To add new test images:
 *   1. Drop the JPEG into scripts/fixtures/images/ (gitignored)
 *   2. Add an entry to scripts/fixtures/letter-expectations.json
 *
 * Usage:
 *   cd parking-ticket-pal
 *   npx tsx scripts/dry-run-letters.ts
 *   npx tsx scripts/dry-run-letters.ts --filter IMG_2594,IMG_2595
 *   npx tsx scripts/dry-run-letters.ts --image-dir /other/path
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load env
config({ path: resolve(__dirname, '../apps/web/.env.local') });

import vision from '@google-cloud/vision';
import { openai } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import { z } from 'zod';

// Inline DocumentSchema (avoids Next.js import resolution issues)
const DocumentSchema = z.object({
  documentType: z.enum(['TICKET', 'LETTER', 'UNRELATED']),
  pcnNumber: z.string(),
  vehicleRegistration: z.string(),
  type: z.enum(['PARKING_CHARGE_NOTICE', 'PENALTY_CHARGE_NOTICE']),
  issuedAt: z.string(),
  dateTimeOfContravention: z.string(),
  location: z.string().nullable(),
  firstSeen: z.string().nullable(),
  contraventionCode: z.string(),
  contraventionDescription: z.string().nullable(),
  initialAmount: z.number().int(),
  issuer: z.string(),
  issuerType: z.enum(['COUNCIL', 'TFL', 'PRIVATE_COMPANY']),
  discountedPaymentDeadline: z.string().nullable(),
  fullPaymentDeadline: z.string().nullable(),
  extractedText: z.string().nullable(),
  summary: z.string().nullable(),
  sentAt: z.string().nullable(),
  letterType: z
    .enum([
      'INITIAL_NOTICE',
      'NOTICE_TO_OWNER',
      'CHARGE_CERTIFICATE',
      'ORDER_FOR_RECOVERY',
      'CCJ_NOTICE',
      'FINAL_DEMAND',
      'BAILIFF_NOTICE',
      'APPEAL_RESPONSE',
      'APPEAL_ACCEPTED',
      'CHALLENGE_REJECTED',
      'APPEAL_REJECTED',
      'TE_FORM_RESPONSE',
      'PE_FORM_RESPONSE',
      'GENERIC',
    ])
    .nullable(),
  currentAmount: z.number().int().nullable(),
});

import { IMAGE_ANALYSIS_PROMPT } from '../apps/web/lib/ai/prompts';

const DEFAULT_IMAGE_DIR = resolve(__dirname, 'fixtures/images');
const FIXTURES_PATH = resolve(__dirname, 'fixtures/letter-expectations.json');
const model = openai('gpt-5-mini');

// ── Mapping from expected* fixture keys to actual AI output keys ─────
const FIELD_MAP: Record<string, string> = {
  expectedDocumentType: 'documentType',
  expectedLetterType: 'letterType',
  expectedPcn: 'pcnNumber',
  expectedIssuerType: 'issuerType',
  expectedType: 'type',
  expectedVrn: 'vehicleRegistration',
  expectedIssuer: 'issuer',
  expectedInitialAmount: 'initialAmount',
  expectedCurrentAmount: 'currentAmount',
  expectedContraventionCode: 'contraventionCode',
};

// ── CLI args ─────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  let imageDir = DEFAULT_IMAGE_DIR;
  let filter: string[] | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--image-dir' && args[i + 1]) {
      imageDir = args[++i];
    } else if (args[i] === '--filter' && args[i + 1]) {
      filter = args[++i].split(',').map((s) => s.trim());
    }
  }

  return { imageDir, filter };
}

// ── Load expectations from fixture file ──────────────────────────────
type Expectation = Record<string, any> & {
  group: string;
  description: string;
  _knownIssue?: string;
};

function loadExpectations(
  filter: string[] | null,
): Record<string, Expectation> {
  const raw = JSON.parse(readFileSync(FIXTURES_PATH, 'utf-8'));
  const all: Record<string, Expectation> = raw.images;

  if (!filter) return all;

  const filtered: Record<string, Expectation> = {};
  for (const key of filter) {
    if (all[key]) {
      filtered[key] = all[key];
    } else {
      console.warn(`  WARNING: ${key} not found in fixtures, skipping`);
    }
  }
  return filtered;
}

// ── Google Vision client (same as production) ────────────────────────
function getVisionClient() {
  const credentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
  if (!credentialsBase64)
    throw new Error('Google Vision credentials not found');
  const serviceAccountJson = JSON.parse(
    Buffer.from(credentialsBase64, 'base64').toString('utf8'),
  );
  return new vision.ImageAnnotatorClient({ credentials: serviceAccountJson });
}

// ── Same user prompt as production ───────────────────────────────────
function generateOcrAnalysisPrompt(ocrText: string) {
  return `Please extract the required details from the following OCR text extracted from a parking ticket image:\n\n${ocrText}`;
}

// ── Compare actual output against all expected* fields ───────────────
function checkExpectations(
  parsed: Record<string, any>,
  exp: Expectation,
): Record<string, { expected: any; actual: any; pass: boolean }> {
  const checks: Record<string, { expected: any; actual: any; pass: boolean }> =
    {};

  for (const [expKey, actualKey] of Object.entries(FIELD_MAP)) {
    const expectedVal = exp[expKey];
    if (expectedVal === undefined || expectedVal === null) continue;

    let actualVal = parsed[actualKey];

    // Normalize PCN — strip spaces for comparison
    if (actualKey === 'pcnNumber' && typeof actualVal === 'string') {
      actualVal = actualVal.replace(/\s/g, '');
    }
    const normalizedExpected =
      actualKey === 'pcnNumber' && typeof expectedVal === 'string'
        ? expectedVal.replace(/\s/g, '')
        : expectedVal;

    checks[actualKey] = {
      expected: expectedVal,
      actual: actualVal,
      pass: actualVal === normalizedExpected,
    };
  }

  return checks;
}

// ── Process a single image through the production flow ───────────────
async function processImage(
  visionClient: vision.ImageAnnotatorClient,
  imageName: string,
  exp: Expectation,
  imageDir: string,
) {
  const imagePath = resolve(imageDir, `${imageName}.jpg`);

  if (!existsSync(imagePath)) {
    return { image: imageName, error: `File not found: ${imagePath}`, exp };
  }

  const imageBuffer = readFileSync(imagePath);

  // Step 1: Google Vision OCR
  let ocrText: string;
  try {
    const [result] = await visionClient.textDetection({
      image: { content: imageBuffer },
    });
    ocrText = result.fullTextAnnotation?.text || '';
    if (!ocrText) {
      return {
        image: imageName,
        error: 'Google Vision: no text detected',
        exp,
      };
    }
  } catch (err) {
    return {
      image: imageName,
      error: `Google Vision failed: ${err instanceof Error ? err.message : err}`,
      exp,
    };
  }

  // Step 2: GPT-5-mini structured extraction from OCR text
  try {
    const result = (await generateText({
      model,
      // @ts-expect-error
      output: Output.object({
        schema: DocumentSchema,
        name: 'document',
        description: 'Structured parking ticket or letter document',
      }),
      system: IMAGE_ANALYSIS_PROMPT,
      prompt: generateOcrAnalysisPrompt(ocrText),
    })) as any;

    const parsed = result.output;
    const checks = checkExpectations(parsed, exp);
    const allPass = Object.values(checks).every((c) => c.pass);

    return {
      image: imageName,
      group: exp.group,
      description: exp.description,
      knownIssue: exp._knownIssue || null,
      ocrTextPreview: ocrText.slice(0, 200),
      checks,
      allPass,
      actual: {
        documentType: parsed.documentType,
        letterType: parsed.letterType,
        pcnNumber: parsed.pcnNumber,
        vehicleRegistration: parsed.vehicleRegistration,
        type: parsed.type,
        issuer: parsed.issuer,
        issuerType: parsed.issuerType,
        initialAmount: parsed.initialAmount,
        currentAmount: parsed.currentAmount,
        sentAt: parsed.sentAt,
        contraventionCode: parsed.contraventionCode,
        contraventionDescription: parsed.contraventionDescription,
        issuedAt: parsed.issuedAt,
        location: parsed.location,
      },
    };
  } catch (err) {
    return {
      image: imageName,
      error: `AI extraction failed: ${err instanceof Error ? err.message : err}`,
      exp,
    };
  }
}

async function main() {
  const { imageDir, filter } = parseArgs();
  const expectations = loadExpectations(filter);
  const imageNames = Object.keys(expectations).sort();

  if (imageNames.length === 0) {
    console.log('No images to process. Check fixtures and --filter flag.');
    return;
  }

  const visionClient = getVisionClient();
  console.log(`\nDry-run (production flow): Google Vision OCR → GPT-5-mini`);
  console.log(`Images: ${imageDir}`);
  console.log(`Processing ${imageNames.length} images...\n`);

  const results: any[] = [];

  // Process 3 at a time
  for (let i = 0; i < imageNames.length; i += 3) {
    const batch = imageNames.slice(i, i + 3);
    console.log(
      `  Batch ${Math.floor(i / 3) + 1}/${Math.ceil(imageNames.length / 3)}: ${batch.join(', ')}`,
    );
    const batchResults = await Promise.all(
      batch.map((name) =>
        processImage(visionClient, name, expectations[name], imageDir),
      ),
    );
    results.push(...batchResults);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('RESULTS');
  console.log('='.repeat(80) + '\n');

  let passes = 0;
  let fails = 0;
  let errors = 0;
  let knownIssues = 0;

  for (const r of results) {
    if (r.error) {
      console.log(`  ERROR  ${r.image}: ${r.error}`);
      errors++;
      continue;
    }

    if (r.allPass) {
      const fields = Object.entries(r.checks)
        .map(([k, v]: [string, any]) => `${k}=${v.actual}`)
        .join(', ');
      console.log(`  PASS   ${r.image}: ${fields}`);
      passes++;
    } else {
      const hasKnownIssue = !!r.knownIssue;
      const tag = hasKnownIssue ? 'KNOWN' : 'FAIL';
      if (hasKnownIssue) knownIssues++;
      else fails++;

      console.log(`  ${tag.padEnd(5)} ${r.image}: ${r.description}`);
      if (hasKnownIssue) {
        console.log(`         ⚠ ${r.knownIssue}`);
      }
      for (const [field, check] of Object.entries(r.checks) as [
        string,
        any,
      ][]) {
        if (!check.pass) {
          console.log(
            `         ${field}: expected=${check.expected}, got=${check.actual}`,
          );
        }
      }
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  const parts = [`${passes} passed`, `${fails} failed`];
  if (knownIssues > 0) parts.push(`${knownIssues} known issues`);
  if (errors > 0) parts.push(`${errors} errors`);
  console.log(`TOTAL: ${parts.join(', ')} out of ${results.length}`);
  console.log('='.repeat(80));

  // Write full results
  const outputPath = resolve(__dirname, 'dry-run-results.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results: ${outputPath}`);
}

main().catch(console.error);
