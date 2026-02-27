import { Platform } from 'react-native'
import { usePostHog } from 'posthog-react-native'

// Define event types for better type safety
export type AnalyticsEvent =
  // Authentication events
  | "auth_sign_in_started"
  | "auth_sign_in_success"
  | "auth_sign_in_failed"
  | "auth_sign_out"
  | "auth_magic_link_requested"

  // Ticket scanning events
  | "ticket_scan_started"
  | "ticket_scan_success"
  | "ticket_scan_cancelled"
  | "ticket_scan_retry"
  | "ticket_image_picker_used"
  | "ticket_document_scanner_used"

  // OCR processing events
  | "ocr_processing_started"
  | "ocr_processing_success"
  | "ocr_processing_failed"

  // Ticket management events
  | "ticket_created"
  | "ticket_form_opened"
  | "ticket_form_cancelled"
  | "ticket_form_submitted"
  | "ticket_viewed"
  | "ticket_list_viewed"

  // Form interactions
  | "vehicle_reg_entered"
  | "pcn_number_entered"
  | "date_picker_opened"
  | "contravention_code_selected"
  | "contravention_code_searched"
  | "location_searched"
  | "location_selected"

  // Navigation events
  | "screen_viewed"
  | "tab_switched"
  | "modal_opened"
  | "modal_closed"

  // Debugging events
  | "scanner_component_mounted"
  | "scan_document_method_called"
  | "dev_mode_image_picker_fallback"
  | "camera_permission_result"
  | "camera_denied_fallback_to_library"
  | "document_scanner_failed_fallback_to_library"
  | "document_scanner_retry"
  | "image_picker_permission_requested"
  | "image_picker_permission_result"
  | "image_library_launching"
  | "image_picker_about_to_launch"
  | "image_picker_launch_completed"
  | "image_picker_launch_failed"
  | "image_picker_result"

  // Settings events
  | "settings_viewed"
  | "user_profile_viewed"
  | "name_updated"
  | "phone_number_updated"
  | "address_updated"
  | "signature_updated"
  | "signature_sheet_opened"
  | "name_sheet_opened"
  | "email_sheet_opened"
  | "phone_sheet_opened"
  | "address_sheet_opened"

  // Search, filter, and sort events
  | "search_opened"
  | "search_performed"
  | "search_cleared"
  | "filter_opened"
  | "filters_applied"
  | "filters_cleared"
  | "sort_opened"
  | "sort_applied"
  | "sort_cleared"

  // Paywall events
  | "paywall_opened"
  | "paywall_plan_selected"
  | "paywall_billing_period_changed"
  | "paywall_purchase_success"
  | "paywall_purchase_cancelled"
  | "paywall_restore_success"
  | "paywall_trial_started"
  | "paywall_closed_without_purchase"

  // Wizard events
  | "camera_wizard_completed"
  | "manual_entry_wizard_completed"
  | "wizard_step_viewed"
  | "wizard_step_completed"
  | "wizard_abandoned"
  | "wizard_completed"
  | "wizard_creating_ticket"
  | "wizard_ticket_created"

  // Onboarding events
  | "onboarding_completed"
  | "onboarding_ticket_created"
  | "onboarding_scan_now_tapped"
  | "onboarding_manual_entry_tapped"
  | "onboarding_scan_skipped"
  | "onboarding_skipped"
  | "onboarding_next_clicked"
  | "onboarding_viewed_from_settings"

  // Account linking
  | "link_account_started"
  | "link_account_success"
  | "link_account_failed"

  // Activation
  | "first_ticket_created"

  // Sharing & Referral
  | "share_initiated"
  | "share_completed"
  | "referral_invite_tapped"

  // Settings actions
  | "restore_purchases_tapped"
  | "account_delete_tapped"
  | "dev_clear_app_data"

  // Error events
  | "error_occurred"
  | "network_error"
  | "permission_denied"

