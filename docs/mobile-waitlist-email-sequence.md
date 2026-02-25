# Mobile App Waitlist — Email Drip Sequence

## Overview

3-email automated sequence sent to everyone who joins the mobile app waitlist at `/mobile-app`. Managed via Resend segments + automations.

**Goals:**
1. Confirm signup and set expectations
2. Build trust and demonstrate value
3. Drive Day 1 downloads and App Store reviews

**Tone:** Friendly, practical, no-nonsense. Focus on the tool's utility (tracking, reminders, letters) — not AI or tech. Like a helpful friend who knows the system.

---

## Email 1: Welcome (Sent Immediately)

**Subject:** You're on the list

**Preview text:** We'll email you the moment the app is ready.

**Body:**

Hi there,

Thanks for joining the Parking Ticket Pal waitlist. We're building an app that makes dealing with parking tickets as painless as possible — and you'll be among the first to get it.

**What you'll get when it launches:**

- **Scan your ticket** with your phone camera — no typing
- **Deadline reminders** so your fine never increases because you forgot
- **Challenge letters & forms** tailored to your ticket and issuer
- **All your vehicles** tracked in one dashboard

We'll email you the day it's available on the App Store and Google Play. That's it — no spam, no weekly newsletters from this list.

**Got a ticket right now?** Don't wait for the app — the web version has everything you need:

[Use Parking Ticket Pal now →](https://parkingticketpal.com)

Cheers,
The Parking Ticket Pal team

---

## Email 2: Value & Trust (Sent Day 7)

**Subject:** Most parking ticket appeals don't need a solicitor

**Preview text:** What we've learned from thousands of real tribunal cases.

**Body:**

Hi again,

Quick update from the Parking Ticket Pal team.

One thing we hear a lot: "I'd challenge my ticket, but I don't know where to start."

Here's the thing — **you don't need a solicitor**. Most successful appeals are written by the drivers themselves. The key is knowing:

1. **Your specific contravention code** — each one has known weak points
2. **What evidence to include** — photos, timestamps, witness statements
3. **Which form to use** — PE2, PE3, TE7... it depends on what stage you're at
4. **Your deadlines** — miss one and your options shrink fast

That's exactly what Parking Ticket Pal helps with. We track your deadlines, tell you which forms you need, and help you put together a proper challenge.

**We've analysed thousands of real UK tribunal decisions** to understand what works and what doesn't. When the app launches, you'll have all of that in your pocket.

In the meantime, here are some free resources:

- [Appeal letter templates](https://parkingticketpal.com/tools/letters/parking)
- [Look up your issuer](https://parkingticketpal.com/tools/reference/issuers)
- [Contravention code guide](https://parkingticketpal.com/tools/reference/contravention-codes)

Speak soon,
The Parking Ticket Pal team

---

## Email 3: Launch Day (Sent on App Launch)

**Subject:** The app is here — download now

**Preview text:** Parking Ticket Pal is live on iPhone and Android.

**Body:**

Hi,

It's launch day. **Parking Ticket Pal is now available on the App Store and Google Play.**

You were on the waitlist, so here's your early access:

[Download for iPhone →](#) *(link to App Store listing)*
[Download for Android →](#) *(link to Google Play listing)*

**As a thank you for waiting**, you'll get £3 off your first premium ticket when you sign up through the app. Just use the same email address you're reading this on.

Here's what you can do from Day 1:

- **Scan a parking ticket** with your camera
- **Track deadlines** with push notifications
- **Build a challenge letter** tailored to your ticket
- **Pre-fill legal forms** (PE2, PE3, TE7, TE9) with your details

**One small favour?** If you find the app useful, a quick review on the App Store or Google Play makes a huge difference for us. It helps other drivers find the app when they need it most.

[Leave a review →](#) *(deep link to store review page)*

**Know someone with a parking ticket?** Share your referral code from the app — you'll both earn credit towards premium features.

Thanks for being an early supporter.

The Parking Ticket Pal team

---

## Implementation Details

Everything is built and automated — no manual Resend setup needed.

### How it works

1. User submits email on `/mobile-app` → `joinWaitlist()` server action
2. Creates `WaitlistSignup` DB record with `currentStep: 1`, `nextSendAt: now + 1 hour`
3. Also adds to Resend "Mobile App Waitlist" segment (optional, for manual management)
4. Vercel cron runs `/api/cron/waitlist-sequence` every hour → sends due emails and advances sequence

### Schedule

| Step | Email | Timing | Trigger |
|---|---|---|---|
| 1 | Welcome | 1 hour after signup | Automated (cron) |
| 2 | Value & Trust | 7 days after signup | Automated (cron) |
| 3 | Launch Day | When you're ready | Manual broadcast |

After step 2, the sequence marks itself as `SEQUENCE_COMPLETE`. Step 3 is a separate broadcast.

### Templates (React Email)

All in `apps/web/emails/waitlist/`:
- `WaitlistWelcomeEmail.tsx` — step 1
- `WaitlistValueEmail.tsx` — step 2
- `WaitlistLaunchEmail.tsx` — step 3

### Cron

- **`/api/cron/waitlist-sequence`** — runs hourly via `vercel.json`, sends steps 1 & 2
- **`/api/cron/waitlist-launch`** — manual POST for launch day broadcast

### Key files

| File | Purpose |
|---|---|
| `services/waitlist-sequence.ts` | Sequence logic (create, advance, broadcast) |
| `app/api/cron/waitlist-sequence/route.ts` | Hourly cron for steps 1 & 2 |
| `app/api/cron/waitlist-launch/route.ts` | Manual launch day broadcast |
| `app/actions/waitlist.ts` | Server action called by the `/mobile-app` page |
| `lib/email.ts` | `sendWaitlistEmail()` — renders templates and sends |
| `lib/resend.ts` | `addWaitlistContact()` — Resend segment (optional) |

### Environment variables

- `RESEND_WAITLIST_SEGMENT_ID` — optional, only needed if you want Resend segment management
- `CRON_SECRET` — already configured, used by all cron endpoints

### Mobile app launch day

When the app is published to the App Store and Google Play:

```bash
curl -X POST https://parkingticketpal.com/api/cron/waitlist-launch \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "appStoreUrl": "https://apps.apple.com/app/parking-ticket-pal/id...",
    "playStoreUrl": "https://play.google.com/store/apps/details?id=..."
  }'
```

This sends the launch email (step 3) to everyone on the waitlist and marks them as `APP_LAUNCHED`.
