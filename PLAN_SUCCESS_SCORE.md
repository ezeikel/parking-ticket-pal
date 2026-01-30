# Success Score Feature - Implementation Plan

## Progress Tracker

| Step | Status | Notes |
|------|--------|-------|
| 1. Prisma schema changes | ✅ DONE | Added AppealDataSource, ContraventionStats, IssuerContraventionStats, AppealPattern models |
| 2. Database migration | ✅ DONE | Migration `20260129222743_add_success_score_prediction_models` applied |
| 3. Normalization mappings | ✅ DONE | Created `packages/db/scripts/normalization.ts` |
| 4. Import script | ✅ DONE | Created `packages/db/scripts/import-tribunal-cases.ts` |
| 5. Aggregation script | ✅ DONE | Created `packages/db/scripts/aggregate-stats.ts` |
| 6. Pattern extraction script | ✅ DONE | Created `packages/db/scripts/extract-patterns.ts` (GPT-5.2) |
| 7. Prediction service | ✅ DONE | Created `apps/web/services/prediction-service.ts` |
| 8. ticket-service update | ✅ DONE | Updated to use `calculatePrediction()` |
| 9. RecommendedReasons UI | ✅ DONE | Created `apps/web/components/RecommendedReasons/` |
| 10. Integration into dialogs | ✅ DONE | Added to GenerateLetterDialog and AutoChallengeDialog |
| 11. Delete legacy ChallengeStats | ⏳ PENDING | ChallengeStats.tsx, TicketDetail.tsx, TicketUpsellCTA.tsx appear unused |

**Note**: Scripts are in `packages/db/scripts/` for now (not worker) since worker lacks Prisma.

## Next Steps to Complete

1. **Run the data import** (one-time):
   ```bash
   cd packages/db
   pnpm tsx scripts/import-tribunal-cases.ts /path/to/raw-appeals.csv.gz
   ```

2. **Run aggregation** (after import):
   ```bash
   cd packages/db
   pnpm tsx scripts/aggregate-stats.ts
   ```

3. **Run pattern extraction** (optional, costs money):
   ```bash
   cd packages/db
   pnpm tsx scripts/extract-patterns.ts --limit 100 --dry-run  # Test first
   pnpm tsx scripts/extract-patterns.ts  # Full run
   ```

