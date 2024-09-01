import { z } from 'zod';

export enum ProductType {
  PAY_PER_TICKET = 'PAY_PER_TICKET',
  PRO_MONTHLY = 'PRO_MONTHLY',
  PRO_ANNUAL = 'PRO_ANNUAL',
}

export type FileWithPreview = File & {
  preview: string;
};

export enum LoaderType {
  CREATING_CHALLENGE_LETTER = 'CREATING_CHALLENGE_LETTER',
  UPLOADING_TICKET_IMAGES = 'UPLOADING_TICKET_IMAGES',
}

export const TicketSchema = z.object({
  pcnNumber: z.string(),
  type: z.enum(['PARKING_CHARGE_NOTICE', 'PENALTY_CHARGE_NOTICE']),
  dateIssued: z.string(), // ISO 8601 format
  // TODO: datetime not supported by openai structured output
  dateTimeOfContravention: z.string(), // Combined date and time in ISO 8601 format
  vehicleRegistration: z.string(), // Vehicle Registration Number
  location: z.string().optional(), // Location where the contravention occurred
  // TODO: datetime not supported by openai structured output
  firstSeen: z.string().optional(), // Time when the vehicle was first seen
  contraventionCode: z.string(),
  contraventionDescription: z.string().optional(),
  amountDue: z.number().int(), // Amount in pennies
  issuer: z.string(),
  issuerType: z.enum(['COUNCIL', 'TFL', 'PRIVATE_COMPANY']),
  // TODO: datetime not supported by openai structured output
  discountedPaymentDeadline: z.string().optional(), // Deadline for paying the discounted amount (ISO 8601 format)
  // TODO: datetime not supported by openai structured output
  fullPaymentDeadline: z.string().optional(), // Deadline for paying the full amount (ISO 8601 format)
});
