import { TicketStatus } from '@/types';

type StatusConfig = {
  label: string;
  bgColor: string;
  textColor: string;
};

const STATUS_CONFIG: Record<TicketStatus, StatusConfig> = {
  // Needs Action (amber)
  [TicketStatus.ISSUED_DISCOUNT_PERIOD]: { label: 'Needs Action', bgColor: '#FEF3C7', textColor: '#D97706' },
  [TicketStatus.ISSUED_FULL_CHARGE]: { label: 'Needs Action', bgColor: '#FEF3C7', textColor: '#D97706' },
  [TicketStatus.NOTICE_TO_OWNER]: { label: 'Needs Action', bgColor: '#FEF3C7', textColor: '#D97706' },
  [TicketStatus.NOTICE_TO_KEEPER]: { label: 'Needs Action', bgColor: '#FEF3C7', textColor: '#D97706' },

  // Pending (teal)
  [TicketStatus.FORMAL_REPRESENTATION]: { label: 'Pending', bgColor: '#CCFBF1', textColor: '#0D9488' },
  [TicketStatus.APPEAL_SUBMITTED_TO_OPERATOR]: { label: 'Pending', bgColor: '#CCFBF1', textColor: '#0D9488' },
  [TicketStatus.APPEAL_TO_TRIBUNAL]: { label: 'Pending', bgColor: '#CCFBF1', textColor: '#0D9488' },
  [TicketStatus.POPLA]: { label: 'Pending', bgColor: '#CCFBF1', textColor: '#0D9488' },
  [TicketStatus.POPLA_APPEAL]: { label: 'Pending', bgColor: '#CCFBF1', textColor: '#0D9488' },
  [TicketStatus.IAS_APPEAL]: { label: 'Pending', bgColor: '#CCFBF1', textColor: '#0D9488' },
  [TicketStatus.APPEALED]: { label: 'Pending', bgColor: '#CCFBF1', textColor: '#0D9488' },
  [TicketStatus.TEC_OUT_OF_TIME_APPLICATION]: { label: 'Pending', bgColor: '#CCFBF1', textColor: '#0D9488' },
  [TicketStatus.PE2_PE3_APPLICATION]: { label: 'Pending', bgColor: '#CCFBF1', textColor: '#0D9488' },
  [TicketStatus.TRIBUNAL]: { label: 'Pending', bgColor: '#CCFBF1', textColor: '#0D9488' },

  // Won (green)
  [TicketStatus.REPRESENTATION_ACCEPTED]: { label: 'Won', bgColor: '#DCFCE7', textColor: '#16A34A' },
  [TicketStatus.APPEAL_UPHELD]: { label: 'Won', bgColor: '#DCFCE7', textColor: '#16A34A' },
  [TicketStatus.APPEAL_SUCCESSFUL]: { label: 'Won', bgColor: '#DCFCE7', textColor: '#16A34A' },

  // Lost (coral)
  [TicketStatus.NOTICE_OF_REJECTION]: { label: 'Lost', bgColor: '#FFE4E6', textColor: '#E11D48' },
  [TicketStatus.APPEAL_REJECTED_BY_OPERATOR]: { label: 'Lost', bgColor: '#FFE4E6', textColor: '#E11D48' },
  [TicketStatus.APPEAL_REJECTED]: { label: 'Lost', bgColor: '#FFE4E6', textColor: '#E11D48' },

  // Overdue (coral)
  [TicketStatus.CHARGE_CERTIFICATE]: { label: 'Overdue', bgColor: '#FFE4E6', textColor: '#E11D48' },
  [TicketStatus.ORDER_FOR_RECOVERY]: { label: 'Overdue', bgColor: '#FFE4E6', textColor: '#E11D48' },
  [TicketStatus.ENFORCEMENT_BAILIFF_STAGE]: { label: 'Overdue', bgColor: '#FFE4E6', textColor: '#E11D48' },
  [TicketStatus.DEBT_COLLECTION]: { label: 'Overdue', bgColor: '#FFE4E6', textColor: '#E11D48' },
  [TicketStatus.COUNTY_COURT]: { label: 'Overdue', bgColor: '#FFE4E6', textColor: '#E11D48' },
  [TicketStatus.COUNTY_COURT_JUDGEMENT]: { label: 'Overdue', bgColor: '#FFE4E6', textColor: '#E11D48' },

  // Paid (gray)
  [TicketStatus.PAID]: { label: 'Paid', bgColor: '#F3F4F6', textColor: '#6B7280' },
  [TicketStatus.CANCELLED]: { label: 'Cancelled', bgColor: '#F3F4F6', textColor: '#6B7280' },

  // Legacy statuses (gray)
  [TicketStatus.REDUCED_PAYMENT_DUE]: { label: 'Needs Action', bgColor: '#FEF3C7', textColor: '#D97706' },
  [TicketStatus.FULL_PAYMENT_DUE]: { label: 'Needs Action', bgColor: '#FEF3C7', textColor: '#D97706' },
  [TicketStatus.FULL_PAYMENT_PLUS_INCREASE_DUE]: { label: 'Overdue', bgColor: '#FFE4E6', textColor: '#E11D48' },
};

export function getStatusConfig(status: TicketStatus): StatusConfig {
  return STATUS_CONFIG[status] ?? { label: status.replace(/_/g, ' '), bgColor: '#F3F4F6', textColor: '#6B7280' };
}

const TERMINAL_STATUSES = new Set<TicketStatus>([
  TicketStatus.PAID,
  TicketStatus.CANCELLED,
  TicketStatus.REPRESENTATION_ACCEPTED,
  TicketStatus.APPEAL_UPHELD,
  TicketStatus.APPEAL_SUCCESSFUL,
]);

const NEEDS_ACTION_STATUSES = new Set<TicketStatus>([
  TicketStatus.ISSUED_DISCOUNT_PERIOD,
  TicketStatus.ISSUED_FULL_CHARGE,
  TicketStatus.NOTICE_TO_OWNER,
  TicketStatus.NOTICE_TO_KEEPER,
  TicketStatus.REDUCED_PAYMENT_DUE,
  TicketStatus.FULL_PAYMENT_DUE,
]);

export function isTerminalStatus(status: TicketStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function needsActionStatus(status: TicketStatus): boolean {
  return NEEDS_ACTION_STATUSES.has(status);
}

export function getIssuerInitials(issuer: string | null | undefined): string {
  if (!issuer) return '??';
  return issuer.substring(0, 2).toUpperCase();
}

export function getDeadlineDays(issuedAt: string): number {
  const issued = new Date(issuedAt);
  const deadline = new Date(issued.getTime() + 14 * 24 * 60 * 60 * 1000);
  const now = new Date();
  return Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function getDisplayAmount(ticket: {
  initialAmount?: number;
  amountDue?: number;
  amountIncreases?: { amount: number; effectiveAt: string }[];
}): number {
  if (ticket.amountIncreases && ticket.amountIncreases.length > 0) {
    const now = new Date();
    const activeIncrease = [...ticket.amountIncreases]
      .sort((a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime())
      .find((inc) => new Date(inc.effectiveAt) <= now);
    if (activeIncrease) return activeIncrease.amount;
  }
  return ticket.initialAmount ?? ticket.amountDue ?? 0;
}

export function formatCurrency(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}
