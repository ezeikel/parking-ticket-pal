# Landing Page - V0 Prompt

Design a premium, Airbnb-inspired landing page for "Parking Ticket Pal" - a UK app helping drivers challenge unfair parking tickets with AI.

## Technical Stack
- React/Next.js with TypeScript
- Tailwind CSS
- FontAwesome Free icons (fa-solid, fa-regular)
- shadcn/ui component patterns
- Framer Motion for animations
- Mobile-first responsive

## Brand
- Primary: Teal (#1ABC9C)
- Accent: Yellow (#fdfa64)
- Font: Plus Jakarta Sans (Google Fonts)
- Mood: Trustworthy, empowering, friendly

## Airbnb Design System
- Generous whitespace (32-64px between sections)
- Cards: 16px radius, layered soft shadows
- Buttons: 8px radius, 16px 24px padding
- Strong typography hierarchy

---

## HERO SECTION (Full Viewport)

Create a hero with VIDEO BACKGROUND placeholder (you'll render a video later):

**Layout**:
- Full viewport height (100dvh)
- Semi-transparent dark overlay (35% opacity)
- Centered content container (max-width 800px)

**Content** (all white text):
- Main headline (56px, 800 weight):
  "Don't pay that ticket yet"
  - "Don't" has an animated red (#ef4444) strikethrough line drawn across it
  - "ticket" is wrapped in a yellow (#fdfa64) pill/badge with black text
- Subheadline (20px, 400 weight):
  "Challenge unfair parking tickets with AI in minutes"
- Benefits list (3 items with green checkmark icons):
  - "Works for both council & private PCNs"
  - "Tracks deadlines and sends reminders"
  - "Over 70% of appeals succeed at tribunal"
- Primary CTA (teal bg, white text, bolt icon):
  "Upload Your Ticket"
- Secondary text (14px):
  "Free to add a ticket. Upgrades from £2.99"

**Animation**: Content fades up with 100ms stagger between elements.

---

## TRUST INDICATORS

- Horizontal auto-scrolling carousel
- Council/authority logo placeholders (8-10)
- Grayscale logos, colorize on hover
- Label: "Trusted by drivers challenging tickets from 50+ UK councils"

---

## PROBLEM/PAIN POINTS

Section title: "Sound Familiar?" (centered, 36px, 700 weight)

3 cards in a row (stack on mobile):
1. Maze icon - "Confusing appeal process" - "Complex rules that vary by council"
2. Clock icon - "Tight deadlines" - "Miss 14 days and your fine doubles"
3. File-stack icon - "Intimidating legal jargon" - "Letters designed to make you just pay"

Card style: White bg, soft shadow, 16px radius, hover lift.
Animation: Stagger reveal on scroll (150ms delay).

---

## HOW IT WORKS

Section title: "Challenge Your Ticket in 3 Simple Steps"

3 large cards with:
- Large step number (48px) in light gray circle
- Icon (32px, teal)
- Title (20px, 700 weight)
- Description (16px, muted)

Steps:
1. Camera icon - "Upload Your Ticket" - "Snap a photo or upload your PCN document"
2. Sparkles/wand icon - "We Analyze & Draft" - "AI reviews your case and writes a legal appeal"
3. Check-circle icon - "Submit & Win" - "We handle submission and track progress"

Desktop: Cards connected by dotted line.
Animation: Sequential slide-up on scroll.

---

## PRICING PREVIEW

Section title: "Simple, Transparent Pricing"

3 cards:
- **Free**: £0 - "See Your Chances" - Upload ticket, AI analysis, success probability
- **Standard**: £2.99/ticket - "Most Popular" badge, teal border - Appeal letter, PDF download, email support
- **Premium**: £9.99/ticket - White glove service, we submit for you, priority support

Standard card elevated with border.
CTA link: "Compare all plans →"
Animation: Hover lift effect on cards.

---

## TESTIMONIALS

Section title: "Join 10,000+ UK Drivers Who've Saved Money"

3 testimonial cards:
- Large quote text (18px, italic)
- Name, location
- Green badge: "Saved £110" / "Saved £70" / "Saved £130"
- 5-star rating row

Animation: Fade-in on scroll.

---

## FINAL CTA SECTION

Full-width teal (#1ABC9C) background:
- Headline (white, 36px): "Ready to Fight Your Ticket?"
- Subtext: "Most tickets have a 14-day deadline. Don't wait."
- Large white button: "Get Started Free"

Animation: Subtle parallax on scroll.

---

## FOOTER

Dark background (#1f1f1f):
- Logo + tagline
- Nav columns: Product, Resources, Company, Legal
- Social icons row
- "Made with ♥ in South London"
- Copyright
