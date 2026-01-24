# V0 Redesign Plan: Airbnb-Inspired UI/UX Overhaul

## Executive Summary

Complete redesign of Parking Ticket Pal with Airbnb-inspired aesthetics, incorporating maps, animations, and best-in-class UX patterns across all pages.

---

## Current Implementation Progress

### Add Document Feature (Unified Upload for Tickets & Letters)

**Status**: Complete ✅

| Task | Status | Notes |
|------|--------|-------|
| Update UploadSection copy for tickets and letters | ✅ Done | Now says "Add Your Document" and supports both |
| Add getTicketByPcnNumber server action | ✅ Done | In `apps/web/app/actions/ticket.ts:703-733` |
| Create DuplicateTicketState component | ✅ Done | Shows when user uploads a ticket that already exists |
| Create AddingToTicketState component | ✅ Done | Shows when user uploads a letter and we find matching ticket |
| Update AddDocumentPage with document type routing | ✅ Done | Detects document type, checks for duplicates, shows appropriate states |
| Update AddDocumentWizard for letter support | ✅ Done | Renamed 'Windscreen Ticket' to 'Initial Ticket' |
| Update SuccessState for different outcomes | ✅ Done | Different messages for ticket/letter |
| Update Header nav label to Add Document | ✅ Done | Desktop and mobile nav updated |
| Update OCR to return documentType | ✅ Done | Both OpenAI and Vision functions updated |

### Component Files Created/Updated
- `apps/web/components/add-document/DuplicateTicketState.tsx` - NEW ✅
- `apps/web/components/add-document/AddingToTicketState.tsx` - NEW ✅
- `apps/web/components/add-document/UploadSection.tsx` - UPDATED ✅
- `apps/web/components/add-document/AddDocumentPage.tsx` - UPDATED ✅
- `apps/web/components/add-document/AddDocumentWizard.tsx` - UPDATED ✅
- `apps/web/components/add-document/SuccessState.tsx` - UPDATED ✅
- `apps/web/components/Header/Header.tsx` - UPDATED ✅
- `apps/web/components/Hero/Hero.tsx` - UPDATED ✅
- `apps/web/components/TicketWizard/TicketWizard.tsx` - UPDATED ✅
- `apps/web/app/actions/ocr.ts` - UPDATED ✅
- `apps/web/app/actions/guest.ts` - UPDATED ✅
- `apps/web/app/actions/stripe.ts` - UPDATED ✅
- `apps/web/utils/guestTicket.ts` - UPDATED ✅

### Logic Flow
1. User uploads document (ticket or letter)
2. OCR extracts data including `documentType` field
3. If PCN found, check for existing ticket with `getTicketByPcnNumber`
4. If existing ticket found:
   - If document is a **letter**: Show `AddingToTicketState` to link letter to ticket
   - If document is a **ticket**: Show `DuplicateTicketState` warning
5. If no existing ticket: Proceed to wizard for normal flow
6. Success state shows appropriate messaging based on document type

### Stage Names Update
Changed 'Windscreen Ticket' to 'Initial Ticket' across all components for clarity:
- **Initial Ticket**: "Just received - on windscreen or in the post"
- Notice to Owner (NtO)
- Rejection / Tribunal
- Charge Certificate / Bailiffs

---

### Account Settings Redesign

**Status**: Complete ✅

Implemented full v0 design with tabbed navigation and Airbnb-inspired aesthetics.

| Tab | Status | Features |
|-----|--------|----------|
| Profile | ✅ Done | Profile picture card, personal info form, address with autocomplete, signature capture |
| Notifications | ✅ Done | Master email toggle, individual notification preferences (deadlines, status, marketing) |
| Billing | ✅ Done | Current plan display, upgrade options with pricing toggle, payment method card, billing history table |
| Security | ✅ Done | Connected accounts (Google/Apple) with connect/disconnect, active sessions list |
| Delete Account | ✅ Done | Warning card, confirmation dialog with type-to-confirm |

