/**
 * Shared ticket status groupings used across dashboard wrappers and analytics.
 * These arrays classify the raw DB TicketStatus enum values into logical groups.
 */

export const WON_STATUSES = [
  'REPRESENTATION_ACCEPTED',
  'APPEAL_UPHELD',
] as const;

export const LOST_STATUSES = [
  'NOTICE_OF_REJECTION',
  'APPEAL_REJECTED_BY_OPERATOR',
  'APPEAL_REJECTED',
] as const;

export const PENDING_STATUSES = [
  'FORMAL_REPRESENTATION',
  'APPEAL_TO_TRIBUNAL',
  'APPEAL_SUBMITTED_TO_OPERATOR',
  'POPLA_APPEAL',
  'IAS_APPEAL',
  'TEC_OUT_OF_TIME_APPLICATION',
  'PE2_PE3_APPLICATION',
] as const;

export const CLOSED_STATUSES = [
  ...WON_STATUSES,
  ...LOST_STATUSES,
  'PAID',
  'CANCELLED',
] as const;
