# App Store Metadata — Parking Ticket Pal

## App Identity

- **App Name:** Parking Ticket Pal
- **Subtitle (30 chars):** Track & manage parking tickets
- **Bundle ID (iOS):** com.chewybytes.parkingticketpal.app
- **Package (Android):** com.chewybytes.parkingticketpal.app
- **Category:** Utilities (primary) / Lifestyle (secondary)

---

## App Description (4000 chars max)

```
Got a parking ticket? Stay on top of it.

Parking Ticket Pal helps you track, manage, and take action on UK parking tickets — so you never miss a deadline or pay more than you need to.

Whether you've received a PCN from a council, a private parking company, or TfL, we keep everything organised in one place and give you the tools to decide what to do next.

TRACK & MANAGE YOUR TICKETS

1. Scan your ticket — Use your phone camera to capture ticket details instantly. The PCN number, issuer, amount, deadline, and location are all extracted automatically.

2. Stay on top of deadlines — Parking fines increase if you miss the early payment window. We track every deadline and send you push notifications before time runs out.

3. Store everything in one place — Keep photos of the ticket, evidence, correspondence, and documents together so nothing gets lost.

4. Monitor your ticket's journey — Follow each ticket from issue through to resolution with a clear status timeline.

CHALLENGE IF YOU CHOOSE TO

Not every ticket needs to be paid. If you believe your ticket was issued unfairly, Parking Ticket Pal gives you tools to take action:

• Success Score — See how likely a challenge is to succeed, based on real UK tribunal decision data we've analysed. This helps you make an informed decision before you act.

• Challenge Letters — Generate tailored appeal letters using AI assistance, customised to your specific ticket and circumstances. Review, edit, and send when you're ready.

• Official Appeal Forms — Fill in TE7, TE9, PE2, and PE3 forms with step-by-step guidance.

• Evidence Management — Attach photos, dashcam footage, and supporting documents to build your case.

• Digital Signature — Sign appeal letters directly in the app.

MORE FEATURES

• Live Portal Checks — Premium users get automated status checks against issuer websites so you know when something changes.

• Multiple Vehicles — Manage tickets across all your vehicles in one account.

• Map View — See all your tickets plotted on a map.

SUBSCRIPTION PLANS

• Free — Scan and track tickets, view basic details, and get deadline reminders.
• Standard — Unlock success scores, challenge letters, and form generation for all your tickets.
• Premium — Everything in Standard plus live portal status checks and priority support.

One-time ticket upgrades are also available if you prefer not to subscribe.

IMPORTANT NOTES

• This app provides tools and information to help you manage parking tickets. It does not provide legal advice.
• Success scores are estimates based on historical tribunal data and do not guarantee outcomes.
• Available for UK parking tickets (PCNs, FPNs, and private parking charges).

Download Parking Ticket Pal and take control of your parking tickets.
```

---

## Keywords (100 chars max)

```
parking ticket,PCN,parking fine,penalty charge notice,manage,track,appeal,challenge,UK,deadline
```

---

## Screenshot Scenes (6-8 screens)

Capture on iPhone 6.7" simulator in light mode:

1. **Ticket list** — Multiple tickets showing statuses, deadlines, and amounts at a glance
2. **Camera scanner** — Scanning a parking ticket with instant detail extraction
3. **Ticket detail** — Full ticket overview with deadline alert, status timeline, and info card
4. **Deadline tracking** — Deadline alert card showing days remaining with push notification prompt
5. **Success score** — Prediction card showing percentage score based on real tribunal data
6. **Challenge letter** — AI-assisted appeal letter ready to review and send
7. **Map view** — All tickets plotted on a map
8. **Settings / subscription** — Account management and subscription options

### Screenshot Dimensions Required

| Device | Resolution | Required |
|--------|-----------|----------|
| iPhone 6.7" (15 Pro Max) | 1290 x 2796 | Yes |
| iPhone 6.1" (15 Pro) | 1179 x 2556 | Yes |
| iPad 12.9" (6th gen) | 2048 x 2732 | Yes (supportsTablet: true) |
| Android Phone | 1080 x 1920+ | Yes |
| Android Feature Graphic | 1024 x 500 | Yes |

