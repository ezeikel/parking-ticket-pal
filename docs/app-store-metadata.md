# App Store Metadata — Parking Ticket Pal

## App Identity

- **App Name:** Parking Ticket Pal
- **Subtitle (30 chars):** Stop Your Fine From Growing
- **Bundle ID (iOS):** com.chewybytes.parkingticketpal.app
- **Package (Android):** com.chewybytes.parkingticketpal.app
- **Category:** Utilities (primary) / Lifestyle (secondary)

---

## App Description (4000 chars max)

```
A £60 parking ticket can balloon to £300+ if you miss a single deadline. Don't let that happen.

Parking Ticket Pal stops your parking ticket from spiralling out of control. Upload your ticket, and we'll track every deadline, show you exactly what to do next, and — if you want to fight it — handle the entire challenge process for you.

Whether you've received a PCN from a council, a private parking company, or TfL, we keep everything organised in one place so nothing slips through the cracks.

STOP YOUR FINE FROM GROWING

Parking fines double when you miss the early payment window. Then they go to debt recovery. Then bailiffs. We make sure it never gets that far.

• Scan your ticket — Point your camera at any parking ticket. The PCN number, issuer, amount, deadline, and location are extracted automatically. No typing required.

• Never miss a deadline — We track the 14-day discount window, the 28-day payment deadline, and every stage after. Push notifications remind you before time runs out.

• Everything in one place — Photos, evidence, correspondence, appeal letters, and documents stored against each ticket. Nothing gets lost.

• See exactly where you stand — A clear status timeline shows every ticket's journey from issue through to resolution.

CHALLENGE YOUR TICKET

Not every ticket is fair. If yours wasn't, you have options — and we can do the hard work for you.

• Know your chances first — Our Success Score analyses real UK tribunal decision data to show how likely a challenge is to succeed. Make an informed decision before you act.

• Build your case — Write your own appeal, or let AI assist you with a tailored challenge letter based on your specific ticket, circumstances, and evidence. Review, edit, and approve before anything is sent.

• Official appeal forms — Fill in TE7, TE9, PE2, and PE3 forms with step-by-step guidance. Make formal representations to councils or escalate to POPLA and the Traffic Penalty Tribunal.

• We submit it for you — This is the part no other app does. We go to the issuer's website, fill in the forms with your approved details, and submit the challenge on your behalf. You don't have to do anything.

• Evidence management — Attach photos, dashcam footage, and supporting documents to build your case. Sign appeal letters with a digital signature directly in the app.

MORE FEATURES

• Live portal checks — We automatically check issuer websites for status changes so you know the moment something happens.

• Multiple vehicles — Manage tickets across all your vehicles in one account.

• Map view — See all your tickets plotted on a map.

PRICING

• Free — Scan and track tickets, view basic details, and get deadline reminders.

• Premium (£14.99 per ticket) — Unlock everything: success prediction, challenge assistance, automatic submission, live portal checks, and priority support. One-time purchase — not a subscription.

That's less than what most tickets increase by when you miss a single deadline.

IMPORTANT NOTES

• This app provides tools to help you manage parking tickets. It does not provide legal advice.
• Success scores are estimates based on historical tribunal data and do not guarantee outcomes.
• Available for UK parking tickets — council PCNs, FPNs, and private parking charges.

A parking ticket doesn't have to cost you a penny more than it should.
```

---

## Keywords (100 chars max)

```
fine,challenge,dispute,fight,FPN,council,TfL,private,POPLA,unfair,letter,evidence,NTO,penalty,warden
```

---

## Promotional Text (170 chars, changeable without app update)

```
A £60 ticket can become £300+ if you miss a deadline. Upload yours now — we'll track it, show your options, and handle the challenge for you. One-time purchase, no subscription.
```

---

## Screenshot Scenes (6-8 screens)

Capture on iPhone 6.7" simulator in light mode:

1. **Ticket list** — Multiple tickets showing statuses, deadlines, and amounts at a glance
2. **Camera scanner** — Scanning a parking ticket with instant detail extraction
3. **Ticket detail** — Full ticket overview with deadline alert, status timeline, and info card
4. **Deadline tracking** — Deadline alert card showing days remaining with push notification prompt
5. **Success score** — Prediction card showing percentage score based on real tribunal data
6. **Challenge letter** — Appeal letter ready to review and send
7. **Map view** — All tickets plotted on a map
8. **Premium upgrade** — Paywall screen showing Premium features and pricing

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

- **Email:** testreviewer@parkingticketpal.com
- **Password:** AppReview2025!

### Review Notes

```
This app helps UK motorists track and manage parking tickets (PCNs) — monitoring deadlines to prevent fines from increasing, and providing tools to challenge tickets they believe were issued unfairly.

To test the app:
1. Create an account using any sign-in method
2. Use the camera to scan a parking ticket, or add one manually
3. View ticket details including deadline tracking, status timeline, and evidence management
4. Optionally view the success score and generate a challenge letter or appeal form

The app requires a UK parking ticket (PCN) to demonstrate full functionality. If you do not have one, you can add a ticket manually with any PCN number (e.g., "AB12345678") and issuer (e.g., "Lewisham Council").

In-app purchases:
- Premium Ticket (£14.99) — One-time upgrade for a single ticket. Unlocks success prediction, AI-assisted challenge letters, automatic challenge submission to issuer websites, live portal status checks, and priority support.

Users can also purchase Premium before adding ticket details. A draft ticket is created and the user fills in the details later via the ticket wizard.
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
| RevenueCat | Purchase history, device ID | Purchase management |

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
   - [ ] IAP (Premium one-time purchase)
   - [ ] Draft ticket purchase + completion flow
   - [ ] Push notifications (registration + receipt)
   - [ ] Deep links (parkingticketpal://...)
   - [ ] Error states (airplane mode)
   - [ ] iPad layout (content centred, readable)
   - [ ] ATT prompt appears on first launch
   - [ ] Offline banner appears when disconnected
