# Split CHALLENGE_REJECTED from APPEAL_REJECTED

## Problem

Currently `APPEAL_REJECTED` letter type is used for both:
1. **Issuer-level rejection** (council/private operator rejected your challenge/representation) — you can still appeal to tribunal
2. **Tribunal-level rejection** (POPLA/London Tribunals/IAS rejected your formal appeal) — truly lost

Both map to `NOTICE_OF_REJECTION` ticket status labelled "Lost", which is wrong for case 1. A rejected challenge is not the end — the user still has the right to escalate to an independent tribunal.

## Solution

Add `CHALLENGE_REJECTED` letter type for issuer-level rejections. Keep `APPEAL_REJECTED` for tribunal-level only.

### Status labels
- `NOTICE_OF_REJECTION` → **"Challenge Rejected"** (amber/needs action — can still appeal to tribunal)
- `APPEAL_REJECTED` (ticket status) → **"Appeal Lost"** (coral — terminal, must pay)

### Letter type → ticket status mapping
- `CHALLENGE_REJECTED` → `NOTICE_OF_REJECTION` (not terminal)
- `APPEAL_REJECTED` → `APPEAL_REJECTED` (terminal)

## Files to change

### 1. Database migration
- `packages/db/prisma/schema.prisma` — add `CHALLENGE_REJECTED` to `LetterType` enum
- Run `turbo run db:migrate -- --name add-challenge-rejected-letter-type`

### 2. Shared types
- `packages/types/src/ticket.ts` — add `CHALLENGE_REJECTED` to `DocumentSchema.letterType` enum

### 3. OCR prompt
- `apps/web/constants/prompts.ts` — split item 10 into two:
  - `CHALLENGE_REJECTED`: issuer/council/operator rejected representation. Keywords: "rejected", "not accepted", "notice of rejection", "representations have been considered", from a council/operator (not a tribunal)
  - `APPEAL_REJECTED`: independent tribunal/adjudicator rejected formal appeal. Keywords: "tribunal", "adjudicator", "POPLA", "IAS", "London Tribunals", "appeal dismissed", "appeal not upheld"
  - Also update items 11/12: TEC Refusal Orders should map to `CHALLENGE_REJECTED` not `APPEAL_REJECTED`

### 4. Letter status mapping
- `apps/web/utils/letterStatusMapping.ts`:
  - Add `CHALLENGE_REJECTED: TicketStatus.NOTICE_OF_REJECTION`
  - Change `APPEAL_REJECTED: TicketStatus.APPEAL_REJECTED` (was NOTICE_OF_REJECTION)

### 5. Status labels (mobile)
- `apps/mobile/constants/ticket-status.ts`:
  - `NOTICE_OF_REJECTION` → label: "Challenge Rejected", amber colors (`#FEF3C7` / `#D97706`)
  - `APPEAL_REJECTED` → label: "Appeal Lost", keep coral (`#FFE4E6` / `#E11D48`)

### 6. Status groupings (web)
- `apps/web/constants/ticketStatuses.ts`:
  - Move `NOTICE_OF_REJECTION` from `LOST_STATUSES` to a new `CHALLENGE_REJECTED_STATUSES` array, or into `PENDING_STATUSES`
  - Remove from `CLOSED_STATUSES` (challenge rejected is not closed)

### 7. Mobile types
- `apps/mobile/types.ts` — add `CHALLENGE_REJECTED` to `LetterType` enum

### 8. Letter type label maps
Update `CHALLENGE_REJECTED: 'Challenge Rejected'` in:
- `apps/web/components/ticket-detail/UploadedLettersCard.tsx`
- `apps/web/components/ticket-detail/LetterContentModal.tsx`
- `apps/mobile/components/ticket-detail/LettersReceivedCard.tsx`

### 9. Terminal statuses
- `apps/mobile/constants/ticket-status.ts` — ensure `NOTICE_OF_REJECTION` is NOT in `TERMINAL_STATUSES`
- Verify `APPEAL_REJECTED` IS in terminal statuses (or add it)

## Verification

1. Scan a Notice of Rejection letter (council rejecting challenge) → should classify as `CHALLENGE_REJECTED`, ticket shows "Challenge Rejected" (amber)
2. Scan a tribunal rejection letter → should classify as `APPEAL_REJECTED`, ticket shows "Appeal Lost" (coral)
3. Existing tickets with `NOTICE_OF_REJECTION` status now show "Challenge Rejected" instead of "Lost"
4. TEC Refusal Orders classify as `CHALLENGE_REJECTED` not `APPEAL_REJECTED`
