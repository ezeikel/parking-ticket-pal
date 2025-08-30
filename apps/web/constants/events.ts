// eslint-disable-next-line import/prefer-default-export
export const TRACKING_EVENTS = {
  // Authentication & User Management
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',
  USER_PROFILE_UPDATED: 'user_profile_updated',
  USER_SIGNATURE_ADDED: 'user_signature_added',

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

  // Reminders & Notifications
  REMINDER_SENT: 'reminder_sent',
  REMINDER_CLICKED: 'reminder_clicked',
  NOTIFICATION_SENT: 'notification_sent',

  // Support & Feedback
  FEEDBACK_SUBMITTED: 'feedback_submitted',
  SUPPORT_CONTACTED: 'support_contacted',
  HELP_ARTICLE_VIEWED: 'help_article_viewed',
} as const;
