import { LetterType, TicketStatus } from '@parking-ticket-pal/db';

/**
 * UK PCN Letter Sequence
 *
 * The standard sequence for council-issued PCNs is:
 * 1. PCN issued (on windscreen or posted)
 * 2. Notice to Owner (NTO) - 28 days after PCN if not paid/challenged
 * 3. Charge Certificate - 28 days after NTO, adds 50% surcharge
 * 4. Order for Recovery - court order for debt recovery
 * 5. CCJ Notice - County Court Judgment registered
 * 6. Bailiff Notice - enforcement stage
 *
 * Appeal responses can come at any stage before Charge Certificate.
 */

// Define the letter progression sequence
const LETTER_SEQUENCE: LetterType[] = [
  LetterType.INITIAL_NOTICE,
  LetterType.NOTICE_TO_OWNER,
  LetterType.CHARGE_CERTIFICATE,
  LetterType.ORDER_FOR_RECOVERY,
  LetterType.CCJ_NOTICE,
  LetterType.BAILIFF_NOTICE,
];

// Map ticket statuses to expected letter types
// Using Partial since not all statuses need explicit mappings
const STATUS_TO_EXPECTED_LETTERS: Partial<Record<TicketStatus, LetterType[]>> = {
  // Early stages - can receive initial notices
  [TicketStatus.ISSUED_DISCOUNT_PERIOD]: [
    LetterType.INITIAL_NOTICE,
    LetterType.APPEAL_RESPONSE,
    LetterType.GENERIC,
  ],
  [TicketStatus.ISSUED_FULL_CHARGE]: [
    LetterType.INITIAL_NOTICE,
    LetterType.NOTICE_TO_OWNER,
    LetterType.APPEAL_RESPONSE,
    LetterType.GENERIC,
  ],

  // After NTO
  [TicketStatus.NOTICE_TO_OWNER]: [
    LetterType.NOTICE_TO_OWNER,
    LetterType.CHARGE_CERTIFICATE,
    LetterType.APPEAL_RESPONSE,
    LetterType.GENERIC,
  ],

  // Formal representation (challenging)
  [TicketStatus.FORMAL_REPRESENTATION]: [
    LetterType.APPEAL_RESPONSE,
    LetterType.NOTICE_TO_OWNER,
    LetterType.GENERIC,
  ],
  [TicketStatus.NOTICE_OF_REJECTION]: [
    LetterType.APPEAL_RESPONSE,
    LetterType.CHARGE_CERTIFICATE,
    LetterType.GENERIC,
  ],
  [TicketStatus.REPRESENTATION_ACCEPTED]: [
    LetterType.APPEAL_RESPONSE,
    LetterType.GENERIC,
  ],

  // After Charge Certificate
  [TicketStatus.CHARGE_CERTIFICATE]: [
    LetterType.CHARGE_CERTIFICATE,
    LetterType.ORDER_FOR_RECOVERY,
    LetterType.GENERIC,
  ],

  // Court stages
  [TicketStatus.ORDER_FOR_RECOVERY]: [
    LetterType.ORDER_FOR_RECOVERY,
    LetterType.CCJ_NOTICE,
    LetterType.GENERIC,
  ],
  [TicketStatus.TEC_OUT_OF_TIME_APPLICATION]: [
    LetterType.ORDER_FOR_RECOVERY,
    LetterType.CCJ_NOTICE,
    LetterType.GENERIC,
  ],
  [TicketStatus.PE2_PE3_APPLICATION]: [
    LetterType.APPEAL_RESPONSE,
    LetterType.GENERIC,
  ],
  [TicketStatus.APPEAL_TO_TRIBUNAL]: [
    LetterType.APPEAL_RESPONSE,
    LetterType.GENERIC,
  ],
  [TicketStatus.CCJ_ISSUED]: [
    LetterType.CCJ_NOTICE,
    LetterType.BAILIFF_NOTICE,
    LetterType.FINAL_DEMAND,
    LetterType.GENERIC,
  ],

  // Enforcement stages
  [TicketStatus.ENFORCEMENT_BAILIFF_STAGE]: [
    LetterType.BAILIFF_NOTICE,
    LetterType.FINAL_DEMAND,
    LetterType.GENERIC,
  ],

  // Private parking flow
  [TicketStatus.NOTICE_TO_KEEPER]: [
    LetterType.NOTICE_TO_OWNER, // Similar to NTO for private
    LetterType.APPEAL_RESPONSE,
    LetterType.GENERIC,
  ],
  [TicketStatus.APPEAL_SUBMITTED_TO_OPERATOR]: [
    LetterType.APPEAL_RESPONSE,
    LetterType.GENERIC,
  ],
  [TicketStatus.APPEAL_REJECTED_BY_OPERATOR]: [
    LetterType.APPEAL_RESPONSE,
    LetterType.GENERIC,
  ],
  [TicketStatus.POPLA_APPEAL]: [LetterType.APPEAL_RESPONSE, LetterType.GENERIC],
  [TicketStatus.IAS_APPEAL]: [LetterType.APPEAL_RESPONSE, LetterType.GENERIC],
  [TicketStatus.APPEAL_UPHELD]: [LetterType.APPEAL_RESPONSE, LetterType.GENERIC],
  [TicketStatus.APPEAL_REJECTED]: [
    LetterType.APPEAL_RESPONSE,
    LetterType.CHARGE_CERTIFICATE,
    LetterType.GENERIC,
  ],
  [TicketStatus.DEBT_COLLECTION]: [
    LetterType.FINAL_DEMAND,
    LetterType.BAILIFF_NOTICE,
    LetterType.GENERIC,
  ],
  [TicketStatus.COURT_PROCEEDINGS]: [
    LetterType.ORDER_FOR_RECOVERY,
    LetterType.CCJ_NOTICE,
    LetterType.GENERIC,
  ],

  // Terminal states
  [TicketStatus.PAID]: [LetterType.GENERIC],
  [TicketStatus.CANCELLED]: [LetterType.APPEAL_RESPONSE, LetterType.GENERIC],
};