### Component Files Created
- `apps/web/components/account/AccountSettingsPage.tsx` - Main page with tab navigation
- `apps/web/components/account/ProfileTab.tsx` - Profile & address forms
- `apps/web/components/account/NotificationsTab.tsx` - Email notification toggles
- `apps/web/components/account/BillingTab.tsx` - Subscription & payment management
- `apps/web/components/account/SecurityTab.tsx` - OAuth connections & sessions
- `apps/web/components/account/DeleteAccountTab.tsx` - Account deletion with safeguards
- `apps/web/components/account/index.ts` - Exports

### Updated Files
- `apps/web/app/account/page.tsx` - Now uses new AccountSettingsPage component
- `apps/web/components/UserDropdown/UserDropdown.tsx` - Airbnb-style pill button with hamburger + avatar

### UI Features
- **Desktop**: Vertical sidebar tabs on left (20%), content on right (80%)
- **Mobile**: Horizontal scrolling pill tabs at top
- **Animations**: Tab content crossfade with Framer Motion
- **Styling**: Consistent with Airbnb aesthetic - rounded cards, soft shadows, teal accents

---

## Gap Analysis (Post-Review)

### Complete Page Inventory: 25 Pages Analyzed

#### Pages COVERED by Existing Prompts (10 of 25)

| Page | Route | Prompt File | Status |
|------|-------|-------------|--------|
| Landing | `/` | `01-landing-page.md` | ✅ |
| Dashboard | `/dashboard` | `02-dashboard.md` | ✅ |
| Tickets List | `/tickets` | `03-tickets-list.md` | ✅ |
| Ticket Detail | `/tickets/[id]` | `04-ticket-detail.md` | ✅ |
| Vehicles | `/vehicles` | `05-vehicles.md` | ✅ |
| Pricing | `/pricing` | `06-pricing.md` | ✅ |
| Blog Index | `/blog` | `07-blog-index.md` | ✅ |
| Blog Post | `/blog/[slug]` | `08-blog-post.md` | ✅ |
| Sign In | `/signin` | `09-sign-in.md` | ✅ |
| Account Settings | `/account` | `10-account-settings.md` | ✅ |

#### Pages MISSING Prompts - HIGH PRIORITY (4)

| Page | Route | Why Critical | Action |
|------|-------|--------------|--------|
| **Upload Flow** | `/new` | Primary conversion point - users add tickets here | Create `11-upload-flow.md` |
| **Letter Detail** | `/letters/[id]` | Part of ticket journey, shows escalation documents | Create `12-letter-detail.md` |
| **Edit Ticket** | `/tickets/[id]/edit` | Modal for editing, should match detail page style | Add to `04-ticket-detail.md` |
| **Billing Page** | `/account/billing` | Subscription management with plan selection | Covered in `10-account-settings.md` billing tab |

#### Pages that Can Be SKIPPED (11)

| Page | Route | Reason |
|------|-------|--------|
| Checkout | `/checkout` | Stripe redirect, no UI |
| Subscribe | `/subscribe` | Stripe redirect, no UI |
| Billing Success | `/account/billing/success` | Simple success message |
| Verify Request | `/auth/verify-request` | Magic link confirmation |
| Magic Link Verify | `/auth/magic-link/verify` | Processing redirect |
| Mobile Redirect | `/auth/mobile/magic-link-redirect` | Mobile-only |
| Edit Modal | `/tickets/@modal/(.)[id]/edit` | Same as edit page |
| Test Social | `/test-social` | Dev only |
| Privacy | `/privacy` | Legal content page |
| Terms | `/terms` | Legal content page |
| Delete Account | `/delete-account` | Simple instructions |

### Critical Gap: Upload Flow (`/new`)

This is the **#1 gap** because it's the primary conversion funnel. Current state:
- Basic card with tabs (Ticket/Letter)
- Simple form inside
- No visual delight or trust signals

Airbnb-style improvements needed:
- Multi-step wizard with progress indicator
- Drag-and-drop upload zone with camera icon
- Real-time OCR preview showing extracted fields
- Trust badges during upload
- Success celebration animation

### Recommended Actions

**Before v0 generation:**
1. Create `11-upload-flow.md` - Critical for user acquisition
2. Create `12-letter-detail.md` - Completes ticket journey

**Final prompt count:** 12 (10 existing + 2 new)

---

## Key Design Decisions

### 1. Video Hero - KEEP (enhanced)

