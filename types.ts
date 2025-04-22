import { IssuerType } from '@prisma/client';
import { z } from 'zod';
import {
  COUNCIL_CHALLENGE_REASONS,
  PRIVATE_CHALLENGE_REASONS,
} from './constants';
import { LetterType } from '@prisma/client';

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
  location: z.string().optional(), // Location where the contravention occurred (optional)
  // Note: datetime currently not fully supported by OpenAI structured output
  firstSeen: z.string().optional(), // Time when the vehicle was first seen (optional)
  contraventionCode: z.string(), // Code representing the contravention
  contraventionDescription: z.string().optional(), // Description of the contravention (optional)
  initialAmount: z.number().int(), // Amount due in pennies
  issuer: z.string(), // The entity issuing the ticket (e.g., council, TFL, or private company)
  issuerType: z.enum(['COUNCIL', 'TFL', 'PRIVATE_COMPANY']), // Type of issuer
  // Note: datetime currently not fully supported by OpenAI structured output
  discountedPaymentDeadline: z.string().optional(), // Deadline for paying the discounted amount (optional)
  // Note: datetime currently not fully supported by OpenAI structured output
  fullPaymentDeadline: z.string().optional(), // Deadline for paying the full amount (optional)

  // Additional fields for letters
  extractedText: z.string().optional(), // Full text extracted from the letter (only applicable for LETTER)
  summary: z.string().optional(), // Summary of key points from the letter (only applicable for LETTER)
  sentAt: z.string().optional(), // Date letter was sent (only applicable for LETTER)
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

export enum TicketStatus {
  // Common initial stages
  ISSUED_DISCOUNT_PERIOD = 'Issued (Discount Period)',
  ISSUED_FULL_CHARGE = 'Issued (Full Charge)',

  // Council / TfL (public) flow
  NOTICE_TO_OWNER = 'Notice to Owner',
  FORMAL_REPRESENTATION = 'Formal Representation',
  NOTICE_OF_REJECTION = 'Notice of Rejection',
  REPRESENTATION_ACCEPTED = 'Representation Accepted',
  CHARGE_CERTIFICATE = 'Charge Certificate',
  ORDER_FOR_RECOVERY = 'Order for Recovery',
  TEC_OUT_OF_TIME_APPLICATION = 'TEC Out of Time Application',
  PE2_PE3_APPLICATION = 'PE2/PE3 Application',
  APPEAL_TO_TRIBUNAL = 'Appeal to Tribunal',
  ENFORCEMENT_BAILIFF_STAGE = 'Enforcement/Bailiff Stage',

  // Private parking flow
  NOTICE_TO_KEEPER = 'Notice to Keeper',
  APPEAL_SUBMITTED_TO_OPERATOR = 'Appeal Submitted to Operator',
  APPEAL_REJECTED_BY_OPERATOR = 'Appeal Rejected by Operator',
  POPLA_APPEAL = 'POPLA Appeal',
  IAS_APPEAL = 'IAS Appeal',
  APPEAL_UPHELD = 'Appeal Upheld',
  APPEAL_REJECTED = 'Appeal Rejected',
  DEBT_COLLECTION = 'Debt Collection',
  COURT_PROCEEDINGS = 'Court Proceedings',
  CCJ_ISSUED = 'CCJ Issued',

  // Final stage if user decides to pay
  PAID = 'Paid',
}

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
