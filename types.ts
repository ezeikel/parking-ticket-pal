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
  REDUCED_PAYMENT_DUE = 'REDUCED_PAYMENT_DUE',
  FULL_PAYMENT_DUE = 'FULL_PAYMENT_DUE',
  FULL_PAYMENT_PLUS_INCREASE_DUE = 'FULL_PAYMENT_PLUS_INCREASE_DUE',
  PAID = 'PAID',
  APPEALED = 'APPEALED',
  APPEAL_SUCCESSFUL = 'APPEAL_SUCCESSFUL',
  APPEAL_REJECTED = 'APPEAL_REJECTED',
  COUNTY_COURT = 'COUNTY_COURT',
  COUNTY_COURT_JUDGEMENT = 'COUNTY_COURT_JUDGEMENT',
  ORDER_FOR_RECOVERY = 'ORDER_FOR_RECOVERY',
  DEBT_COLLECTION = 'DEBT_COLLECTION',
  TRIBUNAL = 'TRIBUNAL',
  POPLA = 'POPLA',
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
  name: string;
  email: string;
  address?: string;
  vehicles: Vehicle[];
  subscription?: Subscription;
  credits: number;
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
  registration: string;
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
  status: TicketStatus[];
  paymentLink?: string;
  letters: Letter[];
  type: TicketType;
  amountDue: number;
  issuer: string;
  issuerType: IssuerType;
  verified: boolean;
  vehicle: Vehicle;
  vehicleId: string;
  media: Media[];
  appeal?: Appeal;
  reminder: Reminder[];
  createdAt: string;
  updatedAt: string;
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