4. **Delete legacy components** (after verifying they're unused):
   - `apps/web/components/ChallengeStats/`
   - `apps/web/components/TicketDetail/`
   - `apps/web/components/TicketUpsellCTA/`

---

## Overview

Transform the hardcoded 50% success score into a data-driven predictive system that:
1. Analyzes historical London Tribunal appeal outcomes
2. Provides per-ticket success likelihood based on contravention + issuer combinations
3. Recommends optimal challenge reasons based on winning/losing patterns
4. Designed for multiple data sources (London Tribunal first, others later)

---

## Key Decisions

- **AI Model**: GPT-5.2 for pattern extraction from adjudicator reasoning
- **Code Location**: Import/aggregation/AI analysis in **worker**, prediction service in **main repo**
- **Storage**: Pre-computed stats in shared Neon DB
- **Patterns**: Store both **winning AND losing** patterns for better guidance
- **Data Approach**: Static CSV import for now; daily updates later

---

## Current Scope

### What We're Building Now
- One-time import of static CSV (~82k cases)
- Aggregation into stats tables
- Pattern extraction via GPT-5.2
- Prediction service using pre-computed stats
- Challenge reason recommendations UI

### What's Deferred (TODOs)
- Daily CSV update pipeline
- Incremental import logic
- Multiple data sources (POPLA, IAS, user outcomes)
- Webhook triggers from scraper

---

## Data Available

- **82,770 scraped tribunal cases** (raw-appeals.csv.gz)
- **~13,432 duplicate case references** (need deduplication)
- **Outcome breakdown**: 45.6% allowed, 53.8% refused, 0.6% refused with recommendation
- **Fields**: authority, contravention, appealDecision, reasons (full adjudicator reasoning)

### Data Quality Issues
1. ~24,600 rows have empty/malformed data (column misalignment from commas in "Reasons" field)
2. Need to parse with proper CSV handling (quoted fields)
3. Some contravention descriptions are truncated or have GBP amounts instead

---

## Architecture

### Data Flow (Current - Static)

```
[Static CSV: raw-appeals.csv.gz]
       ↓
[Worker: One-time Import] ──→ [LondonTribunalCase table]
       ↓
[Worker: One-time Aggregation] ──→ [ContraventionStats, IssuerContraventionStats]
       ↓
[Worker: One-time GPT-5.2 Extraction] ──→ [AppealPattern table]
       ↓
[Main App: Prediction Service] ←── queries stats tables
       ↓
[Prediction stored per ticket]
```

### Data Flow (Future - Daily Updates)

```
TODO: When daily pipeline is needed:

[Scraper on Hetzner - daily]
       ↓
[Master CSV: data/master/appeals.csv]
       ↓
[Worker: Incremental Import] ──→ [LondonTribunalCase table]
       ↓
[Worker: Re-aggregate Stats] ──→ [Stats tables updated]
       ↓
[Worker: Extract patterns for new cases only]
```

---

## Phase 1: Database Schema

### New Models (add to `packages/db/prisma/schema.prisma`)

```prisma
// Track data sources for future extensibility
model AppealDataSource {
  id          String   @id @default(cuid())
  name        String   @unique // "london_tribunal", "popla", "ias", "user_outcomes"
  description String?
  weight      Float    @default(1.0) // for weighted averaging across sources
  totalCases  Int      @default(0)
  isActive    Boolean  @default(true)
  lastImport  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("appeal_data_sources")
}

// Aggregated stats by contravention code only
model ContraventionStats {
  id                    String   @id @default(cuid())
  contraventionCode     String   @unique // e.g., "46", "12", "MT_BUS_LANE"
  totalCases            Int
  allowedCount          Int
  refusedCount          Int
  partiallyAllowedCount Int
  successRate           Float    // (allowed + partiallyAllowed) / total
  lastUpdated           DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("contravention_stats")
}

// Aggregated stats by issuer + contravention (more specific)
model IssuerContraventionStats {
  id                    String   @id @default(cuid())
  issuerId              String   // normalized: "tfl", "lewisham", etc.
  contraventionCode     String
  totalCases            Int
  allowedCount          Int
  refusedCount          Int
  partiallyAllowedCount Int
  successRate           Float
  lastUpdated           DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([issuerId, contraventionCode])
  @@index([issuerId])
  @@index([contraventionCode])
  @@map("issuer_contravention_stats")
}

// Extracted patterns from adjudicator reasoning (winning AND losing)
model AppealPattern {
  id                String         @id @default(cuid())
  contraventionCode String
  issuerId          String?        // null = applies to all issuers
  pattern           String         // e.g., "SIGNAGE_INADEQUATE", "LOADING_EXEMPTION"
  outcome           PatternOutcome // WINNING or LOSING
  frequency         Int            // count of cases with this pattern
  exampleCaseRefs   String[]       // sample case references
  lastUpdated       DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@unique([contraventionCode, issuerId, pattern, outcome])
  @@index([contraventionCode])
  @@index([outcome])
  @@map("appeal_patterns")
}

enum PatternOutcome {
  WINNING
  LOSING
}
```

### Update Existing LondonTribunalCase

```prisma
// Add sourceId to existing model for future multi-source support
model LondonTribunalCase {
  // ... existing fields ...

  // TODO: Add when implementing multi-source
  // sourceId String?
  // source   AppealDataSource? @relation(fields: [sourceId], references: [id])
}
```

---

## Phase 2: Worker - Import Script

**File**: `parking-ticket-pal-worker/src/scripts/import-tribunal-cases.ts`

### Responsibilities
1. Parse CSV with proper handling of quoted "Reasons" field
2. Deduplicate by `caseReference`
3. Normalize authority names → issuer IDs
4. Normalize contravention descriptions → contravention codes
5. Insert into `LondonTribunalCase` table

### Normalization Mappings

**File**: `parking-ticket-pal-worker/src/utils/normalization.ts`

```typescript
export const AUTHORITY_TO_ISSUER: Record<string, string> = {
  'Transport for London': 'tfl',
  'London Borough of Lewisham': 'lewisham',
  'London Borough of Lambeth': 'lambeth',
  'London Borough of Camden': 'camden',
  'London Borough of Hackney': 'hackney',
  'London Borough of Islington': 'islington',
  'London Borough of Southwark': 'southwark',
  'London Borough of Haringey': 'haringey',
  'London Borough of Newham': 'newham',
  'London Borough of Redbridge': 'redbridge',
  'City of Westminster': 'westminster',
  'Royal Borough of Greenwich': 'greenwich',
  'London Borough of Barnet': 'barnet',
  'London Borough of Havering': 'havering',
  'London Borough of Barking and Dagenham': 'barking-and-dagenham',
  'London Borough of Waltham Forest': 'waltham-forest',
  'London Borough of Brent': 'brent',
  'London Borough of Croydon': 'croydon',
  'London Borough of Hounslow': 'hounslow',
  'London Borough of Hammersmith and Fulham': 'hammersmith-and-fulham',
  'London Borough of Ealing': 'ealing',
  'London Borough of Tower Hamlets': 'tower-hamlets',
  'London Borough of Harrow': 'harrow',
  'London Borough of Enfield': 'enfield',
  'London Borough of Merton': 'merton',
  'Royal Borough of Kingston Upon Thames': 'kingston-upon-thames',
  'London Borough of Wandsworth': 'wandsworth',
  'Royal Borough of Kensington and Chelsea': 'kensington-and-chelsea',
  'London Borough of Bexley': 'bexley',
  'London Borough of Hillingdon': 'hillingdon',
  'London Borough of Richmond upon Thames': 'richmond-upon-thames',
  'London Borough of Sutton': 'sutton',
  'London Borough of Bromley': 'bromley',
};

export const CONTRAVENTION_TO_CODE: Record<string, string> = {
  // Parking contraventions
  'Stopped where prohibited on red route or clearway': '46',
  'Parked resident/shared use without a valid permit': '12',
  'Parked in a restricted street during prescribed hours': '01',
  'Parked without payment of the parking charge': '12',
  'Footway parking': '62',
  'Parked or loading/unloading during a loading ban': '02',
  'Parked in permit space without a valid permit': '16',
  'Parked wholly/partly in a suspended bay or space': '21',
  'Stopped on a restricted bus stop or stand': '47',
  'Parked in a loading place without loading': '25',
  'Parked in disabled bay without displaying badge': '40',
  'Parked adjacent to a dropped footway': '27',
  'Parked - place not designated for class of vehicle': '23',
  'Parked res/sh use - invalid permit/after paid time': '12',
  'Parked after the expiry of paid for time': '12',

  // TfL moving traffic contraventions
  'Fail comply prohibition on certain types vehicle': 'MT_VEHICLE_PROHIBITION',
  'Fail comply restriction vehicles entering ped zone': 'MT_PED_ZONE',
  'Entering and stopping in a box junction': 'MT_BOX_JUNCTION',
  'Performing a prohibited turn': 'MT_PROHIBITED_TURN',
  'Being in a bus lane': 'MT_BUS_LANE',
  'Using a route restricted to certain vehicles': 'MT_RESTRICTED_ROUTE',
  'Fail proceed in direction shown by arrow blue sign': 'MT_DIRECTION',
  'Failing to comply with a no entry sign': 'MT_NO_ENTRY',
  'Failing to comply with a keep left/right sign': 'MT_KEEP_LEFT_RIGHT',
  'Failing to comply with a one-way restriction': 'MT_ONE_WAY',
  'No Valid HGV safety permit': 'MT_HGV_PERMIT',
};

export function normalizeAuthority(authority: string): string | null {
  return AUTHORITY_TO_ISSUER[authority] ?? null;
}

export function normalizeContravention(contravention: string): string | null {
  return CONTRAVENTION_TO_CODE[contravention] ?? null;
}
```

### Import Script

```typescript
// parking-ticket-pal-worker/src/scripts/import-tribunal-cases.ts

import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import { db } from '../db';
import { normalizeAuthority, normalizeContravention } from '../utils/normalization';

const CSV_PATH = '/path/to/raw-appeals.csv.gz';

async function importTribunalCases() {
  console.log('Starting tribunal case import...');

  const seenCaseRefs = new Set<string>();
  let imported = 0;
  let skipped = 0;
  let duplicates = 0;

  const parser = createReadStream(CSV_PATH)
    .pipe(createGunzip())
    .pipe(parse({
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    }));

  const batch: any[] = [];
  const BATCH_SIZE = 500;

  for await (const record of parser) {
    const caseRef = record['Case Reference']?.trim();

    // Skip if no case reference or duplicate
    if (!caseRef) {
      skipped++;
      continue;
    }
    if (seenCaseRefs.has(caseRef)) {
      duplicates++;
      continue;
    }
    seenCaseRefs.add(caseRef);

    // Skip if no valid appeal decision
    const appealDecision = record['Appeal Decision']?.trim();
    if (!['Appeal allowed', 'Appeal refused', 'Appeal refused with recommendation'].includes(appealDecision)) {
      skipped++;
      continue;
    }

    // Normalize fields
    const normalizedIssuer = normalizeAuthority(record['Authority']?.trim());
    const normalizedContravention = normalizeContravention(record['Contravention']?.trim());

    batch.push({
      caseReference: caseRef,
      declarant: record['Declarant']?.trim() || null,
      authority: record['Authority']?.trim() || '',
      normalizedIssuerId: normalizedIssuer,
      vrm: record['VRM']?.trim() || null,
      pcn: record['PCN']?.trim() || null,
      contraventionDate: parseDate(record['Contravention Date']),
      contraventionTime: record['Contravention Time']?.trim() || null,
      contraventionLocation: record['Contravention Location']?.trim() || null,
      penaltyAmount: parseAmount(record['Penalty Amount']),
      contravention: record['Contravention']?.trim() || null,
      normalizedContraventionCode: normalizedContravention,
      referralDate: parseDate(record['Referral Date']),
      decisionDate: parseDate(record['Decision Date']),
      adjudicator: record['Adjudicator']?.trim() || null,
      appealDecision: mapAppealDecision(appealDecision),
      direction: record['Direction']?.trim() || null,
      reasons: record['Reasons']?.trim() || '',
    });

    if (batch.length >= BATCH_SIZE) {
      await insertBatch(batch);
      imported += batch.length;
      console.log(`Imported ${imported} cases...`);
      batch.length = 0;
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    await insertBatch(batch);
    imported += batch.length;
  }

  console.log(`Import complete: ${imported} imported, ${duplicates} duplicates, ${skipped} skipped`);

  // Update data source record
  await db.appealDataSource.upsert({
    where: { name: 'london_tribunal' },
    update: { totalCases: imported, lastImport: new Date() },
    create: { name: 'london_tribunal', description: 'London Tribunals appeal register', totalCases: imported, lastImport: new Date() },
  });
}

async function insertBatch(batch: any[]) {
  await db.londonTribunalCase.createMany({
    data: batch,
    skipDuplicates: true,
  });
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr || dateStr === '-') return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseAmount(amountStr: string | undefined): number | null {
  if (!amountStr) return null;
  const match = amountStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function mapAppealDecision(decision: string): 'ALLOWED' | 'REFUSED' | 'PARTIALLY_ALLOWED' {
  if (decision === 'Appeal allowed') return 'ALLOWED';
  if (decision === 'Appeal refused with recommendation') return 'PARTIALLY_ALLOWED';
  return 'REFUSED';
}

// Run
importTribunalCases().catch(console.error);
```

---

## Phase 3: Worker - Aggregation Script

**File**: `parking-ticket-pal-worker/src/scripts/aggregate-stats.ts`

```typescript
import { db } from '../db';

async function aggregateStats() {
  console.log('Starting stats aggregation...');

  // 1. Aggregate by contravention code
  const contraventionGroups = await db.londonTribunalCase.groupBy({
    by: ['normalizedContraventionCode'],
    _count: { id: true },
    where: {
      normalizedContraventionCode: { not: null },
      appealDecision: { in: ['ALLOWED', 'REFUSED', 'PARTIALLY_ALLOWED'] },
    },
  });

  for (const group of contraventionGroups) {
    if (!group.normalizedContraventionCode) continue;

    const outcomes = await db.londonTribunalCase.groupBy({
      by: ['appealDecision'],
      _count: { id: true },
      where: { normalizedContraventionCode: group.normalizedContraventionCode },
    });

    const allowed = outcomes.find(o => o.appealDecision === 'ALLOWED')?._count.id ?? 0;
    const refused = outcomes.find(o => o.appealDecision === 'REFUSED')?._count.id ?? 0;
    const partial = outcomes.find(o => o.appealDecision === 'PARTIALLY_ALLOWED')?._count.id ?? 0;
    const total = allowed + refused + partial;

    if (total === 0) continue;

    await db.contraventionStats.upsert({
      where: { contraventionCode: group.normalizedContraventionCode },
      update: {
        totalCases: total,
        allowedCount: allowed,
        refusedCount: refused,
        partiallyAllowedCount: partial,
        successRate: (allowed + partial) / total,
        lastUpdated: new Date(),
      },
      create: {
        contraventionCode: group.normalizedContraventionCode,
        totalCases: total,
        allowedCount: allowed,
        refusedCount: refused,
        partiallyAllowedCount: partial,
        successRate: (allowed + partial) / total,
      },
    });
  }

  console.log(`Aggregated ${contraventionGroups.length} contravention codes`);

  // 2. Aggregate by issuer + contravention
  const issuerGroups = await db.londonTribunalCase.groupBy({
    by: ['normalizedIssuerId', 'normalizedContraventionCode'],
    _count: { id: true },
    where: {
      normalizedIssuerId: { not: null },
      normalizedContraventionCode: { not: null },
      appealDecision: { in: ['ALLOWED', 'REFUSED', 'PARTIALLY_ALLOWED'] },
    },
  });

  for (const group of issuerGroups) {
    if (!group.normalizedIssuerId || !group.normalizedContraventionCode) continue;

    const outcomes = await db.londonTribunalCase.groupBy({
      by: ['appealDecision'],
      _count: { id: true },
      where: {
        normalizedIssuerId: group.normalizedIssuerId,
        normalizedContraventionCode: group.normalizedContraventionCode,
      },
    });

    const allowed = outcomes.find(o => o.appealDecision === 'ALLOWED')?._count.id ?? 0;
    const refused = outcomes.find(o => o.appealDecision === 'REFUSED')?._count.id ?? 0;
    const partial = outcomes.find(o => o.appealDecision === 'PARTIALLY_ALLOWED')?._count.id ?? 0;
    const total = allowed + refused + partial;

    if (total === 0) continue;

    await db.issuerContraventionStats.upsert({
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
        successRate: (allowed + partial) / total,
        lastUpdated: new Date(),
      },
      create: {
        issuerId: group.normalizedIssuerId,
        contraventionCode: group.normalizedContraventionCode,
        totalCases: total,
        allowedCount: allowed,
        refusedCount: refused,
        partiallyAllowedCount: partial,
        successRate: (allowed + partial) / total,
      },
    });
  }

  console.log(`Aggregated ${issuerGroups.length} issuer+contravention combinations`);
}

aggregateStats().catch(console.error);
```

---

## Phase 4: Worker - Pattern Extraction with GPT-5.2

**File**: `parking-ticket-pal-worker/src/scripts/extract-patterns.ts`

### Pattern Categories

```typescript
export const PATTERN_CATEGORIES = [
  // Winning patterns - procedural/evidence
  'SIGNAGE_INADEQUATE',
  'CCTV_UNCLEAR',
  'EVIDENCE_INSUFFICIENT',
  'PROCEDURAL_ERROR',
  'TMO_INVALID',
  'TIME_DISCREPANCY',

  // Winning patterns - exemptions
  'LOADING_EXEMPTION',
  'PERMIT_WAS_VALID',
  'BLUE_BADGE_DISPLAYED',
  'VEHICLE_SOLD',
  'VEHICLE_STOLEN',
  'HIRE_VEHICLE',

  // Losing patterns
  'NO_EVIDENCE_PROVIDED',
  'LATE_APPEAL',
  'ADMITTED_CONTRAVENTION',
  'MITIGATION_ONLY',
  'SIGNAGE_WAS_ADEQUATE',
  'CCTV_CLEAR',
  'NO_LOADING_ACTIVITY',
  'PERMIT_EXPIRED',
] as const;

export const PATTERN_TO_CHALLENGE_REASON: Record<string, string> = {
  // Maps patterns to COUNCIL_CHALLENGE_REASONS
  'SIGNAGE_INADEQUATE': 'PROCEDURAL_IMPROPRIETY',
  'PROCEDURAL_ERROR': 'PROCEDURAL_IMPROPRIETY',
  'TMO_INVALID': 'INVALID_TMO',
  'LOADING_EXEMPTION': 'CONTRAVENTION_DID_NOT_OCCUR',
  'PERMIT_WAS_VALID': 'CONTRAVENTION_DID_NOT_OCCUR',
  'BLUE_BADGE_DISPLAYED': 'CONTRAVENTION_DID_NOT_OCCUR',
  'VEHICLE_SOLD': 'NOT_VEHICLE_OWNER',
  'VEHICLE_STOLEN': 'VEHICLE_STOLEN',
  'HIRE_VEHICLE': 'HIRE_FIRM',
  'CCTV_UNCLEAR': 'CONTRAVENTION_DID_NOT_OCCUR',
  'EVIDENCE_INSUFFICIENT': 'CONTRAVENTION_DID_NOT_OCCUR',
  'TIME_DISCREPANCY': 'CONTRAVENTION_DID_NOT_OCCUR',
};
```

### Extraction Script

```typescript
import OpenAI from 'openai';
import { db } from '../db';
import { PATTERN_CATEGORIES } from './pattern-categories';

const openai = new OpenAI();

async function extractPatterns() {
  console.log('Starting pattern extraction...');

  // Get cases with reasons text
  const cases = await db.londonTribunalCase.findMany({
    where: {
      reasons: { not: '' },
      appealDecision: { in: ['ALLOWED', 'REFUSED'] },
      normalizedContraventionCode: { not: null },
    },
    select: {
      id: true,
      caseReference: true,
      normalizedContraventionCode: true,
      normalizedIssuerId: true,
      appealDecision: true,
      reasons: true,
    },
  });

  console.log(`Processing ${cases.length} cases...`);

  // Process in batches
  const BATCH_SIZE = 20;
  let processed = 0;

  for (let i = 0; i < cases.length; i += BATCH_SIZE) {
    const batch = cases.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (caseData) => {
      try {
        const patterns = await extractPatternsFromCase(caseData);
        const outcome = caseData.appealDecision === 'ALLOWED' ? 'WINNING' : 'LOSING';

        for (const pattern of patterns) {
          await db.appealPattern.upsert({
            where: {
              contraventionCode_issuerId_pattern_outcome: {
                contraventionCode: caseData.normalizedContraventionCode!,
                issuerId: caseData.normalizedIssuerId,
                pattern,
                outcome,
              },
            },
            update: {
              frequency: { increment: 1 },
              exampleCaseRefs: {
                push: caseData.caseReference,
              },
              lastUpdated: new Date(),
            },
            create: {
              contraventionCode: caseData.normalizedContraventionCode!,
              issuerId: caseData.normalizedIssuerId,
              pattern,
              outcome,
              frequency: 1,
              exampleCaseRefs: [caseData.caseReference],
            },
          });
        }
      } catch (error) {
        console.error(`Error processing case ${caseData.caseReference}:`, error);
      }
    }));

    processed += batch.length;
    console.log(`Processed ${processed}/${cases.length} cases`);

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('Pattern extraction complete');
}

async function extractPatternsFromCase(caseData: {
  appealDecision: string;
  reasons: string;
}): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages: [
      {
        role: 'system',
        content: `You analyze UK parking tribunal decisions. Extract key reasons for the appeal outcome.

Return JSON with a "patterns" array containing codes from this list ONLY:
${PATTERN_CATEGORIES.join(', ')}

Rules:
- Only include patterns explicitly mentioned or strongly implied
- Return empty array if no clear patterns
- Maximum 3 patterns per case`,
      },
      {
        role: 'user',
        content: `Appeal Decision: ${caseData.appealDecision}\n\nAdjudicator Reasoning:\n${caseData.reasons.slice(0, 3000)}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 100,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  return (result.patterns || []).filter((p: string) => PATTERN_CATEGORIES.includes(p as any));
}

