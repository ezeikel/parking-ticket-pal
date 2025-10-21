import {
  Challenge,
  ChallengeType,
  EvidenceType,
  Form,
  FormType,
  IssuerType,
  Letter,
  LetterType,
  Prisma,
  ProductType,
  TicketStatus,
  TicketTier,
  User,
} from '@prisma/client';
import { z } from 'zod';
import { TRACKING_EVENTS } from './constants/events';
import { BLOG_TAGS } from './constants/blog';
import { Address } from '@parking-ticket-pal/types';

export type FileWithPreview = File & {
  preview: string;
};

export enum LoaderType {
  CREATING_CHALLENGE_LETTER = 'CREATING_CHALLENGE_LETTER',
  UPLOADING_TICKET_IMAGES = 'UPLOADING_TICKET_IMAGES',
}

export type Issuer = {
  name: string;
  type: IssuerType;
  automationSupported: boolean;
  url?: string;
};

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

export const ChallengeLetterSchema = z.object({
  senderName: z.string(),
  senderAddress: z.string(),
  senderCity: z.string(),
  senderPostcode: z.string(),
  senderEmail: z.string().nullable(),
  senderPhone: z.string().nullable(),
  date: z.string(),
  recipientName: z.string(),
  recipientAddress: z.string(),
  recipientCity: z.string(),
  recipientPostcode: z.string(),
  subject: z.string(),
  salutation: z.string().default('Dear Sir or Madam'),
  body: z.string(),
  closing: z.string().default('Yours faithfully'),
  signatureName: z.string(),
});

