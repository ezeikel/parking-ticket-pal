// eslint-disable-next-line import/prefer-default-export
export const TRACKING_EVENTS = {
  // Authentication & User Management
  AUTH_METHOD_SELECTED: 'auth_method_selected',
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',
  USER_PROFILE_UPDATED: 'user_profile_updated',
  USER_SIGNATURE_ADDED: 'user_signature_added',

  // Hero (Web Homepage)
  HERO_VIEWED: 'hero_viewed',
  HERO_UPLOAD_STARTED: 'hero_upload_started',
  HERO_UPLOAD_COMPLETED: 'hero_upload_completed',
  HERO_UPLOAD_FAILED: 'hero_upload_failed',
  HERO_MANUAL_ENTRY_CLICKED: 'hero_manual_entry_clicked',

  // OCR Processing
  OCR_PROCESSING_STARTED: 'ocr_processing_started',
  OCR_PROCESSING_SUCCESS: 'ocr_processing_success',
  OCR_PROCESSING_FAILED: 'ocr_processing_failed',

  // Ticket Wizard
  WIZARD_OPENED: 'wizard_opened',
  WIZARD_STEP_VIEWED: 'wizard_step_viewed',
  WIZARD_STEP_COMPLETED: 'wizard_step_completed',
  WIZARD_INTENT_SELECTED: 'wizard_intent_selected',
  WIZARD_CHALLENGE_REASON_SELECTED: 'wizard_challenge_reason_selected',
  WIZARD_COMPLETED: 'wizard_completed',
  WIZARD_ABANDONED: 'wizard_abandoned',

  // Guest Flow
  GUEST_SIGNUP_PAGE_VIEWED: 'guest_signup_page_viewed',
  GUEST_SIGNUP_STARTED: 'guest_signup_started',
  GUEST_SIGNUP_COMPLETED: 'guest_signup_completed',
  GUEST_CLAIM_PAGE_VIEWED: 'guest_claim_page_viewed',

  // Ticket Management
  TICKET_CREATED: 'ticket_created',
  TICKET_UPDATED: 'ticket_updated',
  TICKET_DELETED: 'ticket_deleted',
  TICKET_STATUS_CHANGED: 'ticket_status_changed',
  TICKET_IMAGE_UPLOADED: 'ticket_image_uploaded',
  TICKET_OCR_PROCESSED: 'ticket_ocr_processed',

  // Challenge & Appeal Process
  CHALLENGE_CREATED: 'challenge_created',
  CHALLENGE_SUBMITTED: 'challenge_submitted',
  CHALLENGE_LETTER_GENERATED: 'challenge_letter_generated',
  CHALLENGE_STATUS_UPDATED: 'challenge_status_updated',
  AUTO_CHALLENGE_STARTED: 'auto_challenge_started',
  AUTO_CHALLENGE_COMPLETED: 'auto_challenge_completed',

  // Vehicle Management
  VEHICLE_ADDED: 'vehicle_added',
  VEHICLE_UPDATED: 'vehicle_updated',
  VEHICLE_DELETED: 'vehicle_deleted',
  VEHICLE_VERIFIED: 'vehicle_verified',

  // Forms & Documents
  FORM_GENERATED: 'form_generated',
  FORM_DOWNLOADED: 'form_downloaded',
  LETTER_CREATED: 'letter_created',
  LETTER_UPLOADED: 'letter_uploaded',
  EVIDENCE_UPLOADED: 'evidence_uploaded',

  // Payment & Subscription
  CHECKOUT_SESSION_CREATED: 'checkout_session_created',
  CUSTOMER_PORTAL_CREATED: 'customer_portal_created',
  PAYMENT_COMPLETED: 'payment_completed',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  TICKET_TIER_UPGRADED: 'ticket_tier_upgraded',
  BILLING_PAGE_VISITED: 'billing_page_visited',

  // Engagement
  CTA_CLICKED: 'cta_clicked',
  QUICK_ACTION_CLICKED: 'quick_action_clicked',
  FEATURE_LOCKED_VIEWED: 'feature_locked_viewed',
  APP_STORE_BUTTON_CLICKED: 'app_store_button_clicked',
  DASHBOARD_VIEWED: 'dashboard_viewed',
  SCROLL_DEPTH_REACHED: 'scroll_depth_reached',

  // Pricing & Plans
  PRICING_PAGE_VIEWED: 'pricing_page_viewed',
  PRICING_TAB_CHANGED: 'pricing_tab_changed',
  PRICING_BILLING_TOGGLE_CHANGED: 'pricing_billing_toggle_changed',
  PRICING_PLAN_CLICKED: 'pricing_plan_clicked',
  PRICING_COMPARE_PLANS_CLICKED: 'pricing_compare_plans_clicked',
  PRICING_TIER_SELECTED: 'pricing_tier_selected',
  PRICING_TICKET_CREATED_WITH_TIER: 'pricing_ticket_created_with_tier',

  // Reminders & Notifications
  REMINDER_SENT: 'reminder_sent',
  REMINDER_CLICKED: 'reminder_clicked',
  NOTIFICATION_SENT: 'notification_sent',

  // Support & Feedback
  FEEDBACK_SUBMITTED: 'feedback_submitted',
  SUPPORT_CONTACTED: 'support_contacted',
  HELP_ARTICLE_VIEWED: 'help_article_viewed',

  // Demo Features
  NOTIFICATION_DEMO_STARTED: 'notification_demo_started',
  NOTIFICATION_DEMO_STOPPED: 'notification_demo_stopped',
} as const;