export type AnalyticsProperties = {
  // Screen/navigation properties
  screen?: string
  previous_screen?: string
  tab?: string
  modal_type?: string

  // Ticket properties
  ticket_id?: string
  intent?: string
  has_vehicle_reg?: boolean
  has_pcn_number?: boolean
  has_location?: boolean
  contravention_code?: string
  initial_amount?: number
  issuer?: string

  // OCR properties
  processing_time_ms?: number
  ocr_confidence?: number
  extracted_fields_count?: number
  has_extracted_vehicle_reg?: boolean
  has_extracted_pcn_number?: boolean
  has_extracted_date?: boolean
  has_extracted_amount?: boolean

  // Form properties
  form_field?: string
  validation_errors?: string[]
  is_prefilled?: boolean
  search_query?: string
  selected_value?: string

  // Authentication properties
  auth_method?: "google" | "apple" | "facebook" | "magic_link"
  auth_provider?: string

  // Error properties
  error_message?: string
  error_code?: string
  error_type?: "validation" | "network" | "permission" | "ocr" | "scanning" | "general"

  // Device/app properties
  platform?: "ios" | "android" | "windows" | "macos" | "web"
  app_version?: string
  is_dev_mode?: boolean

  // Permission properties
  granted?: boolean
  can_ask_again?: boolean
  status?: string

  // Image picker properties
  cancelled?: boolean
  assets_count?: number

  // User interaction properties
  button_location?: string
  interaction_type?: "tap" | "long_press" | "swipe"
  scan_method?: "document_scanner" | "image_picker"

  // Search properties
  searchTerm?: string
  searchLength?: number
  resultCount?: number
  hasResults?: boolean
  previousTerm?: string
  hadResults?: boolean
  source?: string

  // Filter properties
  issuerCount?: number
  statusCount?: number
  issuers?: string[]
  statuses?: string[]
  totalFilters?: number
  clearedIssuers?: string[]
  clearedStatuses?: string[]

  // Sort properties
  sortBy?: string
  sortOrder?: "asc" | "desc"
  previousSortBy?: string
  previousSortOrder?: "asc" | "desc"

  // Paywall properties
  mode?: string
  plan_id?: string
  tier?: string
  product_id?: string
  price?: string
  billing_period?: string
  is_trial?: boolean
  trial_duration?: string | null

  // Wizard properties
  step_name?: string
  step_number?: number
  last_step?: string

  // Onboarding properties
  slide?: number
  current_slide?: number
  skipped_at_slide?: number
  ticketId?: string

  // Account linking properties
  method?: string

  // Activation properties
  time_since_signup_ms?: number

  // Sharing properties
  share_method?: 'native' | 'copy_link' | 'email' | 'social'
  content_type?: 'ticket' | 'result' | 'app' | 'tool'
}

/**
 * Hook to track analytics events with PostHog
 */
export function useAnalytics() {
  const posthog = usePostHog()

  const trackEvent = (
    event: AnalyticsEvent,
    properties?: AnalyticsProperties
  ): void => {
    try {
      // Add common properties
      const commonProperties = {
        platform: Platform.OS,
        is_dev_mode: __DEV__,
        timestamp: new Date().toISOString(),
        ...properties
      }

      // Track with PostHog
      posthog.capture(event, commonProperties)

      // Optional: Add console logging in development
      if (__DEV__) {
        console.log(`[Analytics] ${event}`, commonProperties)
      }
    } catch (error) {
      // Silently fail in production, log in development
      if (__DEV__) {
        console.error("[Analytics] Error tracking event:", error)
      }
    }
  }

  const trackScreenView = (screenName: string, previousScreen?: string): void => {
    trackEvent("screen_viewed", {
      screen: screenName,
      previous_screen: previousScreen
    })
  }

  const trackError = (
    error: Error | string,
    context?: {
      screen?: string
      action?: string
      errorType?: AnalyticsProperties['error_type']
    }
  ): void => {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorType = context?.errorType || 'general'

    trackEvent("error_occurred", {
      error_message: errorMessage,
      error_type: errorType,
      screen: context?.screen,
      button_location: context?.action
    })
  }

  return { trackEvent, trackScreenView, trackError }
}

/**
 * Helper function to calculate analytics properties for OCR results
 */
export function getOCRAnalyticsProperties(ocrResult: any, processingStartTime: number) {
  const processingTime = Date.now() - processingStartTime
  const extractedData = ocrResult?.data || {}

  return {
    processing_time_ms: processingTime,
    extracted_fields_count: Object.keys(extractedData).length,
    has_extracted_vehicle_reg: !!extractedData.vehicleReg,
    has_extracted_pcn_number: !!extractedData.pcnNumber,
    has_extracted_date: !!extractedData.issuedAt,
    has_extracted_amount: !!extractedData.initialAmount
  }
}

/**
 * Helper function to calculate analytics properties for ticket form data
 */
export function getTicketFormAnalyticsProperties(formData: any) {
  return {
    has_vehicle_reg: !!formData.vehicleReg,
    has_pcn_number: !!formData.pcnNumber,
    has_location: !!(formData.location?.line1),
    contravention_code: formData.contraventionCode,
    initial_amount: formData.initialAmount,
    issuer: formData.issuer
  }
}

/**
 * Helper function to track validation errors
 */
export function getValidationErrorsProperties(errors: Record<string, any>) {
  const errorFields = Object.keys(errors).filter(key => errors[key])

  return {
    validation_errors: errorFields,
    error_type: 'validation' as const
  }
}