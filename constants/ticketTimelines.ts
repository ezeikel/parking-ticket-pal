import { TicketStatus as PrismaTicketStatus, IssuerType } from '@prisma/client';

// Define the structure for a ticket stage in the timeline
export type TicketStage = {
  status: PrismaTicketStatus;
  label: string;
  trigger: string;
  next: PrismaTicketStatus[];
};

// Define the typings for our timeline structure
export type TicketTimelines = {
  COUNCIL: TicketStage[];
  TFL: TicketStage[];
  PRIVATE_COMPANY: TicketStage[];
};

export const TICKET_TIMELINES: TicketTimelines = {
  COUNCIL: [
    {
      status: 'REDUCED_PAYMENT_DUE',
      label: 'Reduced Payment Period',
      trigger: 'Ticket issued',
      next: ['FULL_PAYMENT_DUE'],
    },
    {
      status: 'FULL_PAYMENT_DUE',
      label: 'Full Payment Due',
      trigger: '14 days passed without payment',
      next: ['NOTICE_TO_OWNER_SENT'],
    },
    {
      status: 'NOTICE_TO_OWNER_SENT',
      label: 'Notice to Owner',
      trigger: '28 days passed without payment',
      next: ['APPEALED', 'ORDER_FOR_RECOVERY'],
    },
    {
      status: 'APPEALED',
      label: 'Appeal Submitted',
      trigger: 'Appeal sent',
      next: ['APPEAL_ACCEPTED', 'APPEAL_REJECTED'],
    },
    {
      status: 'APPEAL_ACCEPTED',
      label: 'Appeal Accepted',
      trigger: 'Appeal outcome',
      next: [],
    },
    {
      status: 'APPEAL_REJECTED',
      label: 'Appeal Rejected',
      trigger: 'Appeal outcome',
      next: ['ORDER_FOR_RECOVERY'],
    },
    {
      status: 'ORDER_FOR_RECOVERY',
      label: 'Order for Recovery',
      trigger: 'No response to NTO or rejected appeal',
      next: ['CCJ_PENDING'],
    },
    {
      status: 'CCJ_PENDING',
      label: 'County Court Pending',
      trigger: 'Debt registered',
      next: ['CCJ_ISSUED'],
    },
    {
      status: 'CCJ_ISSUED',
      label: 'County Court Judgment',
      trigger: 'No TE9 submitted or rejected',
      next: [],
    },
  ],
  TFL: [
    {
      status: 'REDUCED_PAYMENT_DUE',
      label: 'Reduced Payment Period',
      trigger: 'Ticket issued',
      next: ['FULL_PAYMENT_DUE'],
    },
    {
      status: 'FULL_PAYMENT_DUE',
      label: 'Full Payment Due',
      trigger: '14 days passed',
      next: ['NOTICE_TO_OWNER_SENT'],
    },
    {
      status: 'NOTICE_TO_OWNER_SENT',
      label: 'Enforcement Notice',
      trigger: '28 days passed',
      next: ['ORDER_FOR_RECOVERY', 'APPEALED'],
    },
    {
      status: 'ORDER_FOR_RECOVERY',
      label: 'Order for Recovery',
      trigger: 'No action on Enforcement Notice',
      next: ['CCJ_PENDING'],
    },
    {
      status: 'CCJ_PENDING',
      label: 'County Court Pending',
      trigger: 'Court application',
      next: ['CCJ_ISSUED'],
    },
    {
      status: 'CCJ_ISSUED',
      label: 'County Court Judgment',
      trigger: 'No statutory declaration',
      next: [],
    },
  ],
  PRIVATE_COMPANY: [
    {
      status: 'REDUCED_PAYMENT_DUE',
      label: 'Reduced Payment Period',
      trigger: 'Ticket issued',
      next: ['FULL_PAYMENT_DUE'],
    },
    {
      status: 'FULL_PAYMENT_DUE',
      label: 'Full Payment Due',
      trigger: '14 days passed',
      next: ['APPEALED', 'NOTICE_TO_OWNER_SENT'],
    },
    {
      status: 'NOTICE_TO_OWNER_SENT',
      label: 'Notice to Keeper',
      trigger: '28 days passed without payment or appeal',
      next: ['ORDER_FOR_RECOVERY'],
    },
    {
      status: 'APPEALED',
      label: 'Appeal Submitted',
      trigger: 'Appeal sent to company or POPLA',
      next: ['APPEAL_ACCEPTED', 'APPEAL_REJECTED'],
    },
    {
      status: 'APPEAL_ACCEPTED',
      label: 'Appeal Accepted',
      trigger: 'Appeal outcome',
      next: [],
    },
    {
      status: 'APPEAL_REJECTED',
      label: 'Appeal Rejected',
      trigger: 'Appeal outcome',
      next: ['ORDER_FOR_RECOVERY'],
    },
    {
      status: 'ORDER_FOR_RECOVERY',
      label: 'Final Demand / Debt Recovery',
      trigger: 'Ignored NTO or rejected appeal',
      next: ['CCJ_PENDING'],
    },
    {
      status: 'CCJ_PENDING',
      label: 'Legal Action Pending',
      trigger: 'Passed to debt collectors or court',
      next: ['CCJ_ISSUED'],
    },
    {
      status: 'CCJ_ISSUED',
      label: 'County Court Judgment',
      trigger: 'Claim filed and not responded to',
      next: [],
    },
  ],
} as const;

/**
 * Get the stage information for a specific ticket status and issuer type
 */
export const getStageInfo = (
  status: PrismaTicketStatus,
  issuerType: IssuerType,
): TicketStage | undefined => {
  const timeline = TICKET_TIMELINES[issuerType];
  return timeline.find((stage) => stage.status === status);
};

/**
 * Get the next possible stages for a given ticket status and issuer type
 */
export const getNextStages = (
  status: PrismaTicketStatus,
  issuerType: IssuerType,
): TicketStage[] => {
  const currentStage = getStageInfo(status, issuerType);
  if (!currentStage) return [];

  return currentStage.next
    .map((nextStatus) => {
      return getStageInfo(nextStatus, issuerType)!;
    })
    .filter(Boolean);
};

/**
 * Get the full timeline for a specific issuer type
 */
export const getTimelineForIssuer = (issuerType: IssuerType): TicketStage[] => {
  return TICKET_TIMELINES[issuerType];
};