extractPatterns().catch(console.error);
```

---

## Phase 5: Main App - Prediction Service

**File**: `parking-ticket-pal/apps/web/services/prediction-service.ts`

```typescript
import { db } from '@parking-ticket-pal/db';

type PredictionResult = {
  percentage: number;
  numberOfCases: number;
  confidence: number;
  metadata: {
    dataSource: string;
    statsLevel: 'issuer_contravention' | 'contravention' | 'baseline';
    winningPatterns: Array<{ pattern: string; frequency: number }>;
    losingPatterns: Array<{ pattern: string; frequency: number }>;
    lastUpdated: string | null;
  };
};

export async function calculatePrediction(ticket: {
  contraventionCode: string;
  issuer: string;
}): Promise<PredictionResult> {
  // Normalize inputs (simple lowercase/slug for now)
  const issuerId = normalizeIssuerId(ticket.issuer);
  const contravention = ticket.contraventionCode;

  // 1. Try issuer + contravention specific stats (most accurate)
  const issuerStats = await db.issuerContraventionStats.findUnique({
    where: {
      issuerId_contraventionCode: { issuerId, contraventionCode: contravention },
    },
  });

  // 2. Fall back to contravention-only stats
  const contraventionStats = await db.contraventionStats.findUnique({
    where: { contraventionCode: contravention },
  });

  // 3. Calculate score
  let percentage: number;
  let numberOfCases: number;
  let confidence: number;
  let statsLevel: PredictionResult['metadata']['statsLevel'];
  let lastUpdated: Date | null = null;

  if (issuerStats && issuerStats.totalCases >= 10) {
    percentage = Math.round(issuerStats.successRate * 100);
    numberOfCases = issuerStats.totalCases;
    confidence = Math.min(0.95, 0.5 + issuerStats.totalCases / 200);
    statsLevel = 'issuer_contravention';
    lastUpdated = issuerStats.lastUpdated;
  } else if (contraventionStats && contraventionStats.totalCases >= 30) {
    percentage = Math.round(contraventionStats.successRate * 100);
    numberOfCases = contraventionStats.totalCases;
    confidence = Math.min(0.8, 0.4 + contraventionStats.totalCases / 500);
    statsLevel = 'contravention';
    lastUpdated = contraventionStats.lastUpdated;
  } else {
    // Baseline: overall historical success rate
    percentage = 46;
    numberOfCases = 0;
    confidence = 0.3;
    statsLevel = 'baseline';
  }

  // 4. Fetch patterns
  const patterns = await db.appealPattern.findMany({
    where: {
      contraventionCode: contravention,
      OR: [{ issuerId }, { issuerId: null }],
    },
    orderBy: { frequency: 'desc' },
  });

  const winningPatterns = patterns
    .filter(p => p.outcome === 'WINNING')
    .slice(0, 5)
    .map(p => ({ pattern: p.pattern, frequency: p.frequency }));

  const losingPatterns = patterns
    .filter(p => p.outcome === 'LOSING')
    .slice(0, 5)
    .map(p => ({ pattern: p.pattern, frequency: p.frequency }));

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
}

