import { IssuerType, TicketType } from '@prisma/client';

export enum ProductType {
  PAY_PER_TICKET = 'PAY_PER_TICKET',
  PRO_MONTHLY = 'PRO_MONTHLY',
  PRO_ANNUAL = 'PRO_ANNUAL',
}

export type FileWithPreview = File & {
  preview: string;
};

export type ParseTicketInfo = {
  pcnNumber: string;
  type: TicketType;
  dateIssued: string;
  vehicleRegistration: string;
  dateOfContravention: string;
  contraventionCode: string;
  contraventionDescription: string;
  amountDue: number;
  issuer: string;
  issuerType: IssuerType;
};

export enum LoaderType {
  CREATING_CHALLENGE_LETTER = 'CREATING_CHALLENGE_LETTER',
  UPLOADING_TICKET_IMAGES = 'UPLOADING_TICKET_IMAGES',
}