export const ChallengeEmailSchema = z.object({
  subject: z.string(),
  htmlContent: z.string(),
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

export type TicketWithRelations = Prisma.TicketGetPayload<{
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
        user: {
          select: {
            id: true;
            signatureUrl: true;
          };
        };
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
    challenges: {
      select: {
        id: true;
        type: true;
        reason: true;
        status: true;
        createdAt: true;
        submittedAt: true;
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
    }
  | {
      type: 'challenge';
      date: Date;
      data: Pick<Challenge, 'id' | 'type' | 'reason' | 'status'>;
    };

export type CurrentUser = Pick<
  User,
  'id' | 'name' | 'email' | 'address' | 'phoneNumber' | 'signatureUrl'
>;

export type TicketForChallengeLetter = {
  pcnNumber: string;
  vehicle?: {
    registrationNumber: string;
  };
  issuer: string;
  contraventionCode: string;
  initialAmount: number;
  location: Address;
  contraventionAt: Date;
  issuedAt: Date;
};

export type UserForChallengeLetter = CurrentUser & {
  signatureUrl?: string | null;
};

export type TrackingEvent =
  (typeof TRACKING_EVENTS)[keyof typeof TRACKING_EVENTS];

// Event property types for type safety
export type BaseEventProperties = {
  userId?: string;
  sessionId?: string;
  timestamp?: number;
  url?: string;
  userAgent?: string;
};

export enum SignInMethod {
  GOOGLE = 'google',
  APPLE = 'apple',
  FACEBOOK = 'facebook',
  MAGIC_LINK = 'magic_link',
}

// For strongly-typed analytics events
export type EventProperties = {
  // Authentication & User Management
  [TRACKING_EVENTS.AUTH_METHOD_SELECTED]: {
    method: 'google' | 'apple' | 'facebook' | 'magic_link';
    location: string;
  };
  [TRACKING_EVENTS.USER_SIGNED_UP]: { method: SignInMethod };
  [TRACKING_EVENTS.USER_SIGNED_IN]: { method: SignInMethod };
  [TRACKING_EVENTS.USER_SIGNED_OUT]: Record<string, never>;
  [TRACKING_EVENTS.USER_PROFILE_UPDATED]: {
    name: boolean;
    phoneNumber: boolean;
    address: boolean;
    signature: boolean;
  };
  [TRACKING_EVENTS.USER_SIGNATURE_ADDED]: Record<string, never>;

  // Ticket Management
  [TRACKING_EVENTS.TICKET_CREATED]: {
    ticketId: string;
    pcnNumber: string;
    issuer: string;
    issuerType: IssuerType;
    prefilled: boolean;
  };
  [TRACKING_EVENTS.TICKET_UPDATED]: { ticketId: string; fields: string[] };
  [TRACKING_EVENTS.TICKET_DELETED]: { ticketId: string };
  [TRACKING_EVENTS.TICKET_STATUS_CHANGED]: {
    ticketId: string;
    fromStatus: TicketStatus;
    toStatus: TicketStatus;
  };
  [TRACKING_EVENTS.TICKET_IMAGE_UPLOADED]: {
    ticketId: string;
    imageCount: number;
  };
  [TRACKING_EVENTS.TICKET_OCR_PROCESSED]: {
    ticketId: string;
    success: boolean;
    durationMs: number;
  };

  // Challenge & Appeal Process
  [TRACKING_EVENTS.CHALLENGE_CREATED]: {
    ticketId: string;
    challengeType: ChallengeType;
    reason: string;
  };
  [TRACKING_EVENTS.CHALLENGE_SUBMITTED]: {
    ticketId: string;
    challengeId: string;
  };
  [TRACKING_EVENTS.CHALLENGE_LETTER_GENERATED]: {
    ticketId: string;
    challengeType: 'LETTER' | 'AUTO_CHALLENGE';
  };
  [TRACKING_EVENTS.CHALLENGE_STATUS_UPDATED]: {
    ticketId: string;
    challengeId: string;
    status: string;
  };
  [TRACKING_EVENTS.AUTO_CHALLENGE_STARTED]: { ticketId: string };
  [TRACKING_EVENTS.AUTO_CHALLENGE_COMPLETED]: {
    ticketId: string;
    success: boolean;
  };

  // Vehicle Management
  [TRACKING_EVENTS.VEHICLE_ADDED]: {
    vehicleId: string;
    registrationNumber: string;
    make: string;
    model: string;
    year: number;
    verified: boolean;
  };
  [TRACKING_EVENTS.VEHICLE_UPDATED]: {
    vehicleId: string;
    registrationNumber: string;
    make: string;
    model: string;
    year: number;
    hasNotes: boolean;
  };
  [TRACKING_EVENTS.VEHICLE_DELETED]: {
    vehicleId: string;
    registrationNumber: string;
    make: string;
    model: string;
    ticketCount: number;
  };
  [TRACKING_EVENTS.VEHICLE_VERIFIED]: {
    vehicleId?: string;
    registrationNumber: string;
    automated: boolean;
    lookupSuccess: boolean;
  };

  // Forms & Documents
  [TRACKING_EVENTS.FORM_GENERATED]: { ticketId: string; formType: FormType };
  [TRACKING_EVENTS.FORM_DOWNLOADED]: {
    ticketId: string;
    formId: string;
    formType: FormType;
  };
  [TRACKING_EVENTS.LETTER_CREATED]: {
    ticketId: string;
    letterType: LetterType;
  };
  [TRACKING_EVENTS.LETTER_UPLOADED]: {
    ticketId: string;
    letterType: LetterType;
  };
  [TRACKING_EVENTS.EVIDENCE_UPLOADED]: {
    ticketId: string;
    evidenceType: EvidenceType;
    count: number;
  };

  // Payment & Subscription
  [TRACKING_EVENTS.CHECKOUT_SESSION_CREATED]: {
    productType: ProductType;
    ticketId?: string;
    tier?: TicketTier;
  };
  [TRACKING_EVENTS.CUSTOMER_PORTAL_CREATED]: {
    userId: string;
    stripeCustomerId: string;
  };
  [TRACKING_EVENTS.PAYMENT_COMPLETED]: {
    tier: 'BASIC' | 'PRO';
    amount: number;
  };
  [TRACKING_EVENTS.SUBSCRIPTION_STARTED]: { planId: string };
  [TRACKING_EVENTS.SUBSCRIPTION_CANCELLED]: { planId: string };
  [TRACKING_EVENTS.TICKET_TIER_UPGRADED]: {
    ticketId: string;
    fromTier: 'FREE';
    toTier: 'BASIC' | 'PRO';
  };
  [TRACKING_EVENTS.BILLING_PAGE_VISITED]: Record<string, never>;

  // Navigation & Engagement
  [TRACKING_EVENTS.CTA_CLICKED]: { ctaName: string; location: string };
  [TRACKING_EVENTS.QUICK_ACTION_CLICKED]: {
    action: string;
    destination: string;
  };
  [TRACKING_EVENTS.FEATURE_LOCKED_VIEWED]: { featureName: string };

  // Pricing & Plans
  [TRACKING_EVENTS.PRICING_PAGE_VIEWED]: Record<string, never>;
  [TRACKING_EVENTS.PRICING_TAB_CHANGED]: {
    fromTab: 'one-time' | 'subscriptions' | 'business';
    toTab: 'one-time' | 'subscriptions' | 'business';
  };
  [TRACKING_EVENTS.PRICING_BILLING_TOGGLE_CHANGED]: {
    billingPeriod: 'monthly' | 'yearly';
    tab: 'subscriptions' | 'business';
  };
  [TRACKING_EVENTS.PRICING_PLAN_CLICKED]: {
    planName: string;
    planType: 'one-time' | 'subscription' | 'business';
    billingPeriod?: 'monthly' | 'yearly';
    price: string;
    location: 'pricing_page' | 'homepage';
  };
  [TRACKING_EVENTS.PRICING_COMPARE_PLANS_CLICKED]: Record<string, never>;
  [TRACKING_EVENTS.PRICING_TIER_SELECTED]: {
    tier: 'standard' | 'premium';
    source: string;
  };
  [TRACKING_EVENTS.PRICING_TICKET_CREATED_WITH_TIER]: {
    ticketId: string;
    tier: 'standard' | 'premium';
    source: string;
  };

  // Reminders & Notifications
  [TRACKING_EVENTS.REMINDER_SENT]: { ticketId: string; reminderType: string };
  [TRACKING_EVENTS.REMINDER_CLICKED]: { ticketId: string; reminderId: string };
  [TRACKING_EVENTS.NOTIFICATION_SENT]: { notificationType: string };

  // Support & Feedback
  [TRACKING_EVENTS.FEEDBACK_SUBMITTED]: {
    category: 'issue' | 'idea' | 'other';
    hasImage: boolean;
  };
  [TRACKING_EVENTS.SUPPORT_CONTACTED]: { method: 'email' | 'form' };
  [TRACKING_EVENTS.HELP_ARTICLE_VIEWED]: { articleId: string };

  // Demo & Testing Features
  [TRACKING_EVENTS.FAKE_NOTIFICATIONS_ENABLED]: Record<string, never>;
  [TRACKING_EVENTS.FAKE_NOTIFICATIONS_DISABLED]: Record<string, never>;
};

export type PostAuthor = {
  name: string;
  title: string;
  avatar: string;
};

export type PostMeta = {
  title: string;
  date: string;
  author: PostAuthor;
  summary: string;
  image?: string;
  tags: string[];
  featured?: boolean;
  slug: string;
};

export type Post = {
  meta: PostMeta;
  content: string;
  readingTime: string;
};

/**
 * Zod schema for blog post metadata generation
 */
export const BlogPostMetaSchema = z.object({
  title: z
    .string()
    .describe(
      'Engaging, SEO-optimized title with viral potential for UK audience',
    ),
  summary: z
    .string()
    .describe(
      'Brief, compelling summary that describes what readers will learn',
    ),
  tags: z
    .array(z.enum(BLOG_TAGS as [string, ...string[]]))
    .max(5)
    .describe(
      '3-5 most relevant tags from the predefined list that best match this topic',
    ),
  category: z
    .enum([
      'contravention-codes',
      'council-guides',
      'enforcement',
      'appeals',
      'forms',
      'tfl',
      'bailiffs',
      'case-studies',
      'legal-advice',
      'general',
    ])
    .describe('Most appropriate category for this topic'),
});

export type BlogPostMeta = z.infer<typeof BlogPostMetaSchema>;

export type PostPlatform = 'instagram' | 'facebook' | 'linkedin';
