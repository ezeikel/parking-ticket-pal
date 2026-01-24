/**
 * Shared types and constants for ticket wizards.
 * Used by both TicketWizard (guest) and AddDocumentWizard (logged-in).
 */

/**
 * Type of ticket issuer - council (PCN) or private company.
 */
export type IssuerType = 'council' | 'private' | null;

/**
 * Stage of the ticket in the appeals process.
 */
export type TicketStage = 'initial' | 'nto' | 'rejection' | 'charge_cert' | null;

/**
 * Challenge reason selection for guest wizard.
 */
export type ChallengeReason =
  | 'signage'
  | 'grace_period'
  | 'loading'
  | 'disabled'
  | 'emergency'
  | 'other'
  | null;

/**
 * Challenge reason options with labels and descriptions.
 */
export const CHALLENGE_REASONS = [
  {
    id: 'signage' as const,
    label: 'Unclear / Obscured Signage',
    desc: 'Signs were missing, hidden, or confusing',
  },
  {
    id: 'grace_period' as const,
    label: 'Grace Period / Just Over Time',
    desc: 'I was only slightly over the time limit',
  },
  {
    id: 'loading' as const,
    label: 'Loading / Unloading',
    desc: 'I was actively loading or unloading goods',
  },
  {
    id: 'disabled' as const,
    label: 'Blue Badge Holder',
    desc: 'I have a valid disabled parking badge',
  },
  {
    id: 'emergency' as const,
    label: 'Medical / Emergency',
    desc: 'There was an emergency situation',
  },
  {
    id: 'other' as const,
    label: 'Other Reason',
    desc: 'My situation is different',
  },
] as const;

/**
 * Ticket stage options with labels and descriptions.
 */
export const TICKET_STAGES = [
  {
    id: 'initial' as const,
    label: 'Initial Ticket',
    desc: 'Just received - on windscreen or in the post',
  },
  {
    id: 'nto' as const,
    label: 'Notice to Owner (NtO)',
    desc: 'Formal notice asking for the full amount',
  },
  {
    id: 'rejection' as const,
    label: 'Rejection / Tribunal',
    desc: 'Appeal was rejected, considering tribunal',
  },
  {
    id: 'charge_cert' as const,
    label: 'Charge Certificate / Bailiffs',
    desc: 'Urgent - enforcement stage',
  },
] as const;

/**
 * Issuer type options.
 */
export const ISSUER_TYPES = [
  {
    id: 'council' as const,
    label: 'A Local Council / Authority',
    desc: 'It says "Penalty Charge Notice" (PCN)',
    fullDesc:
      'Council tickets are issued by local authorities for on-street parking or council car parks.',
  },
  {
    id: 'private' as const,
    label: 'A Private Company',
    desc: 'It says "Parking Charge Notice"',
    fullDesc:
      'Private tickets come from companies managing private land like supermarkets, retail parks, or private car parks.',
  },
] as const;