function normalizeIssuerId(issuer: string): string {
  // Convert "London Borough of Lewisham" or "Lewisham" to "lewisham"
  return issuer
    .toLowerCase()
    .replace(/^(london borough of |royal borough of |city of )/i, '')
    .replace(/\s+/g, '-')
    .trim();
}
```

### Update ticket-service.ts

```typescript
// apps/web/services/ticket-service.ts

import { calculatePrediction } from './prediction-service';

export const afterTicketCreation = async (ticket: Ticket) => {
  try {
    const prediction = await calculatePrediction({
      contraventionCode: ticket.contraventionCode,
      issuer: ticket.issuer,
    });

    await db.prediction.create({
      data: {
        ticketId: ticket.id,
        type: PredictionType.CHALLENGE_SUCCESS,
        percentage: prediction.percentage,
        numberOfCases: prediction.numberOfCases,
        confidence: prediction.confidence,
        metadata: prediction.metadata,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error(`Failed to create prediction for ticket ${ticket.id}:`, error);
    // Fall back to default prediction
    await db.prediction.create({
      data: {
        ticketId: ticket.id,
        type: PredictionType.CHALLENGE_SUCCESS,
        percentage: 50,
        numberOfCases: 0,
        confidence: 0.3,
      },
    });
  }

  return ticket;
};
```

---

## Phase 6: Challenge Reason Recommendations UI

**File**: `parking-ticket-pal/apps/web/components/RecommendedReasons/RecommendedReasons.tsx`

```typescript
'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faCircleXmark } from '@fortawesome/pro-solid-svg-icons';

type Pattern = { pattern: string; frequency: number };

type RecommendedReasonsProps = {
  winningPatterns: Pattern[];
  losingPatterns: Pattern[];
  totalCases: number;
};

const PATTERN_LABELS: Record<string, string> = {
  // Winning
  SIGNAGE_INADEQUATE: 'Signs were unclear or not visible',
  LOADING_EXEMPTION: 'Was loading/unloading goods',
  PERMIT_WAS_VALID: 'Had a valid permit displayed',
  PROCEDURAL_ERROR: 'Council made procedural errors',
  CCTV_UNCLEAR: 'CCTV evidence was unclear',
  VEHICLE_SOLD: 'Vehicle was sold before the contravention',
  BLUE_BADGE_DISPLAYED: 'Blue badge was correctly displayed',
  TIME_DISCREPANCY: 'Time on ticket was incorrect',
  EVIDENCE_INSUFFICIENT: 'Council evidence was insufficient',

  // Losing
  MITIGATION_ONLY: 'Mitigating circumstances alone',
  NO_EVIDENCE_PROVIDED: 'No supporting evidence provided',
  ADMITTED_CONTRAVENTION: 'Admitted the contravention occurred',
  SIGNAGE_WAS_ADEQUATE: 'Signage was found to be adequate',
  NO_LOADING_ACTIVITY: 'No loading activity was observed',
  PERMIT_EXPIRED: 'Permit had expired',
  LATE_APPEAL: 'Appeal submitted too late',
};

export default function RecommendedReasons({
  winningPatterns,
  losingPatterns,
  totalCases,
}: RecommendedReasonsProps) {
  if (totalCases === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Based on <span className="font-medium text-foreground">{totalCases.toLocaleString()}</span> similar tribunal cases:
      </p>

      {winningPatterns.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-success mb-2">
            <FontAwesomeIcon icon={faCircleCheck} className="text-xs" />
            <span>Reasons that succeeded</span>
          </div>
          <ul className="space-y-1.5 ml-5">
            {winningPatterns.map((p) => (
              <li key={p.pattern} className="text-sm text-foreground flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-success mt-2 shrink-0" />
                <span>{PATTERN_LABELS[p.pattern] ?? p.pattern}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {losingPatterns.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-destructive mb-2">
            <FontAwesomeIcon icon={faCircleXmark} className="text-xs" />
            <span>Reasons to avoid</span>
          </div>
          <ul className="space-y-1.5 ml-5">
            {losingPatterns.map((p) => (
              <li key={p.pattern} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-destructive mt-2 shrink-0" />
                <span>{PATTERN_LABELS[p.pattern] ?? p.pattern}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## Implementation Order

### Step 1: Database
1. Add new models to `schema.prisma`
2. Add `normalizedIssuerId` and `normalizedContraventionCode` fields to `LondonTribunalCase`
3. Run migration

### Step 2: Worker Scripts
1. Create `src/utils/normalization.ts` with mappings
2. Create `src/scripts/import-tribunal-cases.ts`
3. Create `src/scripts/aggregate-stats.ts`
4. Create `src/scripts/extract-patterns.ts`
5. Run scripts in order: import → aggregate → extract

### Step 3: Main App
1. Create `apps/web/services/prediction-service.ts`
2. Update `apps/web/services/ticket-service.ts`
3. Create `apps/web/components/RecommendedReasons/RecommendedReasons.tsx`
4. Integrate into challenge dialogs

### Step 4: Cleanup
1. Delete `apps/web/components/ChallengeStats/ChallengeStats.tsx`
2. Test end-to-end flow

---

## Files Summary

### Worker (parking-ticket-pal-worker)
| File | Purpose |
|------|---------|
| `src/utils/normalization.ts` | Authority/contravention mappings |
| `src/scripts/import-tribunal-cases.ts` | One-time CSV import |
| `src/scripts/aggregate-stats.ts` | One-time stats aggregation |
| `src/scripts/extract-patterns.ts` | One-time GPT-5.2 pattern extraction |

### Main App (parking-ticket-pal)
| File | Purpose |
|------|---------|
| `packages/db/prisma/schema.prisma` | New models |
| `apps/web/services/prediction-service.ts` | Prediction calculation |
| `apps/web/components/RecommendedReasons/RecommendedReasons.tsx` | UI component |

### Modified
| File | Change |
|------|--------|
| `apps/web/services/ticket-service.ts` | Use real predictions |
| `apps/web/components/ticket-detail/GenerateLetterDialog.tsx` | Add recommendations |
| `apps/web/components/ticket-detail/AutoChallengeDialog.tsx` | Add recommendations |

### Deleted
| File | Reason |
|------|--------|
| `apps/web/components/ChallengeStats/ChallengeStats.tsx` | Legacy code |

---

## TODO: Future Enhancements

### Daily Update Pipeline
```
TODO: When ready to implement daily updates:

1. Worker: Add incremental import logic
   - Track lastImportedDecisionDate in AppealDataSource
   - Only import cases with decisionDate > lastImported
   - Handle CSV append vs full refresh

2. Worker: Add webhook endpoint or cron trigger
   - POST /api/tribunal/refresh
   - Called by scraper after daily run completes

3. Worker: Re-run aggregation after each import
   - Could be incremental or full rebuild
   - Pattern extraction only for new cases

4. Consider: Move CSV to shared storage (R2?)
   - Worker writes, main app reads
   - Or: Worker pushes to DB, no CSV needed
```

### Multiple Data Sources
```
TODO: When adding POPLA, IAS, user outcomes:

1. Update AppealDataSource with weight field usage
   - Different sources may have different reliability
   - User outcomes from platform = highest signal

2. Modify aggregation to combine sources
   - Weighted average of success rates
   - Track source breakdown in metadata

3. Add source-specific import scripts
   - Each source has different format
   - Normalize to common schema

4. Consider: Source-specific patterns
   - POPLA patterns may differ from Tribunal
   - Private parking has different success factors
```

### Prediction Accuracy Tracking
```
TODO: Track prediction accuracy over time:

1. When user marks challenge outcome (SUCCESS/REJECTED)
   - Compare to predicted percentage
   - Store in accuracy tracking table

2. Dashboard for prediction performance
   - Calibration curve
   - Accuracy by contravention type
   - Identify where predictions are off

3. Feedback loop
   - User outcomes improve predictions
   - Weight recent data higher
```
