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
} from '@parking-ticket-pal/db/types';
import { z } from 'zod';
import { TRACKING_EVENTS } from '@/constants/events';
import { BLOG_TAGS } from '@/constants/blog';
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
  sentAt: z.date({ message: 'Date sent is required' }),
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
  salutation: z
    .string()
    .describe('Letter salutation, e.g. "Dear Sir or Madam"'),
  body: z.string(),
  closing: z.string().describe('Letter closing, e.g. "Yours faithfully"'),
  signatureName: z.string(),
});

export type ChallengeLetter = z.infer<typeof ChallengeLetterSchema>;

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
  userEmail: string | null;
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
            address: true;
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
        extractedText: true;
      };
    };
    forms: {
      select: {
        id: true;
        createdAt: true;
        formType: true;
        fileName: true;
        fileUrl: true;
      };
    };
    challenges: {
      select: {
        id: true;
        type: true;
        reason: true;
        customReason: true;
        status: true;
        metadata: true;
        createdAt: true;
        submittedAt: true;
      };
    };
    reminders: true;
    verification: {
      select: {
        id: true;
        type: true;
        status: true;
        verifiedAt: true;
        metadata: true;
      };
    };
    amountIncreases: {
      select: {
        amount: true;
        effectiveAt: true;
      };
    };
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
  | 'id'
  | 'name'
  | 'email'
  | 'address'
  | 'phoneNumber'
  | 'signatureUrl'
  | 'stripeCustomerId'
  | 'lastPremiumPurchaseAt'
>;

