# Pricing Page - V0 Prompt

Design an Airbnb-inspired pricing page for "Parking Ticket Pal."

## Technical Stack
- React/Next.js, Tailwind CSS, FontAwesome Free, shadcn/ui, Framer Motion

## Brand
- Primary: #1ABC9C, Accent: #fdfa64
- Font: Plus Jakarta Sans

---

## PAGE HEADER

- Title: "Simple, Transparent Pricing" (48px, 800 weight, centered)
- Subtitle: "No hidden fees. Pay only for what you use." (18px, muted, centered)

---

## PRICING TABS

3 centered tabs (pill style):
- "Pay Per Ticket" (default)
- "Subscriptions"
- "Business & Fleet"

Active tab: Teal background, white text.
Tab content transitions: Crossfade (300ms).

---

## PAY PER TICKET TAB

2 cards centered (max-width 900px):

**Standard Card**:
- Price: "£2.99" (48px) + "/ticket" (18px, muted)
- Tagline: "Perfect for occasional tickets"
- Features with checkmarks:
  - AI-powered appeal letter
  - Legal ground analysis
  - Download as PDF
  - Email support
- CTA: "Get Started" (outlined button)

**Premium Card** (highlighted):
- "Most Popular" badge (teal pill, top)
- Teal border (2px)
- Slightly elevated (shadow)
- Price: "£9.99" + "/ticket"
- Tagline: "Let us handle everything"
- Features:
  - Everything in Standard
  - We submit for you
  - Priority support
  - Escalation assistance
  - Money-back guarantee
- CTA: "Get Started" (primary filled button)

Animation: Cards hover lift.

---

## SUBSCRIPTIONS TAB

**Billing Toggle**:
- "Monthly" / "Yearly" toggle
- "Save 20%" badge on yearly
- Toggle styled as pill selector

2 subscription cards:

**Standard Subscription**:
- £4.99/month or £47.99/year
- "Best for regular drivers"
- 3 tickets/month included
- All Standard features

**Premium Subscription**:
- £12.99/month or £124.99/year
- "Unlimited tickets"
- All Premium features
- Priority everything

Animation: Price numbers morph on toggle change.

---

## BUSINESS TAB

Billing toggle (same style).

3 cards:

**Starter**: 5 vehicles, £29/month
**Professional**: 25 vehicles, £79/month, "Popular" badge
**Enterprise**: Unlimited, "Contact Us"

Each with relevant feature lists.
Enterprise card: "Contact Sales" button instead of price.

---

## FEATURE COMPARISON TABLE

Section: "Compare All Features"
Anchor link from above: "Compare all plans →"

Clean table:
- Left column: Feature names
- Columns: Free, Standard, Premium
- Green checkmarks (fa-check), muted X marks (fa-xmark)
- Alternating row backgrounds
- Responsive: Horizontal scroll on mobile

---

## FAQ SECTION

Title: "Frequently Asked Questions" (32px)

Accordion items (6-8):
- Question text (18px, 600 weight)
- Expand/collapse chevron
- Answer text (16px, muted)

Clean expand animation (height + fade).

---

## FINAL CTA

Full-width teal section:
- "Still have questions?"
- "Our team is here to help"
- Outlined white button: "Contact Us"

---

## ANIMATIONS

- Page load: Header + tabs fade in
- Tab switch: Content crossfade (300ms)
- Billing toggle: Price morphs smoothly
- Cards: Hover lift
- FAQ: Smooth accordion animation
