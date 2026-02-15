import type { Address } from '@parking-ticket-pal/types';

export enum TicketType {
  PARKING_CHARGE_NOTICE = 'PARKING_CHARGE_NOTICE',
  PENALTY_CHARGE_NOTICE = 'PENALTY_CHARGE_NOTICE',
}

export enum LetterType {
  CHALLENGE = 'CHALLENGE',
  APPEAL = 'APPEAL',
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
}

export enum TicketStatus {
  // Common initial stages
  ISSUED_DISCOUNT_PERIOD = 'ISSUED_DISCOUNT_PERIOD',
  ISSUED_FULL_CHARGE = 'ISSUED_FULL_CHARGE',

  // Council / TfL (public) flow
  NOTICE_TO_OWNER = 'NOTICE_TO_OWNER',
  FORMAL_REPRESENTATION = 'FORMAL_REPRESENTATION',
  NOTICE_OF_REJECTION = 'NOTICE_OF_REJECTION',
  REPRESENTATION_ACCEPTED = 'REPRESENTATION_ACCEPTED',
  CHARGE_CERTIFICATE = 'CHARGE_CERTIFICATE',
  ORDER_FOR_RECOVERY = 'ORDER_FOR_RECOVERY',
  TEC_OUT_OF_TIME_APPLICATION = 'TEC_OUT_OF_TIME_APPLICATION',
  PE2_PE3_APPLICATION = 'PE2_PE3_APPLICATION',
  APPEAL_TO_TRIBUNAL = 'APPEAL_TO_TRIBUNAL',
  ENFORCEMENT_BAILIFF_STAGE = 'ENFORCEMENT_BAILIFF_STAGE',

  // Private parking flow
  NOTICE_TO_KEEPER = 'NOTICE_TO_KEEPER',
  APPEAL_SUBMITTED_TO_OPERATOR = 'APPEAL_SUBMITTED_TO_OPERATOR',
  APPEAL_REJECTED_BY_OPERATOR = 'APPEAL_REJECTED_BY_OPERATOR',

  // Additional statuses
  APPEAL_UPHELD = 'APPEAL_UPHELD',
  POPLA_APPEAL = 'POPLA_APPEAL',
  IAS_APPEAL = 'IAS_APPEAL',
  CANCELLED = 'CANCELLED',

  // Legacy statuses (keep for backward compatibility)
  PAID = 'PAID',
  APPEALED = 'APPEALED',
  APPEAL_SUCCESSFUL = 'APPEAL_SUCCESSFUL',
  APPEAL_REJECTED = 'APPEAL_REJECTED',
  COUNTY_COURT = 'COUNTY_COURT',
  COUNTY_COURT_JUDGEMENT = 'COUNTY_COURT_JUDGEMENT',
  DEBT_COLLECTION = 'DEBT_COLLECTION',
  TRIBUNAL = 'TRIBUNAL',
  POPLA = 'POPLA',
  REDUCED_PAYMENT_DUE = 'REDUCED_PAYMENT_DUE',
  FULL_PAYMENT_DUE = 'FULL_PAYMENT_DUE',
  FULL_PAYMENT_PLUS_INCREASE_DUE = 'FULL_PAYMENT_PLUS_INCREASE_DUE',
}

export enum IssuerType {
  COUNCIL = 'COUNCIL',
  TFL = 'TFL',
  PRIVATE_COMPANY = 'PRIVATE_COMPANY',
}

export enum SubscriptionType {
  BASIC = 'BASIC',
  PRO = 'PRO',
}

export enum ReminderType {
  REDUCED_PAYMENT_DUE = 'REDUCED_PAYMENT_DUE',
  FULL_PAYMENT_DUE = 'FULL_PAYMENT_DUE',
  APPEAL = 'APPEAL',
}

export enum NotificationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum TransactionType {
  PURCHASE = 'PURCHASE',
  CONSUME = 'CONSUME',
}

export enum ProductType {
  PAY_PER_TICKET = 'PAY_PER_TICKET',
  PRO_MONTHLY = 'PRO_MONTHLY',
  PRO_ANNUAL = 'PRO_ANNUAL',
}

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  address?: Address;
  phoneNumber?: string;
  signatureUrl?: string;
  vehicles: Vehicle[];
  subscription?: Subscription;
  createdAt: string;
  updatedAt: string;
}

export type Vehicle = {
  id: string;
  userId: string;
  user: User;
  make: string;
  model: string;
  year: number;
  vrm: string;
  active: boolean;
  tickets: Ticket[];
  createdAt: string;
  updatedAt: string;
}

export type Ticket = {
  id: string;
  pcnNumber: string;
  contravention: Contravention;
  contraventionId: string;
  description?: string;
  dateIssued: string;
  dateOfContravention: string;
  status: TicketStatus;
  paymentLink?: string;
  letters: Letter[];
  type: TicketType;
  amountDue: number;
  initialAmount?: number;
  issuer: string;
  issuerType: IssuerType;
  discountedPaymentDeadline: string;
  fullPaymentDeadline: string;
  verified: boolean;
  vehicle: Vehicle;
  vehicleId: string;
  media: Media[];
  appeal?: Appeal;
  reminder: Reminder[];
  tier?: 'FREE' | 'STANDARD' | 'PREMIUM';
  contraventionCode?: string;
  contraventionAt?: string;
  location?: Address | null;
  prediction?: {
    percentage: number;
    numberOfCases: number;
    confidence: string;
    metadata?: any;
  };
  amountIncreases?: { amount: number; effectiveAt: string }[];
  createdAt: string;
  updatedAt: string;
  issuedAt: string;
}

export type Media = {
  id: string;
  url: string;
  name: string;
  description?: string;
  type: MediaType;
  ticket: Ticket;
  ticketId: string;
  createdAt: string;
  updatedAt: string;
}

export type Contravention = {
  id: string;
  code: string;
  description: string;
  legalClauses: string[];
  ticket: Ticket[];
  createdAt: string;
  updatedAt: string;
}

export type Letter = {
  id: string;
  type: LetterType;
  ticket: Ticket;
  ticketId: string;
  content: string;
  appeal?: Appeal;
  appealId?: string;
  createdAt: string;
  updatedAt: string;
}

export type Appeal = {
  id: string;
  ticket: Ticket;
  ticketId: string;
  content: string;
  letter: Letter[];
  letterId: string;
  createdAt: string;
  updatedAt: string;
}

export type Subscription = {
  id: string;
  type: SubscriptionType;
  stripeCustomerId?: string;
  user: User;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type Reminder = {
  id: string;
  type: ReminderType;
  notificaticationType: NotificationType;
  ticket: Ticket;
  ticketId: string;
  createdAt: string;
  updatedAt: string;
}
