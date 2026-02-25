# Paid Ads Strategy — Parking Ticket Pal

## Overview

Two parallel campaigns:

1. **Web app signups** — Google Ads targeting people actively searching for help with parking tickets
2. **Mobile app waitlist** — Google + Meta Ads driving to `/mobile-app` waitlist page

---

## Campaign 1: Web App Signups (Google Ads)

### Why Google Ads First

People who just got a parking ticket are actively searching for help. This is the highest-intent, lowest-waste channel. They're not scrolling social media hoping to find you — they're typing "how to appeal a parking ticket" into Google right now.

### Account Structure

```
Account: Parking Ticket Pal
├── Campaign: PCN Appeals (Search)
│   ├── Ad Group: General Appeal
│   ├── Ad Group: Council-Specific
│   ├── Ad Group: Private Parking
│   └── Ad Group: Cost/Comparison
├── Campaign: Mobile App Waitlist (Search)
│   └── Ad Group: App Keywords
└── Campaign: Mobile App Waitlist (Meta)
    ├── Ad Set: Drivers (Interest)
    └── Ad Set: Retargeting (Site Visitors)
```

### Ad Groups & Keywords

#### Ad Group: General Appeal (Highest Intent)

These people just got a ticket and want to fight it.

**Keywords (phrase/exact match):**
- "appeal parking ticket"
- "challenge parking ticket"
- "fight parking fine"
- "dispute parking ticket"
- "how to appeal a PCN"
- "parking ticket appeal letter"
- "PCN appeal"
- "contest parking fine"
- "unfair parking ticket"

**Negative keywords:**
- "pay parking ticket"
- "parking ticket payment"
- "jobs"
- "warden"

#### Ad Group: Council-Specific

Target people searching for specific issuers — these are very high intent and often cheaper due to lower competition.

**Keywords (phrase/exact match):**
- "appeal [council] parking ticket" (create variants for top councils)
- "challenge TfL PCN"
- "appeal Westminster parking ticket"
- "Lewisham parking fine appeal"
- "Camden parking ticket challenge"
- "Lambeth PCN appeal"
- "[borough] parking ticket help"

**Note:** Create variants for the top 20 London boroughs by ticket volume. These will have low CPC because solicitor firms don't bid on this long-tail.

#### Ad Group: Private Parking

Private parking companies generate a lot of anger. These searchers are motivated.

**Keywords (phrase/exact match):**
- "appeal private parking ticket"
- "challenge Euro Car Parks"
- "dispute Horizon Parking ticket"
- "appeal MET Parking ticket"
- "private parking fine unfair"
- "ignore private parking ticket" (capture and redirect to proper appeal)

#### Ad Group: Cost/Comparison

People comparing options — cost-sensitive, looking for alternatives to solicitors.

**Keywords (phrase/exact match):**
- "parking ticket solicitor cost"
- "how much to appeal parking ticket"
- "free parking ticket appeal"
- "cheap parking appeal service"
- "parking ticket help UK"
- "DIY parking appeal"

### Ad Copy

**Important tone notes:**
- Lead with practical value (tracking, deadlines, letters) not AI
- Emphasise the free tier and ease of use
- Use the success rate stat sparingly — it's a trust signal, not the main pitch
- Focus on solving the problem quickly

#### General Appeal Ads

```
Headline 1: Got a Parking Ticket? Fight Back
Headline 2: Track, Challenge & Appeal Your PCN
Headline 3: Free to Start — No Solicitor Needed
Description 1: Upload your ticket, track deadlines, and get help building
your appeal letter. Covers council PCNs and private parking fines across the UK.
Description 2: Don't just pay it. Track your ticket, get deadline reminders,
and challenge with confidence. Used by thousands of UK drivers.
```

#### Council-Specific Ads

```
Headline 1: Appeal Your {Council} Parking Ticket
Headline 2: Track Deadlines & Build Your Challenge
Headline 3: Free Ticket Tracking — Start Now
Description: Got a PCN from {Council}? Upload your ticket, track every deadline,
and get help writing your appeal. We even submit directly for supported councils.
```

#### Private Parking Ads

```
Headline 1: Got a Private Parking Fine?
Headline 2: Don't Just Pay — Challenge It
Headline 3: Track & Appeal Private Parking Tickets
Description: Private parking fines are often challengeable. Upload your ticket,
understand your rights, and build a proper appeal. Free to start.
```

#### Cost/Comparison Ads

```
Headline 1: Appeal Your Ticket — No Solicitor Fees
Headline 2: Free Parking Ticket Tracking & Reminders
Headline 3: Build Your Appeal Letter in Minutes
Description: Why pay £50-100+ for a solicitor? Track your ticket for free,
get deadline reminders, and build your challenge letter yourself.
```

### Landing Pages

**Do NOT send all ad traffic to the homepage.** Use your existing SEO pages as landing pages — they're already optimised for specific search intent:

| Ad Group | Landing Page | Why |
|---|---|---|
| General Appeal | Homepage (`/`) or `/tools/letters/parking` | Broad intent, show the full product |
| Council-Specific | `/tools/reference/issuers/[council]` | Directly relevant, shows you know their issuer |
| Private Parking | `/tools/reference/issuers/[company]` | Same — issuer-specific landing |
| Cost/Comparison | `/compare` or `/pricing` | Price-sensitive, show value vs alternatives |

