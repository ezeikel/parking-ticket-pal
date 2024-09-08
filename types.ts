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
  documentType: z.enum(['TICKET', 'LETTER']), // New field to distinguish between a ticket or letter
  pcnNumber: z.string(), // The penalty charge notice (PCN) number
  type: z.enum(['PARKING_CHARGE_NOTICE', 'PENALTY_CHARGE_NOTICE']), // Type of ticket
  dateIssued: z.string(), // Date issued in ISO 8601 format
  // Note: datetime currently not fully supported by OpenAI structured output
  dateTimeOfContravention: z.string(), // Date and time of the contravention in ISO 8601 format
  vehicleRegistration: z.string(), // Vehicle Registration Number
  location: z.string().optional(), // Location where the contravention occurred (optional)
  // Note: datetime currently not fully supported by OpenAI structured output
  firstSeen: z.string().optional(), // Time when the vehicle was first seen (optional)
  contraventionCode: z.string(), // Code representing the contravention
  contraventionDescription: z.string().optional(), // Description of the contravention (optional)
  amountDue: z.number().int(), // Amount due in pennies
  issuer: z.string(), // The entity issuing the ticket (e.g., council, TFL, or private company)
  issuerType: z.enum(['COUNCIL', 'TFL', 'PRIVATE_COMPANY']), // Type of issuer
  // Note: datetime currently not fully supported by OpenAI structured output
  discountedPaymentDeadline: z.string().optional(), // Deadline for paying the discounted amount (optional)
  // Note: datetime currently not fully supported by OpenAI structured output
  fullPaymentDeadline: z.string().optional(), // Deadline for paying the full amount (optional)

  // Additional fields for letters
  extractedText: z.string().optional(), // Full text extracted from the letter (only applicable for LETTER)
  summary: z.string().optional(), // Summary of key points from the letter (only applicable for LETTER)
});
