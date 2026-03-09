# Letter Improvements Plan

## Issue 1: Issuer/location/amount "Unknown" when creating ticket from letter scan

**Problem**: OCR extracts issuer, location, amount from letters but `createLetter` drops it all and hardcodes "Unknown" defaults when upserting the ticket.

**Data drops at 4 points**:
1. OCR action doesn't return `issuerType` (extracted but not included in return)
2. `LetterExtractedData` type omits issuer, location, initialAmount, contraventionCode
3. `LetterWizardFormData` and mobile API payload omit them
4. `letterFormSchema` doesn't include them, so `createLetter` hardcodes defaults

**Fix (7 steps)**:

### Step 1: Return `issuerType` from OCR actions
- File: `apps/web/app/actions/ocr.ts`
- Add `issuerType` to return objects in both `extractOCRTextWithOpenAI` and `extractOCRTextWithVision`

### Step 2: Extend `LetterExtractedData` and `LetterWizardFormData` (web)
- File: `apps/web/components/add-document/AddLetterWizard.tsx`
- Add: `issuer?`, `issuerType?`, `location?`, `initialAmount?`, `contraventionCode?`
- Update `handleSubmit` to include these fields

### Step 3: Pass OCR data through in `AddDocumentPage.tsx` (web)
- File: `apps/web/components/add-document/AddDocumentPage.tsx`
- Pass issuer, issuerType, location, initialAmount, contraventionCode when setting letterExtractedData

### Step 4: Extend `letterFormSchema` and `createLetter` server action
- File: `apps/web/types.ts` — add optional fields to schema
- File: `apps/web/app/actions/letter.ts` — use OCR values instead of hardcoded defaults in upsert
- **Critical**: `letterFormSchema.parse()` strips unknown fields. Must add fields to schema itself.

### Step 5: Update mobile letter creation API route
- File: `apps/web/app/api/letters/create/route.ts`
- Pass new fields through to `createLetter`

### Step 6: Update mobile API client and LetterFlow
- File: `apps/mobile/api.ts` — add fields to `createLetterForTicket` params
- File: `apps/mobile/components/LetterFlow/LetterFlow.tsx` — forward OCR data

### Step 7: Ensure mobile OCR type includes `issuerType`
- File: `apps/mobile/hooks/api/useOCR.ts` — add `issuerType` to `OCRProcessingResult`

### Step 8: Update `GuestLetterWizard` and guest letter flow (web hero)
- File: `apps/web/components/GuestLetterWizard/GuestLetterWizard.tsx` — pass through issuer/location
- File: `apps/web/utils/guestLetter.ts` — add fields to `GuestLetterData` type
- File: `apps/web/app/actions/guest.ts` — pass fields to `createLetter` in `createLetterFromGuestData`

---

## Issue 2: Split "Evidence & Documents" into two sections

**Current**: Single "Evidence & Documents" section is confusing.

**Proposed**:
- **Evidence** — Issuer-side images/videos from portal (what they have on the user)
- **Letters Received** — Letters the user has scanned/received

**Files to change**:
- Web: ticket detail page (wherever Evidence & Documents is rendered)
- Mobile: `apps/mobile/app/(authenticated)/ticket/[id]/index.tsx`
- Mobile: Need to add "Letters Received" section (currently missing)

---

## Issue 3: Letter image viewable in lightbox

**Problem**: Scanned letter images exist in storage but aren't shown in the UI.

**Fix**: In the Letters Received section, show a thumbnail of the original scanned letter image alongside "View content". Clicking opens a lightbox (same pattern as ticket photos and evidence).

**Files**:
- Web: letters section component
- Mobile: new letters section component
- Both need to query letter media records (source: LETTER)

---

## Issue 4: Mobile missing "Letters Received" section

**Problem**: Mobile ticket detail doesn't show letters at all.

**Fix**: Add a "Letters Received" card to mobile ticket detail, similar to the existing Evidence card.

---

## Priority Order
1. Issue 1 (data pipeline bug) — affects every letter scan
2. Issue 3 (letter images) — quick UX win
3. Issue 2 + 4 (section split + mobile letters) — UI restructure
