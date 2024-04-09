import { IssuerType, TicketType } from '@prisma/client';

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
  GENERATING_CHALLENGE_LETTER = 'GENERATING_CHALLENGE_LETTER',
}
