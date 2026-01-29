import { LetterType, TicketStatus } from '@parking-ticket-pal/db';

/**
 * Maps letter types to their corresponding ticket statuses.
 * Only escalation letters that have clear status mappings are included.
 *
 * Excluded:
 * - INITIAL_NOTICE: just the original PCN
 * - FINAL_DEMAND: reminder, not escalation
 * - GENERIC: unknown type
 * - CHALLENGE_LETTER: outgoing, not incoming
 * - APPEAL_RESPONSE: could be accepted OR rejected (needs manual handling)
 */
export const LETTER_STATUS_MAP: Partial<Record<LetterType, TicketStatus>> = {
  NOTICE_TO_OWNER: TicketStatus.NOTICE_TO_OWNER,
  CHARGE_CERTIFICATE: TicketStatus.CHARGE_CERTIFICATE,
  ORDER_FOR_RECOVERY: TicketStatus.ORDER_FOR_RECOVERY,
  CCJ_NOTICE: TicketStatus.CCJ_ISSUED,
  BAILIFF_NOTICE: TicketStatus.ENFORCEMENT_BAILIFF_STAGE,
};

/**
 * Determines if a letter should trigger a ticket status update.
 * Uses "last updated wins" logic - the letter's sentAt date must be
 * newer than the ticket's current status date.
 *
 * @param letterType - The type of letter being uploaded
 * @param letterSentAt - When the letter was sent/dated
 * @param ticketStatusUpdatedAt - When the ticket status was last updated (null if never)
 * @param ticketIssuedAt - When the ticket was originally issued (fallback date)
 * @returns true if the letter should update the ticket status
 */
export function shouldUpdateStatus(
  letterType: LetterType,
  letterSentAt: Date,
  ticketStatusUpdatedAt: Date | null,
  ticketIssuedAt: Date,
): boolean {
  // Only mapped letter types trigger updates
  if (!LETTER_STATUS_MAP[letterType]) {
    return false;
  }

  // "Last updated wins" - letter must be newer than current status
  const effectiveStatusDate = ticketStatusUpdatedAt || ticketIssuedAt;
  return letterSentAt > effectiveStatusDate;
}

/**
 * Gets the mapped ticket status for a letter type.
 * Returns undefined if the letter type doesn't have a status mapping.
 */
export function getMappedStatus(letterType: LetterType): TicketStatus | undefined {
  return LETTER_STATUS_MAP[letterType];
}