export type TicketForChallengeLetter = {
  pcnNumber: string;
  vehicle?: {
    registrationNumber: string;
  };
  issuer: string | null;
  contraventionCode: string | null;
  initialAmount: number | null;
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
  user_id?: string;
  session_id?: string;
  timestamp?: number;
  url?: string;
  user_agent?: string;
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
    phone_number: boolean;
    address: boolean;
    signature: boolean;
  };
  [TRACKING_EVENTS.USER_SIGNATURE_ADDED]: Record<string, never>;
  [TRACKING_EVENTS.USER_ACCOUNT_DELETED]: { user_id: string };

  // Hero (Web Homepage)
  [TRACKING_EVENTS.HERO_VIEWED]: { source: string };
  [TRACKING_EVENTS.HERO_UPLOAD_STARTED]: {
    file_type: string;
    file_size: number;
    compressed_file_size?: number;
    was_compressed?: boolean;
    compression_ratio?: number;
  };
  [TRACKING_EVENTS.HERO_UPLOAD_COMPLETED]: {
    file_type: string;
    file_size: number;
    duration_ms: number;
    ocr_success: boolean;
    fields_extracted?: (string | null)[];
    ocr_error?: string;
  };
  [TRACKING_EVENTS.HERO_UPLOAD_FAILED]: {
    file_type: string;
    error: string;
  };
  [TRACKING_EVENTS.HERO_MANUAL_ENTRY_CLICKED]: Record<string, never>;

  // OCR Processing
  [TRACKING_EVENTS.OCR_PROCESSING_STARTED]: { source: 'web' | 'mobile' };
  [TRACKING_EVENTS.OCR_PROCESSING_SUCCESS]: {
    source: 'web' | 'mobile';
    fields_extracted: string[];
  };
  [TRACKING_EVENTS.OCR_PROCESSING_FAILED]: {
    source: 'web' | 'mobile';
    error: string;
    reason?: string;
  };

  // Ticket Wizard
  [TRACKING_EVENTS.WIZARD_OPENED]: {
    source: 'ocr' | 'manual';
    has_image: boolean;
    path: string;
  };
  [TRACKING_EVENTS.WIZARD_STEP_VIEWED]: {
    step_name: string;
    step_number: number;
    total_steps: number;
    path: string;
  };
  [TRACKING_EVENTS.WIZARD_STEP_COMPLETED]: {
    step_name: string;
    selection: string | null;
  };
  [TRACKING_EVENTS.WIZARD_INTENT_SELECTED]: {
    intent: 'track' | 'challenge';
  };
  [TRACKING_EVENTS.WIZARD_CHALLENGE_REASON_SELECTED]: {
    reason: string;
  };
  [TRACKING_EVENTS.WIZARD_COMPLETED]: {
    intent: 'track' | 'challenge';
    tier: 'premium' | null;
    total_steps: number;
    path: string;
    challenge_reason: string | null;
  };
  [TRACKING_EVENTS.WIZARD_ABANDONED]: {
    last_step: string;
    step_number: number;
    intent: 'track' | 'challenge' | null;
  };

  // Guest Flow
  [TRACKING_EVENTS.GUEST_SIGNUP_PAGE_VIEWED]: {
    intent?: 'track' | 'challenge';
    has_pcn: boolean;
    source?: string;
  };
  [TRACKING_EVENTS.GUEST_SIGNUP_STARTED]: {
    method: SignInMethod;
    intent?: 'track' | 'challenge';
  };
  [TRACKING_EVENTS.GUEST_SIGNUP_COMPLETED]: {
    method: SignInMethod;
    intent?: 'track' | 'challenge';
  };
  [TRACKING_EVENTS.GUEST_CLAIM_PAGE_VIEWED]: {
    has_session_id: boolean;
    tier?: 'premium' | null;
  };

  // Ticket Management
  [TRACKING_EVENTS.TICKET_CREATED]: {
    ticket_id: string;
    pcn_number: string;
    issuer: string | null;
    issuer_type: IssuerType;
    prefilled: boolean;
  };
  [TRACKING_EVENTS.TICKET_UPDATED]: { ticket_id: string; fields: string[] };
  [TRACKING_EVENTS.TICKET_DELETED]: { ticket_id: string };
  [TRACKING_EVENTS.TICKET_STATUS_CHANGED]: {
    ticket_id: string;
    from_status: TicketStatus;
    to_status: TicketStatus;
  };
  [TRACKING_EVENTS.TICKET_IMAGE_UPLOADED]: {
    ticket_id: string;
    image_count: number;
  };
  [TRACKING_EVENTS.TICKET_OCR_PROCESSED]: {
    ticket_id: string;
    success: boolean;
    duration_ms: number;
  };

  // Challenge & Appeal Process
  [TRACKING_EVENTS.CHALLENGE_CREATED]: {
    ticket_id: string;
    challenge_type: ChallengeType;
    reason: string;
  };
  [TRACKING_EVENTS.CHALLENGE_SUBMITTED]: {
    ticket_id: string;
    challenge_id: string;
  };
  [TRACKING_EVENTS.CHALLENGE_LETTER_GENERATED]: {
    ticket_id: string;
    challenge_type: 'LETTER' | 'AUTO_CHALLENGE';
  };
  [TRACKING_EVENTS.CHALLENGE_STATUS_UPDATED]: {
    ticket_id: string;
    challenge_id: string;
    status: string;
  };
  [TRACKING_EVENTS.AUTO_CHALLENGE_STARTED]: { ticket_id: string };
  [TRACKING_EVENTS.AUTO_CHALLENGE_COMPLETED]: {
    ticket_id: string;
    success: boolean;
  };

  // Vehicle Management
  [TRACKING_EVENTS.VEHICLE_ADDED]: {
    vehicle_id: string;
    registration_number: string;
    make: string;
    model: string;
    year: number;
    verified: boolean;
  };
  [TRACKING_EVENTS.VEHICLE_UPDATED]: {
    vehicle_id: string;
    registration_number: string;
    make: string;
    model: string;
    year: number;
    has_notes: boolean;
  };
  [TRACKING_EVENTS.VEHICLE_DELETED]: {
    vehicle_id: string;
    registration_number: string;
    make: string;
    model: string;
    ticket_count: number;
  };
  [TRACKING_EVENTS.VEHICLE_VERIFIED]: {
    vehicle_id?: string;
    registration_number: string;
    automated: boolean;
    lookup_success: boolean;
  };

  // Forms & Documents
  [TRACKING_EVENTS.FORM_GENERATED]: { ticket_id: string; form_type: FormType };
  [TRACKING_EVENTS.FORM_DOWNLOADED]: {
    ticket_id: string;
    form_id: string;
    form_type: FormType;
  };
  [TRACKING_EVENTS.LETTER_CREATED]: {
    ticket_id: string;
    letter_type: LetterType;
  };
  [TRACKING_EVENTS.LETTER_UPLOADED]: {
    ticket_id: string;
    letter_type: LetterType;
  };
  [TRACKING_EVENTS.EVIDENCE_UPLOADED]: {
    ticket_id: string;
    evidence_type: EvidenceType;
    count: number;
  };

  // Payment & Subscription
  [TRACKING_EVENTS.CHECKOUT_SESSION_CREATED]: {
    product_type: ProductType;
    ticket_id?: string;
    tier?: TicketTier;
  };
  [TRACKING_EVENTS.CUSTOMER_PORTAL_CREATED]: {
    user_id: string;
    stripe_customer_id: string;
  };
  [TRACKING_EVENTS.PAYMENT_COMPLETED]: {
    tier: 'FREE' | 'PREMIUM';
    amount: number;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };
  [TRACKING_EVENTS.TICKET_TIER_UPGRADED]: {
    ticket_id: string;
    from_tier: 'FREE';
    to_tier: 'PREMIUM';
  };
  [TRACKING_EVENTS.BILLING_PAGE_VISITED]: {
    has_stripe_customer: boolean;
  };

  // Navigation & Engagement
  [TRACKING_EVENTS.CTA_CLICKED]: { cta_name: string; location: string };
  [TRACKING_EVENTS.QUICK_ACTION_CLICKED]: {
    action: string;
    destination: string;
  };
  [TRACKING_EVENTS.FEATURE_LOCKED_VIEWED]: { feature_name: string };
  [TRACKING_EVENTS.APP_STORE_BUTTON_CLICKED]: {
    platform: 'ios' | 'android';
    location: string;
  };
  [TRACKING_EVENTS.DASHBOARD_VIEWED]: Record<string, never>;
  [TRACKING_EVENTS.SCROLL_DEPTH_REACHED]: {
    page: string;
    depth: 25 | 50 | 75 | 100;
    depth_label: string;
  };

  // Pricing & Plans
  [TRACKING_EVENTS.PRICING_PAGE_VIEWED]: Record<string, never>;
  [TRACKING_EVENTS.PRICING_TAB_CHANGED]: {
    from_tab: string;
    to_tab: string;
  };
  [TRACKING_EVENTS.PRICING_BILLING_TOGGLE_CHANGED]: {
    billing_period: string;
    tab: string;
  };
  [TRACKING_EVENTS.PRICING_PLAN_CLICKED]: {
    plan_name: string;
    plan_type: 'one-time';
    price: string;
    location: 'pricing_page' | 'homepage';
  };
  [TRACKING_EVENTS.PRICING_COMPARE_PLANS_CLICKED]: Record<string, never>;
  [TRACKING_EVENTS.PRICING_TIER_SELECTED]: {
    tier: 'premium';
    source: string;
  };
  [TRACKING_EVENTS.PRICING_TICKET_CREATED_WITH_TIER]: {
    ticket_id: string;
    tier: 'premium';
    source: string;
  };

  // Reminders & Notifications
  [TRACKING_EVENTS.REMINDER_SENT]: { ticket_id: string; reminder_type: string };
  [TRACKING_EVENTS.REMINDER_CLICKED]: {
    ticket_id: string;
    reminder_id: string;
  };
  [TRACKING_EVENTS.NOTIFICATION_SENT]: { notification_type: string };

  // Support & Feedback
  [TRACKING_EVENTS.FEEDBACK_SUBMITTED]: {
    category: 'issue' | 'idea' | 'other';
    has_image: boolean;
  };
  [TRACKING_EVENTS.SUPPORT_CONTACTED]: { method: 'email' | 'form' };
  [TRACKING_EVENTS.HELP_ARTICLE_VIEWED]: { article_id: string };

  // Demo Features
  [TRACKING_EVENTS.NOTIFICATION_DEMO_STARTED]: Record<string, never>;
  [TRACKING_EVENTS.NOTIFICATION_DEMO_STOPPED]: Record<string, never>;
  [TRACKING_EVENTS.PORTAL_DEMO_STARTED]: Record<string, never>;
  [TRACKING_EVENTS.PORTAL_DEMO_STOPPED]: Record<string, never>;

  // Free Tools
  [TRACKING_EVENTS.TOOLS_PAGE_VIEWED]: Record<string, never>;
  [TRACKING_EVENTS.MOT_CHECK_SEARCHED]: { registration: string };
  [TRACKING_EVENTS.MOT_CHECK_RESULT_VIEWED]: {
    registration: string;
    has_history: boolean;
    test_count: number;
  };
  [TRACKING_EVENTS.VEHICLE_LOOKUP_SEARCHED]: { registration: string };
  [TRACKING_EVENTS.VEHICLE_LOOKUP_RESULT_VIEWED]: {
    registration: string;
    make: string | null;
    tax_status: string | null;
    mot_status: string | null;
  };
  [TRACKING_EVENTS.LETTER_TEMPLATE_VIEWED]: {
    template_id: string;
    template_category: 'parking' | 'bailiff' | 'motoring';
  };
  [TRACKING_EVENTS.LETTER_TEMPLATE_FILLED]: {
    template_id: string;
    template_category: 'parking' | 'bailiff' | 'motoring';
    fields_completed: number;
    total_fields: number;
  };
  [TRACKING_EVENTS.LETTER_TEMPLATE_EMAIL_SUBMITTED]: {
    template_id: string;
    template_category: 'parking' | 'bailiff' | 'motoring';
  };
  [TRACKING_EVENTS.CONTRAVENTION_CODE_SEARCHED]: { query: string };
  [TRACKING_EVENTS.CONTRAVENTION_CODE_VIEWED]: {
    code: string;
    category: 'on-street' | 'off-street' | 'moving-traffic';
    penalty_level: 'higher' | 'lower' | 'n/a';
  };
  [TRACKING_EVENTS.ISSUER_SEARCHED]: { query: string };
  [TRACKING_EVENTS.ISSUER_VIEWED]: {
    issuer_id: string;
    issuer_type: 'council' | 'private' | 'tfl';
  };

  // Onboarding Sequence
  [TRACKING_EVENTS.ONBOARDING_EMAIL_SENT]: {
    ticket_id: string;
    step: number;
    pcn_number?: string;
  };
  [TRACKING_EVENTS.ONBOARDING_SEQUENCE_STARTED]: {
    ticket_id: string;
    pcn_number?: string;
  };
  [TRACKING_EVENTS.ONBOARDING_SEQUENCE_COMPLETED]: {
    ticket_id: string;
    step: number;
  };
  [TRACKING_EVENTS.ONBOARDING_SEQUENCE_EXITED]: {
    ticket_id: string;
    step: number;
    exit_reason: string;
  };

  // Activation
  [TRACKING_EVENTS.FIRST_TICKET_CREATED]: {
    ticket_id: string;
    time_since_signup_ms: number;
    method: 'camera' | 'manual';
    platform: 'web' | 'mobile';
  };

  // Sharing & Referral
  [TRACKING_EVENTS.SHARE_INITIATED]: {
    share_method: 'native' | 'copy_link' | 'email' | 'social';
    content_type: 'ticket' | 'result' | 'app' | 'tool';
  };
  [TRACKING_EVENTS.SHARE_COMPLETED]: {
    share_method: 'native' | 'copy_link' | 'email' | 'social';
    content_type: 'ticket' | 'result' | 'app' | 'tool';
  };
  [TRACKING_EVENTS.REFERRAL_CODE_GENERATED]: {
    code: string;
  };
  [TRACKING_EVENTS.REFERRAL_LANDING_VIEWED]: {
    code: string;
    referrer_name?: string;
  };
  [TRACKING_EVENTS.REFERRAL_SIGNUP_CLICKED]: {
    code: string;
  };
  [TRACKING_EVENTS.REFERRAL_ATTRIBUTED]: {
    referral_id: string;
    referrer_id: string;
    referee_id: string;
    code: string;
  };
  [TRACKING_EVENTS.REFERRAL_CREDITS_ISSUED]: {
    referral_id: string;
    referrer_id: string;
    referee_id: string;
    referrer_amount: number;
    referee_amount: number;
  };
  [TRACKING_EVENTS.REFERRAL_LINK_COPIED]: {
    code: string;
  };
  [TRACKING_EVENTS.REFERRAL_LINK_SHARED]: {
    code: string;
    share_method: string;
  };
  [TRACKING_EVENTS.REFERRAL_CREDIT_APPLIED]: {
    user_id: string;
    amount: number;
    coupon_id: string;
  };

  // Automation
  [TRACKING_EVENTS.AUTOMATION_STARTED]: {
    ticket_id: string;
    issuer: string;
    action: 'verify' | 'challenge';
  };
  [TRACKING_EVENTS.AUTOMATION_COMPLETED]: {
    ticket_id: string;
    issuer: string;
    action: 'verify' | 'challenge';
    duration_ms: number;
  };
  [TRACKING_EVENTS.AUTOMATION_FAILED]: {
    ticket_id: string;
    issuer: string;
    action: 'verify' | 'challenge';
    error: string;
    duration_ms: number;
  };

  // Deadline Tracking
  [TRACKING_EVENTS.TICKET_DEADLINE_APPROACHING]: {
    ticket_id: string;
    days_remaining: number;
    has_challenged: boolean;
  };

  // Content Attribution
  [TRACKING_EVENTS.BLOG_POST_VIEWED]: {
    slug: string;
    category: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };
  [TRACKING_EVENTS.VIDEO_VIEWED]: {
    video_type: 'news' | 'tribunal';
    video_id: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };

  // Mobile App Waitlist
  [TRACKING_EVENTS.WAITLIST_PAGE_VIEWED]: Record<string, never>;
  [TRACKING_EVENTS.WAITLIST_SIGNUP_SUBMITTED]: { email: string };
  [TRACKING_EVENTS.WAITLIST_SIGNUP_COMPLETED]: { email: string };
  [TRACKING_EVENTS.WAITLIST_SIGNUP_FAILED]: { email: string };
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