**Decision**: Keep the video hero with London parking scenes.

**Rationale**: Airbnb uses video strategically on Experiences and destination pages. Your contextual London videos communicate "UK parking" instantly.

**Enhancements**:
- Reduce overlay opacity to 35-40% (let video breathe)
- Smoother 2s crossfade between clips
- Optional: Subtle Ken Burns zoom (1.02x) on static frames
- Ensure fast load with proper compression

---

### 2. Text Animations - KEEP (refined)

**Decision**: Keep the "Don't" strikethrough animation.

**Rationale**: It's purposeful, quick, and communicates your core proposition. Airbnb uses similar purposeful micro-animations.

**Refinements**:
- 500ms delay after page load
- 350ms duration with ease-out curve
- Consider a subtle "whoosh" sound effect (optional, user preference)

---

### 3. Framer Motion Strategy

| Page | Animation | Timing |
|------|-----------|--------|
| **All Pages** | Page transitions (fade + 20px Y slide) | 300ms |
| **Landing** | Hero text stagger fade-up | 100ms delay each |
| **Landing** | Stats counters animate up | 600ms |
| **Landing** | Section reveals on scroll | 400ms, ease-out |
| **Pricing** | Tab content crossfade | 300ms |
| **Pricing** | Billing toggle number morph | 400ms |
| **Dashboard** | Stats cards stagger | 50ms delay each |
| **Tickets** | List/grid stagger reveal | 30ms delay each |
| **Maps** | Markers drop-in animation | 200ms, bounce |
| **Cards** | Hover: lift + shadow | 200ms |
| **Buttons** | Hover: scale 1.02 | 150ms |

---

### 4. Font Pairing - Plus Jakarta Sans

