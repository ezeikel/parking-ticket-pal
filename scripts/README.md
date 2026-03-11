# Scripts

## Dry-Run Document Testing

Regression test for the AI extraction pipeline. Runs real document images (both windshield tickets and letters) through the **production flow** (Google Vision OCR → GPT-5-mini) and compares results against expected values.

### Setup

1. Ensure `apps/web/.env.local` has:
   - `GOOGLE_APPLICATION_CREDENTIALS_BASE64` — Google Vision service account (base64-encoded JSON)
   - `OPENAI_API_KEY` — OpenAI API key

2. Place test images (JPEG) in `scripts/fixtures/images/` (gitignored — not committed to the repo).

3. Add expected results to `scripts/fixtures/letter-expectations.json`.

### Adding Test Images

1. Take a photo of the ticket or letter
2. Convert to JPEG if needed (e.g. HEIC from iPhone):
   ```bash
   sips -s format jpeg IMG_1234.HEIC --out scripts/fixtures/images/IMG_1234.jpg
   ```
3. Add an entry to `scripts/fixtures/letter-expectations.json`

### Fixture Format

Any field prefixed with `expected` is checked against the AI output. Omit a field or set it to `null` to skip that check.

**Letter example:**
```json
"IMG_2598": {
  "group": "Lewisham — PCN ZY12501745",
  "description": "Newlyn — Enforcement Agent Visit. £690.",
  "expectedDocumentType": "LETTER",
  "expectedLetterType": "BAILIFF_NOTICE",
  "expectedPcn": "ZY12501745",
  "expectedIssuerType": "COUNCIL",
  "expectedCurrentAmount": 690
}
```

**Windshield ticket example:**
```json
"IMG_3001": {
  "group": "Lewisham — PCN ZY99999999",
  "description": "Windshield PCN — parked on double yellows. £130/£65.",
  "expectedDocumentType": "TICKET",
  "expectedPcn": "ZY99999999",
  "expectedIssuerType": "COUNCIL",
  "expectedType": "PENALTY_CHARGE_NOTICE",
  "expectedVrn": "LV72EPC",
  "expectedInitialAmount": 65,
  "expectedContraventionCode": "01"
}
```

#### Available `expected` Fields

| Fixture Field | AI Output Field | Notes |
|---|---|---|
| `expectedDocumentType` | `documentType` | `TICKET`, `LETTER`, or `UNRELATED` |
| `expectedLetterType` | `letterType` | Only for letters |
| `expectedPcn` | `pcnNumber` | Spaces are stripped before comparing |
| `expectedIssuerType` | `issuerType` | `COUNCIL`, `TFL`, or `PRIVATE_COMPANY` |
| `expectedType` | `type` | `PENALTY_CHARGE_NOTICE` or `PARKING_CHARGE_NOTICE` |
| `expectedVrn` | `vehicleRegistration` | Vehicle registration number |
| `expectedIssuer` | `issuer` | Issuer name (e.g. "Lewisham Council") |
| `expectedInitialAmount` | `initialAmount` | Discounted amount in pounds |
| `expectedCurrentAmount` | `currentAmount` | Amount currently due in pounds |
| `expectedContraventionCode` | `contraventionCode` | Contravention code |

#### Metadata Fields (not checked)

| Field | Purpose |
|---|---|
| `group` | Grouping label for related documents (display only) |
| `description` | What the document is (display only) |
| `_knownIssue` | If set, failures show as `KNOWN` instead of `FAIL` |

### Usage

```bash
# Run all images
npx tsx scripts/dry-run-letters.ts

# Run specific images only
npx tsx scripts/dry-run-letters.ts --filter IMG_2594,IMG_2608

# Use a different image directory
npx tsx scripts/dry-run-letters.ts --image-dir /path/to/images
```

### Output

- Console summary: `PASS` / `FAIL` / `KNOWN` / `ERROR` per image
- Full results written to `scripts/dry-run-results.json` (gitignored)
