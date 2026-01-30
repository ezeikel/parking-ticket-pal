# Success Score Prediction System

A data-driven system that predicts the likelihood of a parking ticket appeal being successful, based on historical London Tribunal outcomes.

## Overview

The system analyzes ~30,000 historical tribunal cases to provide:

1. **Per-ticket success predictions** based on contravention code + issuer combinations
2. **Challenge reason recommendations** showing what arguments have succeeded/failed historically
3. **Confidence tiers** - predictions are more accurate when we have more data for that specific combination

## How It Works

### Data Pipeline

```
[London Tribunal CSV] → [Import Script] → [LondonTribunalCase table]
                                                    ↓
                              [Aggregation Script] → [ContraventionStats]
                                                   → [IssuerContraventionStats]
                                                    ↓
                              [GPT-5.2 Extraction] → [AppealPattern table]
                                                    ↓
                              [Prediction Service] → [Per-ticket predictions]
```

### Prediction Tiers

The system uses a tiered approach for predictions:

| Tier | Data Source | Min Cases | Confidence | Example |
|------|-------------|-----------|------------|---------|
| **High** | Issuer + Contravention | 10 | 50-95% | "Westminster + Code 12" |
| **Medium** | Contravention only | 30 | 40-80% | "Code 12 across all councils" |
| **Baseline** | Overall average | - | 30% | 46% (historical average) |

### Pattern Extraction

GPT-5.2 analyzes adjudicator reasoning to extract patterns like:
- **Winning**: `SIGNAGE_INADEQUATE`, `LOADING_EXEMPTION`, `PROCEDURAL_ERROR`
- **Losing**: `MITIGATION_ONLY`, `NO_EVIDENCE_PROVIDED`, `ADMITTED_CONTRAVENTION`

These patterns power the "Reasons that succeeded" / "Reasons to avoid" UI in challenge dialogs.

## Database Models

```prisma
// Raw tribunal case data
model LondonTribunalCase {
  caseReference             String    @unique
  authority                 String
  normalizedIssuerId        String?   // e.g., "westminster"
  contravention             String?
  normalizedContraventionCode String? // e.g., "12"
  appealDecision            AppealDecision
  reasons                   String    // Adjudicator reasoning
  // ... other fields
}

// Aggregated stats by contravention
model ContraventionStats {
  contraventionCode String @unique
  totalCases        Int
  successRate       Float  // (allowed + partial) / total
  // ...
}

// Aggregated stats by issuer + contravention (most specific)
model IssuerContraventionStats {
  issuerId          String
  contraventionCode String
  totalCases        Int
  successRate       Float
  @@unique([issuerId, contraventionCode])
}

// Extracted patterns from adjudicator reasoning
model AppealPattern {
  contraventionCode String
  issuerId          String?
  pattern           String         // e.g., "SIGNAGE_INADEQUATE"
  outcome           PatternOutcome // WINNING or LOSING
  frequency         Int
  @@unique([contraventionCode, issuerId, pattern, outcome])
}
```

## Scripts

All scripts are in `packages/db/scripts/`. Run with `pnpm tsx scripts/<script>.ts`.

| Script | Purpose | Usage |
|--------|---------|-------|
| `import-tribunal-cases.ts` | Import CSV to LondonTribunalCase | `<path-to-csv>` |
| `aggregate-stats.ts` | Generate ContraventionStats + IssuerContraventionStats | (no args) |
| `extract-patterns.ts` | GPT-5.2 pattern extraction | `--limit N`, `--dry-run` |
| `seed-tribunal-data.ts` | Export/import data between environments | `export` or `import` |
| `backfill-predictions.ts` | Create/update predictions for existing tickets | `--dry-run`, `--limit N`, `--refresh-all` |

### Running Scripts

```bash
cd packages/db

# Import new tribunal data
pnpm tsx scripts/import-tribunal-cases.ts /path/to/raw-appeals.csv

# Regenerate stats after import
pnpm tsx scripts/aggregate-stats.ts

# Extract patterns (costs ~$40 for full dataset)
pnpm tsx scripts/extract-patterns.ts --limit 100 --dry-run  # Test first
pnpm tsx scripts/extract-patterns.ts                         # Full run

# Backfill predictions for existing tickets
pnpm tsx scripts/backfill-predictions.ts --refresh-all
```

## Key Files

| File | Purpose |
|------|---------|
| `apps/web/services/prediction-service.ts` | Core prediction calculation logic |
| `apps/web/services/ticket-service.ts` | Calls prediction service on ticket creation |
| `apps/web/components/RecommendedReasons/` | UI showing winning/losing patterns |
| `apps/web/components/ticket-detail/SuccessPredictionCard.tsx` | Score display with explanation |
| `packages/db/scripts/normalization.ts` | Authority → issuer ID mappings |

## Production Data

As of January 2026:
- **LondonTribunalCase**: 29,946 cases
- **ContraventionStats**: 42 contravention codes
- **IssuerContraventionStats**: 742 issuer+contravention combinations
- **AppealPattern**: 7,799 extracted patterns

## UI Components

### Success Prediction Card

Shows the prediction percentage with explanation text:
- High confidence: "Based on 156 similar cases with Westminster for Code 12."
- Medium confidence: "Based on 2,942 cases for Code 12 across all councils."
- Baseline: "Based on overall appeal success rates." (with tooltip explaining limited data)

### Recommended Reasons

In challenge dialogs, shows:
- **Reasons that succeeded** (green) - top 3 winning patterns
- **Reasons to avoid** (red) - top 3 losing patterns

---

## Future Enhancements

### Daily Update Pipeline

```
TODO: When ready to implement daily updates:

1. Add incremental import logic
   - Track lastImportedDecisionDate in AppealDataSource
   - Only import cases with decisionDate > lastImported

2. Add webhook/cron trigger
   - POST /api/tribunal/refresh
   - Called by scraper after daily run

3. Re-run aggregation after each import
   - Pattern extraction only for new cases
```

### Multiple Data Sources

```
TODO: When adding POPLA, IAS, user outcomes:

1. Use AppealDataSource.weight for weighted averaging
   - User outcomes = highest signal
   - Different sources have different reliability

2. Modify aggregation to combine sources
   - Track source breakdown in metadata

3. Add source-specific import scripts
   - Each source has different format
```

### Prediction Accuracy Tracking

```
TODO: Track prediction accuracy:

1. When user marks challenge outcome (SUCCESS/REJECTED)
   - Compare to predicted percentage
   - Store in accuracy tracking table

2. Dashboard for prediction performance
   - Calibration curve
   - Accuracy by contravention type

3. Feedback loop
   - User outcomes improve predictions
   - Weight recent data higher
```
