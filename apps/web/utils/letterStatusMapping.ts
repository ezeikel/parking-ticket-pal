import { LetterType, TicketStatus } from '@parking-ticket-pal/db';

/**
 * Status progression order for council PCN flow.
 * Used to prevent status regression from scanning older letters.
 */
const STATUS_ORDER: TicketStatus[] = [
  TicketStatus.ISSUED_DISCOUNT_PERIOD,
  TicketStatus.ISSUED_FULL_CHARGE,
  TicketStatus.NOTICE_TO_OWNER,
  TicketStatus.CHARGE_CERTIFICATE,
  TicketStatus.ORDER_FOR_RECOVERY,
  TicketStatus.CCJ_ISSUED,
  TicketStatus.ENFORCEMENT_BAILIFF_STAGE,
];

/**
 * Letter types that are allowed to regress the status (move backwards).
 * TE/PE form responses are TEC Revoking Orders — they revoke the Order for Recovery,
 * Charge Certificate, and NTO, resetting the PCN to its initial state. The PCN
 * isn't cancelled — the council must restart enforcement from scratch.
 */
const REGRESSION_ALLOWED_TYPES: LetterType[] = [
  LetterType.TE_FORM_RESPONSE,
  LetterType.PE_FORM_RESPONSE,
];

/**
 * Maps letter types to their corresponding ticket statuses.
 * Only escalation letters that have clear status mappings are included.
 *
 * Excluded:
 * - INITIAL_NOTICE: just the original PCN
 * - FINAL_DEMAND: reminder, not escalation
 * - GENERIC: unknown type
 * - CHALLENGE_LETTER: outgoing, not incoming
 * - APPEAL_RESPONSE: ambiguous (use APPEAL_ACCEPTED or APPEAL_REJECTED instead)
 *
 * TE/PE form responses represent TEC Revoking Orders (accepted applications).
 * A Revoking Order revokes the Order for Recovery, Charge Certificate, and NTO,
 * resetting the PCN back to its initial state as if just received. The council
 * must start the enforcement process again from scratch (reissue NTO etc.).
 * The PCN itself is NOT cancelled — it's just reset to the beginning.
 * TEC Refusal Orders are classified as APPEAL_REJECTED by the AI prompt.
 */
export const LETTER_STATUS_MAP: Partial<Record<LetterType, TicketStatus>> = {
  NOTICE_TO_OWNER: TicketStatus.NOTICE_TO_OWNER,
  CHARGE_CERTIFICATE: TicketStatus.CHARGE_CERTIFICATE,
  ORDER_FOR_RECOVERY: TicketStatus.ORDER_FOR_RECOVERY,
  CCJ_NOTICE: TicketStatus.CCJ_ISSUED,
  BAILIFF_NOTICE: TicketStatus.ENFORCEMENT_BAILIFF_STAGE,
  APPEAL_ACCEPTED: TicketStatus.CANCELLED,
  APPEAL_REJECTED: TicketStatus.NOTICE_OF_REJECTION,
  TE_FORM_RESPONSE: TicketStatus.ISSUED_DISCOUNT_PERIOD,
  PE_FORM_RESPONSE: TicketStatus.ISSUED_DISCOUNT_PERIOD,
};

/**
 * Gets the ordinal position of a status in the progression.
 * Returns -1 if the status is not in the standard progression.
 */
function getStatusOrdinal(status: TicketStatus): number {
  return STATUS_ORDER.indexOf(status);
}

/**
 * Determines if a letter should trigger a ticket status update.
 *
 * Checks both:
 * 1. Date check: letter's sentAt >= effective status date
 * 2. Progression check: mapped status ordinal >= current status ordinal
 *    (unless the letter type allows regression, e.g. TE/PE form responses)
 *
 * Special cases:
 * - APPEAL_ACCEPTED → CANCELLED: always allowed (terminal state)
 * - TE/PE form responses (TEC Revoking Orders) → ISSUED_DISCOUNT_PERIOD: resets PCN to initial state
 *
 * @param letterType - The type of letter being uploaded
 * @param letterSentAt - When the letter was sent/dated
 * @param ticketStatusUpdatedAt - When the ticket status was last updated (null if never)
 * @param ticketIssuedAt - When the ticket was originally issued (fallback date)
 * @param currentStatus - The ticket's current status (for ordinal comparison)
 * @returns true if the letter should update the ticket status
 */
export function shouldUpdateStatus(
  letterType: LetterType,
  letterSentAt: Date,
  ticketStatusUpdatedAt: Date | null,
  ticketIssuedAt: Date,
  currentStatus?: TicketStatus,
): boolean {
  const mappedStatus = LETTER_STATUS_MAP[letterType];

  // Only mapped letter types trigger updates
  if (!mappedStatus) {
    return false;
  }

  // Date check: letter must be at least as recent as the current status
  const effectiveStatusDate = ticketStatusUpdatedAt || ticketIssuedAt;
  if (letterSentAt < effectiveStatusDate) {
    return false;
  }

  // If no current status provided, just use the date check
  if (!currentStatus) {
    return true;
  }

  // APPEAL_ACCEPTED → CANCELLED is always allowed (terminal state)
  if (letterType === LetterType.APPEAL_ACCEPTED) {
    return true;
  }

  // TE/PE form responses (TEC Revoking Orders) reset the PCN to initial state.
  // This is a legitimate regression — always allowed.
  if (REGRESSION_ALLOWED_TYPES.includes(letterType)) {
    return true;
  }

  // Ordinal progression check
  const currentOrdinal = getStatusOrdinal(currentStatus);
  const mappedOrdinal = getStatusOrdinal(mappedStatus);

  // If either status isn't in the standard progression, allow the update
  if (currentOrdinal === -1 || mappedOrdinal === -1) {
    return true;
  }

  // Only allow forward progression
  return mappedOrdinal >= currentOrdinal;
}

/**
 * Gets the mapped ticket status for a letter type.
 * Returns undefined if the letter type doesn't have a status mapping.
 */
export function getMappedStatus(
  letterType: LetterType,
): TicketStatus | undefined {
  return LETTER_STATUS_MAP[letterType];
}