---

## App Review Notes

See `docs/app-store-products.md` for IAP review notes.

### Demo Account

Provide Apple with a test account for review:

- **Email:** (configure a test account before submission)
- **Password:** (configure before submission)

### Review Notes

```
This app helps UK motorists track and manage parking tickets (PCNs) — monitoring deadlines to prevent fines from increasing, and optionally providing tools to challenge tickets they believe were issued unfairly.

To test the app:
1. Create an account using any sign-in method
2. Use the camera to scan a parking ticket, or add one manually
3. View ticket details including deadline tracking, status timeline, and evidence management
4. Optionally view the success score and generate a challenge letter or appeal form

The app requires a UK parking ticket (PCN) to demonstrate full functionality. If you do not have one, you can add a ticket manually with any PCN number (e.g., "AB12345678") and issuer (e.g., "Lewisham Council").

In-app purchases:
- Standard Ticket (£2.99) — One-time upgrade for a single ticket
- Premium Ticket (£4.99) — One-time upgrade for a single ticket
- Standard Monthly (£3.99/month) — Subscription for all tickets
- Standard Annual (£29.99/year) — Subscription for all tickets
- Premium Monthly (£6.99/month) — Subscription for all tickets
- Premium Annual (£49.99/year) — Subscription for all tickets
```

---

## Apple Privacy Questionnaire

### Data Collection

| Data Type | Collected | Linked to User | Used for Tracking |
|-----------|-----------|---------------|-------------------|
| Email Address | Yes | Yes | No |
| Name | Yes | Yes | No |
| Phone Number | Yes (optional) | Yes | No |
| Physical Address | Yes (optional) | Yes | No |
| Coarse Location | Yes (ticket location) | Yes | No |
| Device ID | Yes | No | Yes (with ATT consent) |
| Product Interaction | Yes | Yes | No |
| Crash Data | Yes | No | No |
| Performance Data | Yes | No | No |
| Purchase History | Yes | Yes | No |

### Third-Party Data Sharing

| Service | Data Shared | Purpose |
|---------|-------------|---------|
| PostHog (eu.i.posthog.com) | Device ID, product interaction, performance data | Analytics |
| Sentry (sentry.io) | Crash data, performance data | Crash reporting |
| Google AdMob | Device ID (non-personalised ads) | Advertising |
| RevenueCat | Purchase history, device ID | Subscription management |

### Data Retention

- Account data is retained until the user deletes their account
- Analytics data is retained for 12 months
- Crash data is retained for 90 days

---

## Google Play Data Safety

### Data Collected

| Category | Data Type | Required | Encrypted | Shared |
|----------|-----------|----------|-----------|--------|
| Personal info | Name | Optional | Yes | No |
| Personal info | Email | Optional | Yes | No |
| Personal info | Phone | Optional | Yes | No |
| Personal info | Address | Optional | Yes | No |
| Financial | Purchase history | Required | Yes | Yes (RevenueCat) |
| Location | Approximate location | Optional | Yes | No |
| App activity | In-app actions | Required | Yes | Yes (PostHog) |
| App info | Crash logs | Required | Yes | Yes (Sentry) |
| Device | Device identifiers | Required | Yes | Yes (AdMob, PostHog) |

### Deletion

Users can request account deletion via the app settings or by emailing support@parkingticketpal.com.

---

## TestFlight / Internal Testing Checklist

1. `pnpm eas:build:production` for iOS
2. `eas submit --platform ios --profile beta` for TestFlight
3. `eas submit --platform android --profile beta` for Google Play internal track
4. Test all flows:
   - [ ] Onboarding (carousel + ticket scan + skip)
   - [ ] Camera scanner (OCR + manual entry)
   - [ ] Ticket creation and detail view
   - [ ] IAP (subscription + one-time purchase)
   - [ ] Push notifications (registration + receipt)
   - [ ] Deep links (parkingticketpal://...)
   - [ ] Error states (airplane mode)
   - [ ] iPad layout (content centred, readable)
   - [ ] ATT prompt appears on first launch
   - [ ] Offline banner appears when disconnected