**Conversion action:** Track signup as the primary conversion. Track ticket creation as a secondary conversion (higher value signal for Google's bidding algorithm).

### Budget & Bidding

| Phase | Daily Budget | Duration | Goal |
|---|---|---|---|
| Testing | £20-30/day | 2 weeks | Find winning keywords and ads |
| Optimising | £30-50/day | 2 weeks | Scale winners, pause losers |
| Scaling | £50-100/day | Ongoing | Maintain profitable CPA |

**Bidding strategy:**
- Start with **Manual CPC** or **Maximise Clicks** to gather data
- After 30+ conversions, switch to **Target CPA** bidding
- Expected CPC: £1-3 for general terms, £0.50-1.50 for long-tail council-specific

**Target CPA guidance:**
- Free signups: Target £3-5 CPA (generous — you want volume)
- Paid conversions: Track as secondary, optimise once you have enough data
- If CPA exceeds £8-10 for free signups, pause and review

### Tracking Setup

1. **Google Ads conversion tracking** — fire on signup completion
2. **Secondary conversion** — fire on first ticket created
3. **UTM parameters** on all ad URLs:
   - `utm_source=google`
   - `utm_medium=cpc`
   - `utm_campaign={campaign_name}`
   - `utm_content={ad_group}`
   - `utm_term={keyword}`
4. **PostHog** will capture UTMs automatically on signup — use these to measure downstream conversion (signup → ticket → challenge → payment)

### Google Ads Extensions

Add these to every campaign:

- **Sitelinks:** "Free Letter Templates", "Track Your Ticket", "Check Your Issuer", "Pricing"
- **Callouts:** "Free to Start", "40+ Issuers Supported", "Deadline Reminders", "No Solicitor Needed"
- **Structured snippets:** Types: "Council PCNs, Private Parking, TfL, Bus Lane Fines"

---

## Campaign 2: Mobile App Waitlist

### Google Ads (Search)

**Ad Group: App Keywords**

**Keywords (phrase/exact match):**
- "parking ticket app"
- "PCN app"
- "appeal parking ticket iPhone"
- "parking fine app UK"
- "parking ticket tracker app"

**Ad copy:**
```
Headline 1: Parking Ticket Pal — The App
Headline 2: Scan, Track & Challenge From Your Phone
Headline 3: Launching Soon — Join the Waitlist
Description: Scan your ticket with your camera. Track deadlines with push
notifications. Build your challenge letter on the go. Join the waitlist
for early access.
```

**Landing page:** `/mobile-app`

**Budget:** £10-15/day (smaller — waitlist is a lower-urgency conversion)

### Meta Ads (Facebook & Instagram)

Meta is better suited for waitlist signups because:
- You can show visual ads (phone mockup, app screenshots)
- Broader targeting works for awareness
- Retargeting site visitors who didn't sign up

#### Ad Set 1: Interest-Based Targeting

**Audience:**
- Location: United Kingdom
- Age: 25-55
- Interests: Driving, Cars, Motoring, Road tax, MOT, Car insurance
- Exclude: People who've already visited `/mobile-app` and submitted the form

**Ad creative ideas (produce these offline):**
- Short video (15s): Show someone getting a ticket → opening the app → scanning → tracking → resolving
- Carousel: Each card = one feature (Scan, Track, Challenge, Reminders)
- Static image: Phone mockup with "Got a parking ticket? There's an app for that."

**Ad copy:**
```
Parking Ticket Pal is coming to iPhone and Android.

Scan your ticket, track every deadline, and build your challenge
— all from your phone.

Join the waitlist for early access.
```

#### Ad Set 2: Retargeting

**Audience:**
- People who visited parkingticketpal.com in the last 30 days
- Exclude: People who already joined the waitlist

**Ad copy:**
```
You visited Parking Ticket Pal — now it's coming to your phone.

Get push notification reminders before deadlines, scan tickets
with your camera, and manage everything on the go.

Be the first to download. Join the waitlist.
```

**Budget:** £10-15/day total across both ad sets

---

## Campaign Management Checklist

### Week 1: Setup
- [ ] Create Google Ads account (if not existing)
- [ ] Set up conversion tracking (signup + ticket creation events)
- [ ] Build ad groups with keywords listed above
- [ ] Write ad variations (3 per ad group minimum for testing)
- [ ] Add sitelink, callout, and structured snippet extensions
- [ ] Set up Meta Pixel on parkingticketpal.com (if not already)
- [ ] Create Meta ad account and campaign
- [ ] Produce ad creatives (video, carousel, static)

### Week 2: Launch & Monitor
- [ ] Launch Google Ads "General Appeal" and "Council-Specific" campaigns first
- [ ] Launch Meta retargeting campaign
- [ ] Monitor daily: CPC, CTR, conversion rate, CPA
- [ ] Pause keywords with high CPC and no conversions after 50+ clicks
- [ ] Check search terms report — add irrelevant terms as negatives

### Week 3-4: Optimise
- [ ] Pause underperforming ad copy (low CTR)
- [ ] Scale budget on winning keywords
- [ ] Launch "Private Parking" and "Cost/Comparison" ad groups
- [ ] Launch Meta interest-based campaign for mobile waitlist
- [ ] Review PostHog funnel: ad click → signup → ticket → challenge → payment
- [ ] If CPA is good, increase daily budget by 20-30%

### Ongoing
- [ ] Weekly: Review search terms, add negatives, adjust bids
- [ ] Monthly: Review full funnel metrics in PostHog
- [ ] Test new ad copy monthly (don't let ads go stale)
- [ ] Expand council-specific keywords as you add issuer support
- [ ] When mobile app launches, redirect waitlist budget to app install campaigns
