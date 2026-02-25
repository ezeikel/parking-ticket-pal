# Parking Ticket Pal — Analytics Tracking Plan

> **Last updated**: 2026-02-25
> **Tool**: PostHog (EU region, project 78799)
> **Platforms**: Web (Next.js 15), Mobile (Expo/React Native)

---

## Table of Contents

1. [Infrastructure Summary](#infrastructure-summary)
2. [Event Inventory](#event-inventory)
3. [Naming Conventions](#naming-conventions)
4. [Funnel Definitions](#funnel-definitions)
5. [Key Dashboards](#key-dashboards)
6. [Changelog](#changelog)

---

## Infrastructure Summary

### Web App (`apps/web`)

| Layer | File | Mechanism |
|-------|------|-----------|
| Client analytics | `utils/analytics-client.ts` | `useAnalytics()` hook → `posthog.capture()` |
| Server analytics | `utils/analytics-server.ts` | `track()` server action → `posthog-node` |
| Client logger | `lib/logger.ts` + `lib/use-logger.ts` | `logger.*()` → PostHog `log_entry` event + OTLP |
| PostHog init | `instrumentation-client.ts` | `posthog-js` with reverse proxy host + console log capture |
| PostHog server | `lib/posthog-server.ts` | `posthog-node`, `flushAt: 1` (immediate) |
| **PostHog Logs (OTLP)** | `instrumentation.ts` | OpenTelemetry `LoggerProvider` → `eu.i.posthog.com/i/v1/logs` |

### Mobile App (`apps/mobile`)

| Layer | File | Mechanism |
|-------|------|-----------|
| Analytics | `lib/analytics.ts` | `useAnalytics()` hook → `posthog.capture()` |
| Logger | `lib/logger.ts` | `useLogger()` hook → PostHog `log_entry` event + OTLP |
| **PostHog Logs (OTLP)** | `lib/posthog-logs.ts` | Lightweight HTTP OTLP sender → `eu.i.posthog.com/i/v1/logs` |
| Provider | `providers.tsx` | `PostHogProvider` from `posthog-react-native` |
| Navigation | `components/PostHogNavigationTracker.tsx` | Auto screen view tracking via Expo Router |

### PostHog Logs Architecture

Logs are sent to PostHog's dedicated Logs product via the OpenTelemetry Protocol (OTLP):

- **Web server-side**: `@opentelemetry/sdk-logs` + `@opentelemetry/exporter-logs-otlp-http` configured in `instrumentation.ts`. Logs are batched and flushed via `loggerProvider.forceFlush()`.
- **Web client-side**: Browser `console.*` calls are automatically captured by `posthog-js` (via `enable_recording_console_log: true`) and linked to session replays.
- **Mobile**: Custom lightweight OTLP HTTP sender (`lib/posthog-logs.ts`) batches logs (10 records or 30s interval) and sends to PostHog EU endpoint.

All logs include:
- `service.name`: `ptp-web` or `ptp-mobile`
- `deployment.environment`: `development`, `preview`, or `production` (from `VERCEL_ENV` on web, EAS channel on mobile)
- Severity levels: `DEBUG`, `INFO`, `WARN`, `ERROR`

**How to use in PostHog**: Navigate to Logs tab → filter by `service.name`, `deployment.environment`, or severity. Debug logs from preview builds are searchable for mobile debugging without polluting production analytics.

### Shared Properties

All events automatically include PostHog defaults (distinct_id, session_id, timestamp, device info). Additionally:

- **Web**: user_id, URL, environment enriched by `analytics-client.ts`
- **Mobile**: platform, is_dev_mode, timestamp enriched by `analytics.ts`

---

## Event Inventory

> All property names use **snake_case** consistently across web and mobile.

### Web App — 98 Events

#### Authentication & User (7)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `auth_method_selected` | method, location | Which auth methods are preferred |
| `auth_sign_up_completed` | method | Signup conversion by method |
| `auth_sign_in_completed` | method | Login frequency and method preference |
| `auth_sign_out` | — | Session length analysis |
| `user_profile_updated` | name, phone_number, address, signature (booleans) | Profile completion rate |
| `user_signature_added` | — | Signature adoption |
| `user_account_deleted` | user_id | Churn tracking |

#### Hero / Landing (5)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `hero_viewed` | source | Landing page reach |
| `hero_upload_started` | file_type, file_size, compressed_file_size, was_compressed, compression_ratio | Upload UX quality |
| `hero_upload_completed` | file_type, file_size, duration_ms, ocr_success, fields_extracted, ocr_error | OCR success rate |
| `hero_upload_failed` | file_type, error | Upload failure diagnosis |
| `hero_manual_entry_clicked` | — | Camera vs manual preference |

#### OCR Processing (3)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `ocr_processing_started` | source ('web'/'mobile') | OCR usage by platform |
| `ocr_processing_success` | source, fields_extracted | OCR accuracy |
| `ocr_processing_failed` | source, error, reason | OCR failure diagnosis |

#### Ticket Wizard (7)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `wizard_opened` | source, has_image, path | Entry point analysis |
| `wizard_step_viewed` | step_name, step_number, total_steps, path | Step reach rates |
| `wizard_step_completed` | step_name, selection | Step completion rates |
| `wizard_intent_selected` | intent ('track'/'challenge') | Track vs challenge split |
| `wizard_challenge_reason_selected` | reason | Most common challenge reasons |
| `wizard_completed` | intent, tier, total_steps, path, challenge_reason | Wizard completion rate |
| `wizard_abandoned` | last_step, step_number, intent | Drop-off points |

#### Guest Flow (4)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `guest_signup_page_viewed` | intent, has_pcn, source | Guest-to-signup funnel entry |
| `guest_signup_started` | method, intent | Guest conversion attempt rate |
| `guest_signup_completed` | method, intent | Guest conversion success |
| `guest_claim_page_viewed` | has_session_id, tier | Claim page effectiveness |

#### Ticket Management (6)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `ticket_created` | ticket_id, pcn_number, issuer, issuer_type, prefilled | Ticket volume by issuer |
| `ticket_updated` | ticket_id, fields[] | Which fields get edited |
| `ticket_deleted` | ticket_id | Ticket abandonment |
| `ticket_status_changed` | ticket_id, from_status, to_status | Status flow analysis |
| `ticket_image_uploaded` | ticket_id, image_count | Image usage rate |
| `ticket_ocr_processed` | ticket_id, success, duration_ms | OCR performance per ticket |

#### Challenge & Appeal (6)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `challenge_created` | ticket_id, challenge_type, reason | Challenge initiation rate |
| `challenge_submitted` | ticket_id, challenge_id | Challenge completion rate |
| `challenge_letter_generated` | ticket_id, challenge_type ('LETTER'/'AUTO_CHALLENGE') | Letter vs auto-challenge split |
| `challenge_status_updated` | ticket_id, challenge_id, status | Challenge status tracking |
| `auto_challenge_started` | ticket_id | Auto-challenge adoption |
| `auto_challenge_completed` | ticket_id, success | Auto-challenge success rate |

> **Note**: Challenge outcomes (won/lost) happen off-platform at the council. We cannot track these automatically — outcomes are only known if a user manually reports them.

#### Vehicle Management (4)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `vehicle_added` | vehicle_id, registration_number, make, model, year, verified | Vehicle registration rate |
| `vehicle_updated` | vehicle_id, registration_number, make, model, year, has_notes | Vehicle data maintenance |
| `vehicle_deleted` | vehicle_id, registration_number, make, model, ticket_count | Vehicle churn |
| `vehicle_verified` | vehicle_id, registration_number, automated, lookup_success | Verification success rate |

#### Forms & Documents (5)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `form_generated` | ticket_id, form_type | Form generation frequency |
| `form_downloaded` | ticket_id, form_id, form_type | Form download rate |
| `letter_created` | ticket_id, letter_type | Letter creation rate |
| `letter_uploaded` | ticket_id, letter_type | Letter upload completion |
| `evidence_uploaded` | ticket_id, evidence_type, count | Evidence submission patterns |

#### Payment & Subscription (5)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `checkout_session_created` | product_type, ticket_id, tier | Purchase intent by tier |
| `customer_portal_created` | user_id, stripe_customer_id | Billing management usage |
| `payment_completed` | tier, amount, utm_source, utm_medium, utm_campaign | Revenue by tier + acquisition attribution |
| `ticket_tier_upgraded` | ticket_id, from_tier, to_tier | Upgrade path analysis |
| `billing_page_visited` | has_stripe_customer | Billing page engagement |

#### Engagement (6)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `cta_clicked` | cta_name, location | CTA effectiveness |
| `quick_action_clicked` | action, destination | Feature discoverability |
| `feature_locked_viewed` | feature_name | Paywall impression rate |
| `app_store_button_clicked` | platform, location | Mobile app download intent |
| `dashboard_viewed` | — | Dashboard engagement |
| `scroll_depth_reached` | page, depth (25/50/75/100), depth_label | Content engagement depth |

#### Pricing (7)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `pricing_page_viewed` | — | Pricing page traffic |
| `pricing_tab_changed` | from_tab, to_tab | Pricing tab interest |
| `pricing_billing_toggle_changed` | billing_period, tab | Monthly vs annual preference |
| `pricing_plan_clicked` | plan_name, plan_type, price, location | Plan interest by tier |
| `pricing_compare_plans_clicked` | — | Comparison feature usage |
| `pricing_tier_selected` | tier, source | Tier selection patterns |
| `pricing_ticket_created_with_tier` | ticket_id, tier, source | Tier-to-ticket conversion |

#### Reminders & Notifications (3)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `reminder_sent` | ticket_id, reminder_type | Reminder delivery volume |
| `reminder_clicked` | ticket_id, reminder_id | Reminder engagement rate |
| `notification_sent` | notification_type | Notification volume |

#### Support & Feedback (3)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `feedback_submitted` | category, has_image | Feedback volume and type |
| `support_contacted` | method | Support channel preference |
| `help_article_viewed` | article_id | Help content effectiveness |

#### Free Tools (12)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `tools_page_viewed` | — | Free tools traffic |
| `mot_check_searched` | registration | MOT tool usage |
| `mot_check_result_viewed` | registration, has_history, test_count | MOT result engagement |
| `vehicle_lookup_searched` | registration | Vehicle lookup usage |
| `vehicle_lookup_result_viewed` | registration, make, tax_status, mot_status | Lookup result engagement |
| `letter_template_viewed` | template_id, template_category | Template popularity |
| `letter_template_filled` | template_id, template_category, fields_completed, total_fields | Template completion rate |
| `letter_template_email_submitted` | template_id, template_category | Template email capture |
| `contravention_code_searched` | query | Code search usage |
| `contravention_code_viewed` | code, category, penalty_level | Code lookup engagement |
| `issuer_searched` | query | Issuer search usage |
| `issuer_viewed` | issuer_id, issuer_type | Issuer page engagement |

#### Onboarding Email Sequence (4)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `onboarding_email_sent` | ticket_id, step, pcn_number | Email delivery by step |
| `onboarding_sequence_started` | ticket_id, pcn_number | Sequence enrollment |
| `onboarding_sequence_completed` | ticket_id, step | Sequence completion |
| `onboarding_sequence_exited` | ticket_id, step, exit_reason | Drop-off point and reason |

#### Demo (2)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `notification_demo_started` | — | Demo engagement |
| `notification_demo_stopped` | — | Demo completion |

#### NEW: Activation (1)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `first_ticket_created` | ticket_id, time_since_signup_ms, method (camera/manual), platform | Core activation metric |

#### NEW: Sharing & Referral (2)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `share_initiated` | share_method, content_type | Sharing intent |
| `share_completed` | share_method, content_type | Sharing completion rate |

#### NEW: Automation (3)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `automation_started` | ticket_id, issuer, action (verify/challenge) | Automation usage |
| `automation_completed` | ticket_id, issuer, action, duration_ms | Automation success rate by issuer |
| `automation_failed` | ticket_id, issuer, action, error, duration_ms | Automation failure diagnosis |

#### NEW: Deadline Tracking (1)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `ticket_deadline_approaching` | ticket_id, days_remaining, has_challenged | Urgency-driven behavior |

#### NEW: Content Attribution (2)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `blog_post_viewed` | slug, category, utm_source, utm_medium, utm_campaign | Content marketing ROI |
| `video_viewed` | video_type (news/tribunal), video_id, utm_source, utm_medium, utm_campaign | Video marketing ROI |

---

### Mobile App — 105+ Events

> See `apps/mobile/lib/analytics.ts` for the full typed `AnalyticsEvent` union. Mobile events already use snake_case consistently. New events added:

#### NEW Events (Mobile)

| Event | Properties | Decision It Informs |
|-------|-----------|---------------------|
| `first_ticket_created` | ticket_id, time_since_signup_ms, method, platform | Core activation metric |
| `share_initiated` | share_method, content_type | Sharing intent |
| `share_completed` | share_method, content_type | Sharing completion rate |
| `wizard_step_viewed` | screen, step_name, step_number | Step reach rate |
| `wizard_step_completed` | screen, step_name | Step completion |
| `wizard_abandoned` | screen, last_step | Drop-off analysis |
| `wizard_completed` | screen, intent, issuer | Wizard completion |
| `wizard_creating_ticket` | screen | Ticket creation in progress |
| `wizard_ticket_created` | screen, ticket_id | Ticket creation success |
| `onboarding_completed` | screen | Onboarding completion |
| `onboarding_ticket_created` | ticketId | First ticket during onboarding |
| `onboarding_scan_now_tapped` | screen, slide | Scan CTA engagement |
| `onboarding_manual_entry_tapped` | screen, slide | Manual entry engagement |
| `onboarding_scan_skipped` | screen, slide | Skip behavior |
| `onboarding_skipped` | screen, skipped_at_slide | Full skip rate |
| `onboarding_next_clicked` | screen, current_slide | Slide progress |
| `onboarding_viewed_from_settings` | — | Re-engagement |
| `link_account_started/success/failed` | screen, method | Account linking |
| `restore_purchases_tapped` | screen | Restore usage |
| `account_delete_tapped` | screen | Delete intent |
| `dev_clear_app_data` | screen | Dev data clearing |

---

## Naming Conventions

### Rules (enforced)

- **Event names**: `snake_case`, `object_action` pattern (e.g., `ticket_created`, `wizard_completed`)
- **Property names**: `snake_case` everywhere (e.g., `ticket_id`, `file_type`, `duration_ms`)
- **Auth events**: `auth_*` prefix on both web and mobile
- **No PII** in property values (no emails, no full names in event properties)

### Previously Fixed Issues

| Issue | Resolution |
|-------|-----------|
| Web auth events used `user_signed_up` / `user_signed_in` | Renamed to `auth_sign_up_completed` / `auth_sign_in_completed` |
| Web properties used camelCase | Migrated all to snake_case |
| Mobile missing wizard/onboarding event types | Added to `AnalyticsEvent` type union |

---

## Funnel Definitions

### Funnel 1: New User Acquisition (Web)

```
hero_viewed
  → hero_upload_started OR hero_manual_entry_clicked
    → ocr_processing_success (if upload)
      → wizard_opened
        → wizard_intent_selected
          → wizard_completed
            → guest_signup_page_viewed
              → guest_signup_completed
                → ticket_created
                  → first_ticket_created (activation)
```

**Key metric**: `hero_viewed` → `first_ticket_created` conversion rate

### Funnel 2: Ticket-to-Challenge (Web)

```
ticket_created
  → challenge_created
    → challenge_letter_generated OR auto_challenge_started
      → challenge_submitted
```

**Key metric**: `ticket_created` → `challenge_submitted` conversion rate

### Funnel 3: Free-to-Paid (Web)

```
ticket_created (free tier)
  → feature_locked_viewed
    → pricing_page_viewed
      → pricing_plan_clicked
        → checkout_session_created
          → payment_completed (with UTM attribution)
```

**Key metric**: `feature_locked_viewed` → `payment_completed` conversion rate

### Funnel 4: Mobile Onboarding → First Ticket

```
onboarding_next_clicked (slide 1)
  → onboarding_scan_now_tapped OR onboarding_manual_entry_tapped
    → ticket_scan_started OR ticket_form_opened
      → ocr_processing_success OR ticket_form_submitted
        → wizard_completed
          → ticket_created
            → first_ticket_created (activation)
```

**Key metric**: Onboarding start → `first_ticket_created` within first session

### Funnel 5: Mobile Paywall Conversion

```
paywall_opened
  → paywall_plan_selected
    → paywall_purchase_success OR paywall_trial_started
```

**Key metric**: `paywall_opened` → purchase/trial conversion rate

### Funnel 6: Free Tools → Signup (Web)

```
tools_page_viewed
  → mot_check_searched OR vehicle_lookup_searched OR letter_template_viewed
    → letter_template_email_submitted (email capture)
      → auth_sign_up_completed
```

**Key metric**: Free tool usage → signup conversion

### Funnel 7: Content → Signup (Web) — NEW

```
blog_post_viewed OR video_viewed
  → auth_sign_up_completed (attributed via UTM)
    → payment_completed (attributed via UTM)
```

**Key metric**: Content consumption → signup → payment attribution

---

## Key Dashboards

### 1. Acquisition & Activation

| Metric | Events Used | Goal |
|--------|------------|------|
| Daily signups by method | `auth_sign_up_completed` | Track growth |
| Signup → first ticket rate | `auth_sign_up_completed` → `first_ticket_created` | > 60% within 24h |
| Time to first ticket | `first_ticket_created.time_since_signup_ms` | < 10 min |
| Camera vs manual split | `hero_upload_started` vs `hero_manual_entry_clicked` | Understand preference |
| OCR success rate | `ocr_processing_success` / `ocr_processing_started` | > 85% |

### 2. Core Product Funnel

| Metric | Events Used | Goal |
|--------|------------|------|
| Tickets created per week | `ticket_created` | Growth trend |
| Challenge rate | `challenge_created` / `ticket_created` | Track challenge adoption |
| Auto-challenge adoption | `auto_challenge_started` / `challenge_created` | > 50% |
| Wizard completion rate | `wizard_completed` / `wizard_opened` | > 75% |
| Wizard drop-off by step | `wizard_abandoned` grouped by `last_step` | Identify friction points |
| Automation success rate | `automation_completed` / `automation_started` by issuer | > 90% |

### 3. Revenue & Monetization

| Metric | Events Used | Goal |
|--------|------------|------|
| Revenue by tier | `payment_completed` grouped by tier | Revenue growth |
| Paywall → purchase rate | `paywall_opened` → `paywall_purchase_success` | > 5% |
| Feature gate impressions | `feature_locked_viewed` grouped by feature_name | Identify upgrade triggers |
| Revenue by acquisition source | `payment_completed` grouped by utm_source | Channel ROI |
| Upgrade path | `ticket_tier_upgraded` from/to analysis | Optimize tier structure |

### 4. Mobile Health

| Metric | Events Used | Goal |
|--------|------------|------|
| Onboarding completion | `onboarding_completed` / `onboarding_next_clicked` (slide 1) | > 70% |
| Camera permission grant rate | `camera_permission_result` (granted=true) | > 80% |
| Scan success rate | `ticket_scan_success` / `ticket_scan_started` | > 90% |
| Scanner fallback rate | `camera_denied_fallback_to_library` | < 10% |

### 5. Content & Free Tools

| Metric | Events Used | Goal |
|--------|------------|------|
| Tool page traffic | `tools_page_viewed` | Growth trend |
| Most popular tools | `mot_check_searched`, `vehicle_lookup_searched`, etc. | Prioritize tool development |
| Template email capture rate | `letter_template_email_submitted` / `letter_template_viewed` | > 15% |
| Blog → signup attribution | `blog_post_viewed` → `auth_sign_up_completed` | Measure content ROI |
| Video → signup attribution | `video_viewed` → `auth_sign_up_completed` | Measure video ROI |

---

## Changelog

### 2026-02-25

**PostHog Logs (OTLP) Integration**
- Added OpenTelemetry log exporter for web server-side (`instrumentation.ts`)
- Added lightweight OTLP HTTP sender for mobile (`lib/posthog-logs.ts`)
- Enabled browser console log capture in PostHog JS (`enable_recording_console_log: true`)
- Both web and mobile loggers now dual-write to PostHog Events (`log_entry`) AND PostHog Logs (OTLP)
- Debug events remain in all environments for PostHog Logs debugging (not gated behind `__DEV__`)

**New Events Added & Wired Up**
- `first_ticket_created` — fires in `ticket.ts` when `ticketCount === 1` for user; includes `time_since_signup_ms`
- `share_initiated` — fires in `BlogPostClient.tsx` on Twitter/LinkedIn/Facebook/copy-link share buttons
- `automation_started` / `automation_completed` / `automation_failed` — fires in `autoChallenge.ts:runWorkerChallengeAsync()` with `duration_ms`
- `ticket_deadline_approaching` — fires in `escalate-tickets/route.ts` on discount→full charge and full charge→NtO escalations
- `blog_post_viewed` — fires in `BlogPostClient.tsx` on mount via `useEffect`
- `video_viewed` — type defined, no call site yet (no user-facing video page exists)
- `share_completed` — type defined, ready for future two-phase share confirmation
- UTM params added to `payment_completed` for revenue attribution

**Naming Standardization**
- Web auth events renamed: `user_signed_up` → `auth_sign_up_completed`, `user_signed_in` → `auth_sign_in_completed`, `user_signed_out` → `auth_sign_out`
- All web event properties migrated from camelCase to snake_case
- Mobile `AnalyticsEvent` type union expanded with wizard, onboarding, account linking, and settings events

**Removed from Plan**
- `challenge_outcome_received` — challenge outcomes happen off-platform at council; cannot be tracked automatically
