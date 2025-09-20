import { z } from 'zod';
import { AddressSchema } from './address';

export const ticketFormSchema = z.object({
  vehicleReg: z
    .string()
    .min(1, { message: 'Vehicle registration is required' })
    .regex(/^[A-Z]{2}[0-9]{2}\s?[A-Z]{3}$/, {
      message: 'Invalid UK vehicle registration format. Example: AB12 CDE',
    }),
  pcnNumber: z.string().min(1, { message: 'PCN number is required' }),
  issuedAt: z.date({ required_error: 'Date issued is required' }),
  contraventionCode: z
    .string()
    .min(1, { message: 'Contravention code is required' }),
  initialAmount: z.number().min(1, { message: 'Amount due is required' }),
  issuer: z.string().min(1, { message: 'Issuer is required' }),
  location: AddressSchema,
});

export type TicketFormData = z.infer<typeof ticketFormSchema>;

export const DocumentSchema = z.object({
  documentType: z.enum(['TICKET', 'LETTER']), // New field to distinguish between a ticket or letter
  pcnNumber: z.string(), // The penalty charge notice (PCN) number
  type: z.enum(['PARKING_CHARGE_NOTICE', 'PENALTY_CHARGE_NOTICE']), // Type of ticket
  issuedAt: z.string(), // Date issued in ISO 8601 format
  // Note: datetime currently not fully supported by OpenAI structured output
  dateTimeOfContravention: z.string(), // Date and time of the contravention in ISO 8601 format
  vehicleRegistration: z.string(), // Vehicle Registration Number
  location: z.string().nullable(), // Location where the contravention occurred (optional)
  // Note: datetime currently not fully supported by OpenAI structured output
  firstSeen: z.string().nullable(), // Time when the vehicle was first seen (optional)
  contraventionCode: z.string(), // Code representing the contravention
  contraventionDescription: z.string().nullable(), // Description of the contravention (optional)
  initialAmount: z.number().int(), // Amount due in pennies
  issuer: z.string(), // The entity issuing the ticket (e.g., council, TFL, or private company)
  issuerType: z.enum(['COUNCIL', 'TFL', 'PRIVATE_COMPANY']), // Type of issuer
  // Note: datetime currently not fully supported by OpenAI structured output
  discountedPaymentDeadline: z.string().nullable(), // Deadline for paying the discounted amount (optional)
  // Note: datetime currently not fully supported by OpenAI structured output
  fullPaymentDeadline: z.string().nullable(), // Deadline for paying the full amount (optional)

  // Additional fields for letters
  extractedText: z.string().nullable(), // Full text extracted from the letter (only applicable for LETTER)
  summary: z.string().nullable(), // Summary of key points from the letter (only applicable for LETTER)
  sentAt: z.string().nullable(), // Date letter was sent (only applicable for LETTER)
});