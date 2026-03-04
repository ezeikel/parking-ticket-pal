# App Review Notes — iOS & Android

Copy-paste-ready notes for App Store Connect and Google Play Console review submissions.

---

## iOS App Store Review Notes

```
TESTING INSTRUCTIONS

This app helps UK motorists manage parking tickets (PCNs) — tracking deadlines to prevent fines from increasing, and providing tools to challenge unfairly issued tickets.

TEST ACCOUNT (pre-populated with sample tickets):
Email: testreviewer@parkingticketpal.com
Password: AppReview2025!

To sign in: Settings tab → Sign In → enter email and password above → tap "Send Link". You will be signed in instantly. Alternatively, you can use the app without signing in — it works fully as an anonymous user.

TESTING FLOW (signed in with test account):
1. Open the app — you will see the onboarding carousel. Swipe through or tap "Skip"
2. The Tickets tab shows 3 pre-loaded sample tickets at different stages
3. Tap any ticket to view details: status timeline, deadline alerts, and ticket information
4. The Premium ticket ("LEW-REVIEW-003") has full features unlocked including success prediction
5. The Free tickets can be upgraded via the "Upgrade to Premium" button

TESTING FLOW (anonymous / no sign-in):
1. Open the app and complete onboarding
2. Tap the camera button (bottom-right FAB) to scan a ticket, or tap the "+" button for manual entry
3. For manual entry: enter any PCN (e.g., "TEST123456"), select any issuer, enter a vehicle registration (e.g., "AB12 CDE"), and set the issue date to today
4. View the created ticket with deadline tracking and status timeline

IN-APP PURCHASE (sandbox):
- Premium Ticket (£14.99) — one-time, non-consumable, per-ticket upgrade
- In sandbox, purchases are free
- To test: open a Free-tier ticket → tap "Upgrade to Premium" → complete sandbox purchase
- Premium features unlock immediately: success prediction, challenge tools, automatic submission

PERMISSIONS:
- Camera: used to scan/photograph parking tickets
- Photo Library: upload existing photos of tickets and evidence
- Notifications: deadline reminders and status updates
- Tracking (ATT): analytics and ad personalisation (user can decline)

NOTES:
- App is for UK parking tickets only (council PCNs, TfL, and private parking charges)
- "Success Score" is a prediction based on historical tribunal data — not a guarantee
- AI-assisted challenge letters are reviewed and approved by the user before sending
- This app does not provide legal advice
```

---

## Google Play Store Review Notes

```
TESTING INSTRUCTIONS

Test account (pre-populated with sample tickets):
Email: testreviewer@parkingticketpal.com
Password: AppReview2025!

Sign in via Settings → Sign In → enter email and password → tap "Send Link". You will be signed in instantly. Or use the app without signing in.

Quick test:
1. Open app → skip onboarding
2. Tickets tab shows 3 sample tickets (signed-in) or is empty (anonymous)
3. Anonymous users: tap "+" to add a ticket manually (any PCN, e.g. "TEST123456")
4. Tap a ticket to see deadline tracking, status timeline, and details
5. Premium Ticket IAP (£14.99, non-consumable) can be tested on a Free-tier ticket

The app helps UK motorists track parking ticket deadlines and challenge unfair tickets. It does not provide legal advice.
```

---

## App Store Connect — App Review Information Fields

| Field | Value |
|-------|-------|
| **Sign-in required** | No (app works without sign-in) |
| **Demo account username** | testreviewer@parkingticketpal.com |
| **Demo account password** | AppReview2025! |
| **Notes** | See review notes above |

---

## Google Play Console — App Access Instructions

| Field | Value |
|-------|-------|
| **All functionality available without special access** | Yes |
| **Demo account email** | testreviewer@parkingticketpal.com |
| **Demo account password** | AppReview2025! |

---

## IAP Sandbox Checklist

Before submission, verify:
- [ ] Test account exists and has sample tickets
- [ ] Test reviewer email + password instant sign-in works
- [ ] Premium ticket purchase completes in sandbox (iOS)
- [ ] Premium ticket purchase completes in sandbox (Android)
- [ ] Restore purchases works after reinstall
- [ ] Premium features visible after purchase (success score, challenge tools)