**Single font family for cohesion** (like Airbnb's Cereal):
- Display: 800 weight, 48-72px
- H1: 700 weight, 36-48px
- H2: 700 weight, 24-32px
- Body: 400-500 weight, 16-18px
- UI/Small: 400 weight, 14px

---

### 5. Maps - Airbnb-Style Integration

**Key patterns from Airbnb**:
- Split-view layouts (list + map side-by-side)
- Clean, desaturated map style
- Custom branded markers
- Hover interactions between list and map
- Smooth zoom/pan transitions
- Clustered markers for density

**Custom Mapbox Style**: Consider `mapbox://styles/mapbox/light-v11` for cleaner aesthetic than `streets-v12`.

---

### 6. Icons - FontAwesome Free

All prompts use FontAwesome Free (fa-solid, fa-regular). Swap for Pro after v0 generation.

---

## V0 Prompts

---

### PROMPT 1: Landing Page

```
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
```

---

### PROMPT 2: Dashboard

```
Design an Airbnb-inspired dashboard for "Parking Ticket Pal" - a personal command center for managing parking tickets.

## Technical Stack
- React/Next.js, Tailwind CSS, FontAwesome Free, shadcn/ui, Framer Motion

## Brand
- Primary: #1ABC9C, Accent: #fdfa64
- Font: Plus Jakarta Sans

## Design System
- Cards: 16px radius, soft shadow, white bg
- Generous spacing (24-32px)
- Clean typography hierarchy

---

## PAGE HEADER
- Title: "Dashboard" (32px, 700 weight)
- Greeting: "Welcome back, [Name]" (18px, muted) - optional

---

## STATS ROW (4 cards)

Grid: 4 columns desktop, 2x2 tablet, stack mobile

Each card:
- Icon (24px, teal, in light circle bg)
- Metric value (32px, 700 weight)
- Label (14px, muted)
- Optional trend: up/down arrow with percentage

Cards:
1. Ticket icon - "12" - "Total Tickets"
2. Gavel icon - "3" - "Active Challenges" (with mini progress indicator)
3. Pound icon - "£450" - "Money Saved" (green tint, prominent)
4. Chart-pie icon - "78%" - "Success Rate"

Animation: Stagger fade-in (50ms each), number counters animate up.

---

## MAP + LIST SPLIT VIEW

**Airbnb-style split layout** (desktop only):
- Left side (55%): List of recent tickets
- Right side (45%): Mapbox map with ticket markers

**List Panel**:
- Title: "Your Tickets" with "View All" link
- 5 ticket rows:
  - PCN reference (bold)
  - Issuer name
  - Status badge (colored pill)
  - Amount
  - Days remaining
  - Chevron right
- Row hover: Highlight and corresponding map marker pulses

**Map Panel**:
- Mapbox map centered on user's tickets
- Custom teal markers with car icon
- Click marker: Popup with ticket summary + "View Details" link
- Navigation controls top-right
- Map style: light-v11 for cleaner look

**Mobile**: Map hidden by default, toggle button to show full-screen map.

Animation: Markers drop-in with bounce (200ms).

---

## QUICK ACTIONS

Title: "Quick Actions" (24px, 600 weight)

4 action cards:
1. "Upload New Ticket" - Plus icon - PRIMARY (teal bg, white text)
2. "View All Tickets" - Ticket icon - outlined
3. "Manage Vehicles" - Car icon - outlined
4. "Account Settings" - Cog icon - outlined

Grid: 4 columns desktop, 2x2 mobile.
Style: 80px min height, icon + text centered.
Animation: Hover lift + shadow.

---

## UPCOMING DEADLINES (Alert Card)

If tickets with deadlines <7 days:
- Amber/warning background
- Alert-triangle icon
- "3 tickets have deadlines this week"
- "View Urgent" button

---

## EMPTY STATE

If no tickets:
- Centered illustration placeholder
- "Welcome to Parking Ticket Pal!"
- "Upload your first ticket to get started"
- Large primary CTA: "Upload Your First Ticket"
```

---

### PROMPT 3: Tickets List Page

```
Design an Airbnb-inspired tickets page with list/map split view for "Parking Ticket Pal."

## Technical Stack
- React/Next.js, Tailwind CSS, FontAwesome Free, shadcn/ui, Framer Motion, Mapbox GL

## Brand
- Primary: #1ABC9C, Accent: #fdfa64
- Font: Plus Jakarta Sans

---

## PAGE LAYOUT (Desktop)

**Airbnb-style split view**:
- Left panel (50%): Scrollable ticket list
- Right panel (50%): Sticky/fixed Mapbox map

**Mobile**: Full list view, floating map toggle button (bottom right).

---

## LEFT PANEL - TICKET LIST

**Header**:
- Title: "Your Tickets" (32px, 700 weight)
- Upload button (primary): "Upload Ticket" with plus icon

**Filter Bar**:
- Status dropdown: All, Pending, In Progress, Won, Lost, Paid
- Sort dropdown: Newest, Due Date, Amount
- Search input: "Search reference or vehicle..."
- View toggle: Grid/List icons (optional)

**Ticket Cards** (stacked list):
Each card shows:
- Status badge (top left, colored pill)
- PCN reference (18px, 700 weight)
- Issuer name with icon placeholder
- Vehicle registration (muted)
- Amount (24px, bold)
- Due date with clock icon
- Days remaining badge (red if <7 days)
- Thin colored progress bar at bottom (stage indicator)

**Card Interactions**:
- Hover: Lift effect, shadow increase, corresponding map marker highlights
- Click: Navigate to ticket detail

**List Footer**:
- "Load More" button or infinite scroll
- "Showing X of Y tickets"

---

## RIGHT PANEL - MAP

**Mapbox Integration**:
- Style: `mapbox://styles/mapbox/light-v11` (cleaner)
- Centered on user's ticket locations
- Zoom to fit all markers

**Custom Markers**:
- Teal (#1ABC9C) circle (32px)
- White car-side icon centered
- Drop shadow
- Hover: Scale up 1.2x
- Active (selected): Pulse animation

**Marker Interaction**:
- Click marker: Open popup
- Popup content:
  - PCN reference (bold)
  - Issuer name
  - Status badge
  - Amount
  - "View Details →" link button
- Popup style: White, rounded, soft shadow

**List-Map Sync**:
- Hover ticket in list → marker highlights and map pans to it
- Click marker → corresponding list item highlights and scrolls into view

**Controls**:
- Navigation (zoom +/-) top right
- "Recenter" button if user pans away

---

## MOBILE VIEW

- Full-width ticket cards (list only)
- Floating "Map" FAB button (bottom right)
- Tap FAB: Full-screen map overlay with close button
- Sticky filter bar at top

---

## EMPTY STATE

- Centered
- Map icon or ticket illustration
- "No tickets yet"
- "Upload your first parking ticket to see it here"
- Primary CTA: "Upload Ticket"

---

## ANIMATIONS

- Initial load: Cards stagger fade-up (30ms delay each)
- Map markers: Drop-in animation (200ms, ease-out bounce)
- Filter change: List crossfade
- Hover: Card scale 1.01, shadow increase (150ms)
- Map marker hover: Scale 1.2 (100ms)
```

---

### PROMPT 4: Ticket Detail Page

```
Design an Airbnb-inspired ticket detail page for "Parking Ticket Pal."

## Technical Stack
- React/Next.js, Tailwind CSS, FontAwesome Free, shadcn/ui, Framer Motion, Mapbox GL

## Brand
- Primary: #1ABC9C, Accent: #fdfa64
- Font: Plus Jakarta Sans

---

## PAGE LAYOUT

**Desktop**: Two columns (60/40 split)
- Left: Ticket info, evidence, letter
- Right: Map + actions + timeline

**Mobile**: Single column, cards stack.

---

## HEADER

- Back button (ghost): "← Back to Tickets"
- Status badge (large, prominent)
- PCN Reference (28px, 700 weight)
- Issuer name

---

## LEFT COLUMN

### Ticket Details Card
Title: "Ticket Details"
Edit button (top right, ghost)

Details grid (2 columns):
- PCN Reference
- Issue Date
- Contravention Code + description
- Location address
- Vehicle Registration
- Issuer/Authority
- Original Amount
- Current Amount (if escalated, shown in red)
- Payment deadline

### Location Card
- Title: "Ticket Location"
- Mapbox map (250px height)
- Map style: light-v11
- Single teal marker at ticket location
- Non-interactive (static) or minimal interaction
- Address text below map

### Evidence Card
Title: "Evidence & Documents"

Grid of uploaded images:
- Thumbnails (120px, 16px radius)
- Click to lightbox/expand
- Hover: Subtle zoom

Actions:
- "Add Evidence" button with upload icon
- Dropzone for drag-and-drop

### Appeal Letter Card (if generated)
Title: "Your Appeal Letter"

- Preview snippet (first 3-4 lines, faded at bottom)
- Generation date and time
- Actions:
  - "View Full Letter" button (outlined)
  - "Download PDF" button (outlined)
  - "Regenerate" link (if applicable)

---

## RIGHT COLUMN

### Actions Card
Prominent action buttons based on ticket status:

If letter not generated:
- "Generate Appeal Letter" (primary, large, sparkles icon)

If letter ready:
- "Submit Challenge" (primary, large, send icon)
- "Preview Letter" (outlined)

If submitted:
- "Track Status" (primary)
- "View Submission Confirmation" (outlined)

Always available:
- "Edit Ticket" (ghost)
- "Mark as Paid" (ghost)
- "Delete" (destructive ghost, bottom)

### Deadline Alert (if <14 days)
Alert banner:
- Warning/amber background
- "7 days remaining to respond"
- Description of what happens if missed
- Action button if applicable

### Timeline Card
Title: "Activity Timeline"

Vertical timeline:
- Connecting line (2px, light gray)
- Colored dots:
  - Green: Positive events
  - Blue: Neutral/info
  - Amber: Warning
  - Red: Negative
- Each event:
  - Date/time (12px, muted)
  - Event title (16px, 500 weight)
  - Optional description (14px, muted)

Events (example):
1. "Ticket uploaded" - Date - "PCN scanned and details extracted"
2. "Appeal letter generated" - Date
3. "Challenge submitted" - Date - "Reference: ABC123"
4. "Awaiting response" - Current

Most recent at top.
Animation: Stagger reveal, line draws in.

---

## MOBILE LAYOUT

- Single column
- Sticky header with reference + status
- Map inline (shorter, 180px)
- Actions as sticky bottom bar
- Timeline collapsed by default (expand tap)
```

---

### PROMPT 5: Vehicles Page

```
Design an Airbnb-inspired vehicles page for "Parking Ticket Pal."

## Technical Stack
- React/Next.js, Tailwind CSS, FontAwesome Free, shadcn/ui, Framer Motion

## Brand
- Primary: #1ABC9C, Accent: #fdfa64
- Font: Plus Jakarta Sans

---

## PAGE HEADER

- Title: "Your Vehicles" (32px, 700 weight)
- Add button (primary): "Add Vehicle" with plus icon

---

## VEHICLE CARDS GRID

3 columns desktop, 2 tablet, 1 mobile

Each card:
- **UK Registration Plate** (prominent, top of card):
  - Yellow background (#fdfa64)
  - Black text, bold monospace-style font
  - 8px radius
  - Format: AB12 CDE
- Vehicle info below:
  - Make & Model (18px, 600 weight) - if available, else "Vehicle"
  - Year (muted) - if available
- **Stats row**:
  - "3 active tickets" - ticket icon
  - Badge if urgent: Red dot + "1 urgent"
- **Actions** (three-dot menu or inline buttons):
  - View Tickets
  - Edit
  - Delete

Card styling:
- White bg, soft shadow, 16px radius
- Hover: Lift + shadow increase
- If urgent tickets: Subtle red left border

---

## ADD VEHICLE DIALOG

Clean modal/dialog:
- Title: "Add a Vehicle"
- Form fields:
  - Registration (required): Input with UK plate formatting
  - Make (optional): Text input
  - Model (optional): Text input
  - Year (optional): Number/select
- Actions:
  - "Add Vehicle" primary button
  - "Cancel" ghost button

Input styling: 48px height, 8px radius, clear focus states.

---

## EMPTY STATE

- Centered content
- Car icon (48px, muted teal)
- "No vehicles yet"
- "Add your first vehicle to start tracking tickets"
- Primary CTA: "Add Your First Vehicle"

---

## MOBILE

- Single column card stack
- Floating "+" FAB button (bottom right, teal)
- Cards touch-friendly, larger tap targets

---

## ANIMATIONS

- Cards: Stagger fade-up on load
- Hover: Scale 1.02, shadow increase
- Dialog: Scale + fade in (200ms)
- Delete: Card slides out + fades
```

---

### PROMPT 6: Pricing Page

```
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
```

---

### PROMPT 7: Blog Index

```
Design an Airbnb-inspired blog listing page for "Parking Ticket Pal."

## Technical Stack
- React/Next.js, Tailwind CSS, FontAwesome Free, shadcn/ui, Framer Motion

## Brand
- Primary: #1ABC9C
- Font: Plus Jakarta Sans

---

## PAGE HEADER

- Title: "The Parking Ticket Pal Blog" (48px, 800 weight, centered)
- Subtitle: "Expert guides to parking fines, your rights, and winning appeals" (18px, muted)

---

## FILTER TAGS

Horizontal scrolling row of pill tags:
- All (default active)
- PCN Guides
- Legal Rights
- Appeal Tips
- Success Stories
- Council Specific

Active: Teal bg, white text.
Inactive: Light gray bg, dark text.
Click: Filter posts, smooth crossfade.

---

## FEATURED POST (optional)

Large hero card for latest/featured:
- Full-width image (16:9)
- Gradient overlay (bottom)
- Category pill (top left)
- Title (white, 32px, 700 weight)
- Excerpt (white/90, 16px)
- Read time badge

---

## POST GRID

3 columns desktop, 2 tablet, 1 mobile.

Each card:
- Image (top, 16:9, fills card width)
- Category pill (above title, small)
- Title (20px, 700 weight, max 2 lines)
- Excerpt (14px, muted, 2-3 lines)
- Footer row:
  - Author avatar (32px) + name
  - Separator dot
  - Date
  - Separator dot
  - Read time

Card style: White bg, soft shadow, 16px radius.
Image hover: Subtle zoom (1.05).
Card hover: Lift effect.

---

## PAGINATION

"Load More Articles" button (outlined, centered).
Or infinite scroll with skeleton loaders.

---

## NEWSLETTER CTA

Section with light gray background:
- "Stay Updated" (24px)
- "Get parking tips and appeal strategies weekly"
- Email input + "Subscribe" button (inline)
- Small text: "No spam. Unsubscribe anytime."

---

## EMPTY STATE

If no posts:
- Book/article icon
- "Coming soon!"
- "We're writing helpful guides. Check back soon."

---

## ANIMATIONS

- Cards: Stagger fade-up (50ms delay)
- Card hover: Image scale 1.05, card lift
- Filter: Smooth crossfade
- Load more: New cards fade in
```

---

### PROMPT 8: Blog Post

```
Design an Airbnb-inspired blog post page for "Parking Ticket Pal."

## Technical Stack
- React/Next.js, Tailwind CSS, FontAwesome Free, shadcn/ui, Framer Motion

## Brand
- Primary: #1ABC9C
- Font: Plus Jakarta Sans

---

## PAGE LAYOUT

Max content width: 720px (optimal reading).
Centered with generous margins.

---

## HERO

- Back link: "← Back to Blog" (top left)
- Hero image (full content width, 16:9 or 3:2)
- Rounded corners (16px)

---

## ARTICLE HEADER

- Category pill (teal)
- Title (40px, 800 weight)
- Meta row:
  - Author avatar (40px) + name
  - Separator dot
  - Date
  - Separator dot
  - Read time (e.g., "5 min read")
- Share buttons (right side or below):
  - Twitter, Facebook, LinkedIn, Copy Link
  - Icon buttons, subtle hover

---

## ARTICLE CONTENT

Typography:
- Body: 18px, 1.75 line height, #333
- H2: 28px, 700 weight, 48px margin top
- H3: 22px, 600 weight
- Paragraphs: 24px margin between
- Lists: Proper spacing, bullet/number styling
- Links: Teal, underline on hover
- Blockquotes: 4px left border (teal), italic, light bg
- Code: Monospace, light gray bg, rounded
- Images: Full width, rounded, caption below (muted, small)

---

## IN-ARTICLE CTA

After ~50% of article:
- Card with light teal background
- "Got a parking ticket?"
- "Upload it now and see your chances of winning an appeal"
- CTA button: "Upload Ticket" (primary)

---

## TABLE OF CONTENTS (optional, long posts)

Sticky sidebar (desktop only, right side):
- Lists H2 headings
- Click: Smooth scroll
- Highlight current section
- Light styling, doesn't distract

---

## AUTHOR BOX

After article:
- Author avatar (64px)
- Name (18px, 600 weight)
- Bio (14px, muted)
- Link: "More from [Author]"

---

## RELATED POSTS

Section: "Related Articles"
3 cards (same style as blog index).

---

## ANIMATIONS

- Page enter: Content fades up
- Scroll progress: Thin bar at top (teal)
- Share buttons: Subtle bounce hover
```

---

### PROMPT 9: Sign In Page

```
Design an Airbnb-inspired authentication page for "Parking Ticket Pal."

## Technical Stack
- React/Next.js, Tailwind CSS, FontAwesome Free, shadcn/ui, Framer Motion

## Brand
- Primary: #1ABC9C, Accent: #fdfa64
- Font: Plus Jakarta Sans

---

## PAGE LAYOUT

**Desktop**: Two columns (40/60 split)
- Left: Branding panel
- Right: Auth form

**Mobile**: Single column, form only, minimal branding header.

---

## LEFT PANEL (Desktop)

Teal gradient background (#1ABC9C to darker shade).

Content (white):
- Logo (top left)
- Headline: "Fight unfair parking tickets with AI" (36px, 700 weight)
- 3 benefit points with check icons:
  - "Save time with AI-generated appeals"
  - "Track all your tickets in one place"
  - "70%+ success rate at tribunal"
- Optional: Abstract parking/legal illustration

---

## RIGHT PANEL - AUTH FORM

Centered content, max-width 400px.

### Sign In View

- "Welcome back" (32px, 700 weight)
- "Sign in to manage your tickets" (16px, muted)

**Social Sign-In Buttons** (full width, stacked):
- "Continue with Google" (Google icon) - white bg, subtle border
- "Continue with Apple" (Apple icon) - white bg, subtle border

**Divider**: Line with "or" in center

**Email Sign In**:
- Email input with label
- "Continue with Email" button (teal, full width)
- Helper text: "We'll send you a magic link"

**Footer**: "Don't have an account? Sign up" (link)

### Sign Up View (same page toggle)

- "Create your account" (32px)
- Same social buttons
- Same email flow
- Footer: "Already have an account? Sign in"

---

## FORM STYLING

- Inputs: 48px height, 8px radius, subtle border
- Focus: Teal ring
- Buttons: 48px height, 8px radius
- Social buttons: White/gray bg, border, icon + text
- Spacing: 24px between elements

---

## TRUST ELEMENTS (below form)

- "Trusted by 10,000+ UK drivers"
- Lock icon + "Your data is secure and never shared"
- Optional: Security badges

---

## MOBILE LAYOUT

- Small logo top
- Auth form
- Trust elements below
- Teal accent bar or pattern at top

---

## ANIMATIONS

- Form: Fade in
- Button hover: Subtle scale (1.02)
- Error: Shake animation
- Success: Checkmark animation
```

---

### PROMPT 10: Account Settings

```
Design an Airbnb-inspired account settings page for "Parking Ticket Pal."

## Technical Stack
- React/Next.js, Tailwind CSS, FontAwesome Free, shadcn/ui, Framer Motion

## Brand
- Primary: #1ABC9C
- Font: Plus Jakarta Sans

---

## PAGE LAYOUT

- Title: "Account Settings" (32px, 700 weight)
- Two columns (desktop): Nav tabs (20%) | Content (80%)
- Mobile: Horizontal scrolling tab pills at top

---

## NAVIGATION TABS (vertical, left side)

- Profile (default)
- Notifications
- Billing
- Security
- Delete Account

Active: Teal text, light teal background pill.
Icons for each.

---

## PROFILE TAB

**Profile Picture Card**:
- Avatar (120px, circular)
- "Change Photo" button (outlined)
- "Remove" link (muted)

**Personal Information Card**:
Title: "Personal Information"
Form:
- Full Name (input)
- Email (input, "Verified" badge if applicable)
- Phone (optional input)
- "Save Changes" button

**Address Card**:
Title: "Address"
UK format fields:
- Address Line 1
- Address Line 2
- City
- Postcode
- Country (default: United Kingdom)
- "Save Address" button

---

## NOTIFICATIONS TAB

Card with toggle switches:
- Email notifications (master)
- Ticket deadline reminders
- Status updates
- Marketing & tips

Each toggle with label and description (14px, muted).

---

## BILLING TAB

**Current Plan Card**:
- Plan name + price
- Renewal date
- "Change Plan" button
- "Cancel Subscription" link

**Payment Method Card**:
- Card on file: •••• 4242 (Visa icon)
- Expiry date
- "Update Payment Method" button

**Billing History Card**:
Table: Date | Description | Amount | Status | Invoice link

---

## SECURITY TAB

**Connected Accounts Card**:
- Google: Connected/Not connected + Connect/Disconnect button
- Apple: Same

**Sessions Card**:
- List of active sessions
- Device, location, last active
- "Sign Out All Other Sessions" button

---

## DELETE ACCOUNT TAB

Warning card (red border/tint):
- Warning icon
- "Delete Your Account"
- Explanation of what's lost
- "Delete My Account" button (destructive)
- Requires confirmation dialog

---

## ANIMATIONS

- Tab switch: Content crossfade
- Toggle: Smooth slide
- Save: Success checkmark animation
- Form change: Highlight border briefly
```

---

## Implementation Checklist

After v0 generation:

1. **Font**: Update `apps/web/app/fonts.ts` to Plus Jakarta Sans
2. **Icons**: Replace FontAwesome Free → Pro throughout
3. **Mapbox**: Update map style to `light-v11` for cleaner look
4. **Framer Motion**: `pnpm add framer-motion`
5. **Components**: Export to proper directories
6. **Colors**: Verify `global.css` tokens align
7. **Testing**: All breakpoints (mobile, tablet, desktop)
8. **Accessibility**: Contrast, focus states, keyboard nav
9. **Performance**: Lazy load animations, optimize images/video
10. **Video**: Compress hero videos properly (H.264, <5MB each)