/**
 * Validates if a letter type is expected given the current ticket status.
 *
 * @param letterType - The type of letter being uploaded
 * @param ticketStatus - The current status of the ticket
 * @returns Object with isValid flag and optional warning message
 */
export function validateLetterType(
  letterType: LetterType,
  ticketStatus: TicketStatus,
): { isValid: boolean; warning?: string } {
  // CHALLENGE_LETTER is for outgoing letters, not incoming council letters
  if (letterType === LetterType.CHALLENGE_LETTER) {
    return {
      isValid: false,
      warning:
        'Challenge letters are for letters you send, not letters from the council.',
    };
  }

  const expectedLetters = STATUS_TO_EXPECTED_LETTERS[ticketStatus];

  // If we don't have rules for this status, allow any letter
  if (!expectedLetters) {
    return { isValid: true };
  }

  // Check if the letter type is in the expected list
  if (expectedLetters.includes(letterType)) {
    return { isValid: true };
  }

  // Letter type is unexpected - determine severity
  const letterIndex = LETTER_SEQUENCE.indexOf(letterType);
  const currentStatusLetterIndex = getExpectedLetterIndexForStatus(ticketStatus);

  // If the letter is from an earlier stage, it might be a duplicate or late arrival
  if (letterIndex >= 0 && letterIndex < currentStatusLetterIndex) {
    return {
      isValid: true,
      warning: `This appears to be a ${formatLetterType(letterType)} but your ticket is already at a later stage. It may be a duplicate or delayed letter.`,
    };
  }

  // If the letter is from a much later stage, warn about skipping steps
  if (letterIndex >= 0 && letterIndex > currentStatusLetterIndex + 1) {
    return {
      isValid: true,
      warning: `This ${formatLetterType(letterType)} seems to skip several stages. Please verify this is the correct letter type.`,
    };
  }

  // Otherwise allow with no warning
  return { isValid: true };
}

/**
 * Gets the expected letter sequence index for a given status.
 */
function getExpectedLetterIndexForStatus(status: TicketStatus): number {
  switch (status) {
    case TicketStatus.ISSUED_DISCOUNT_PERIOD:
    case TicketStatus.ISSUED_FULL_CHARGE:
      return 0; // INITIAL_NOTICE
    case TicketStatus.NOTICE_TO_OWNER:
    case TicketStatus.NOTICE_TO_KEEPER:
    case TicketStatus.FORMAL_REPRESENTATION:
    case TicketStatus.NOTICE_OF_REJECTION:
      return 1; // NOTICE_TO_OWNER
    case TicketStatus.CHARGE_CERTIFICATE:
    case TicketStatus.APPEAL_REJECTED:
      return 2; // CHARGE_CERTIFICATE
    case TicketStatus.ORDER_FOR_RECOVERY:
    case TicketStatus.COURT_PROCEEDINGS:
    case TicketStatus.TEC_OUT_OF_TIME_APPLICATION:
      return 3; // ORDER_FOR_RECOVERY
    case TicketStatus.CCJ_ISSUED:
      return 4; // CCJ_NOTICE
    case TicketStatus.ENFORCEMENT_BAILIFF_STAGE:
    case TicketStatus.DEBT_COLLECTION:
      return 5; // BAILIFF_NOTICE
    default:
      return 0;
  }
}

/**
 * Formats a letter type for display.
 */
function formatLetterType(letterType: LetterType): string {
  const labels: Record<LetterType, string> = {
    [LetterType.INITIAL_NOTICE]: 'Initial Notice',
    [LetterType.NOTICE_TO_OWNER]: 'Notice to Owner',
    [LetterType.CHARGE_CERTIFICATE]: 'Charge Certificate',
    [LetterType.ORDER_FOR_RECOVERY]: 'Order for Recovery',
    [LetterType.CCJ_NOTICE]: 'CCJ Notice',
    [LetterType.FINAL_DEMAND]: 'Final Demand',
    [LetterType.BAILIFF_NOTICE]: 'Bailiff Notice',
    [LetterType.APPEAL_RESPONSE]: 'Appeal Response',
    [LetterType.GENERIC]: 'Generic Letter',
    [LetterType.CHALLENGE_LETTER]: 'Challenge Letter',
  };
  return labels[letterType] || letterType.replace(/_/g, ' ');
}

/**
 * Gets a list of expected/recommended letter types for the current ticket status.
 */
export function getRecommendedLetterTypes(ticketStatus: TicketStatus): LetterType[] {
  return STATUS_TO_EXPECTED_LETTERS[ticketStatus] || [LetterType.GENERIC];
}
