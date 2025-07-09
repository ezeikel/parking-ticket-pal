import { Form, IssuerType, Letter, LetterType, Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  COUNCIL_CHALLENGE_REASONS,
  PRIVATE_CHALLENGE_REASONS,
} from './constants';

export type FileWithPreview = File & {
  preview: string;
};

export enum LoaderType {
  CREATING_CHALLENGE_LETTER = 'CREATING_CHALLENGE_LETTER',
  UPLOADING_TICKET_IMAGES = 'UPLOADING_TICKET_IMAGES',
}

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

export type Issuer = {
  name: string;
  type: IssuerType;
  automationSupported: boolean;
  url?: string;
};

export type ChallengeReasonId =
  | keyof typeof COUNCIL_CHALLENGE_REASONS
  | keyof typeof PRIVATE_CHALLENGE_REASONS;

export type Address = {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
};

// Re-export TicketStatus from Prisma client for consistency
export { TicketStatus } from '@prisma/client';

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
  location: z.object({
    line1: z.string().min(1, { message: 'Line 1 is required' }),
    line2: z.string().optional(),
    city: z.string().min(1, { message: 'City is required' }),
    county: z.string().optional(),
    postcode: z.string().min(1, { message: 'Postcode is required' }),
    country: z.string().min(1, { message: 'Country is required' }),
    coordinates: z.object({
      latitude: z
        .number()
        .gte(-90)
        .lte(90, { message: 'Latitude must be between -90 and 90' }),
      longitude: z
        .number()
        .gte(-180)
        .lte(180, { message: 'Longitude must be between -180 and 180' }),
    }),
  }) satisfies z.ZodType<Address>,
});

export const letterFormSchema = z.object({
  pcnNumber: z.string().min(1, { message: 'PCN number is required' }),
  vehicleReg: z
    .string()
    .min(1, { message: 'Vehicle registration is required' }),
  type: z.nativeEnum(LetterType),
  summary: z.string().min(1, { message: 'Summary is required' }),
  sentAt: z.date({ required_error: 'Date sent is required' }),
  extractedText: z.string().optional(),
});

export type PdfFormFields = {
  penaltyChargeNo: string;
  vehicleRegistrationNo: string;
  applicant: string;
  locationOfContravention: string;
  dateOfContravention: string;
  fullNameAndAddress: string;
  userAddress: string;
  userPostcode: string;
  reasonText: string;
  userEmail: string;
  userName: string;
  userTitle: string;
  userId: string;
  ticketId: string;
  signatureDataUrl?: string | null;
  [key: string]: any; // allow for additional form-specific fields
};

export type CreateLetterValues = z.infer<typeof letterFormSchema>;

export type TicketWithPrediction = Prisma.TicketGetPayload<{
  select: {
    id: true;
    pcnNumber: true;
    contraventionCode: true;
    location: true;
    issuedAt: true;
    contraventionAt: true;
    initialAmount: true;
    issuer: true;
    issuerType: true;
    status: true;
    type: true;
    extractedText: true;
    tier: true;
    notes: true;
    vehicle: {
      select: {
        id: true;
        registrationNumber: true;
      };
    };
    media: {
      select: {
        id: true;
        url: true;
        source: true;
        description: true;
        evidenceType: true;
      };
    };
    prediction: true;
    letters: {
      select: {
        id: true;
        media: true;
        sentAt: true;
        summary: true;
        type: true;
      };
    };
    forms: {
      select: {
        id: true;
        createdAt: true;
        formType: true;
      };
    };
    reminders: true;
  };
}>;

export type HistoryEvent =
  | {
      type: 'letter';
      date: Date;
      data: Pick<Letter, 'id' | 'type' | 'summary'>;
    }
  | {
      type: 'form';
      date: Date;
      data: Pick<Form, 'id' | 'formType'>;
    };
