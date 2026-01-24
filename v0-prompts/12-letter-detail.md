# Letter Detail Page - V0 Prompt

Design an Airbnb-inspired letter detail page for "Parking Ticket Pal."

## Technical Stack
- React/Next.js, Tailwind CSS, FontAwesome Free, shadcn/ui, Framer Motion

## Brand
- Primary: #1ABC9C
- Font: Plus Jakarta Sans

---

## PAGE LAYOUT

Max content width: 900px, centered.

---

## HEADER

**Back Navigation**:
- "← Back to Ticket" (ghost button, links to parent ticket)

**Actions** (right side):
- "Download" button (outlined, download icon)
- "Email" button (outlined, envelope icon)

---

## LETTER OVERVIEW CARD

**Top Row**:
- Left: Letter type title (28px, 700 weight)
  - e.g., "Notice to Owner", "Charge Certificate"
- Right: Type badge (colored pill)
  - Blue: Initial Notice, Notice to Owner
  - Orange: Charge Certificate, Order for Recovery
  - Red: CCJ Notice, Final Demand, Bailiff Notice
  - Green: Appeal Response

**Urgency Indicator** (if applicable):
- Red alert banner below title
- "Action Required" or "Urgent: X days to respond"
- Warning icon + deadline date

**Context Line**:
- "PCN: ABC123456" (linked to ticket)
- "Ticket Status: In Progress"

---

## TIMELINE POSITION CARD

**Visual Timeline**:
Horizontal timeline showing letter in context of ticket journey:

```
[Ticket Issued] → [Initial Notice] → [NTO] → [This Letter] → [?]
```

- Dots for each stage
- Current letter highlighted (larger, teal)
- Completed stages: Green checkmarks
- Future stages: Gray dots
- Connecting line with progress

**Timeline Labels**:
- Stage name below each dot
- Date below stage name (small, muted)

---

## KEY DETAILS CARD

Title: "Letter Details"

Two-column grid:

**Left Column**:
- Sent Date: [formatted date]
- Received Date: [formatted date or "Not specified"]
- Reference: [if any]
- Created: [when added to system]

**Right Column** (if amount increase):
- New Amount: £XX.XX (highlighted, red if increased)
- Previous Amount: £XX.XX (strikethrough)
- Increase Reason: [reason text]
- Effective Date: [when new amount applies]

**Deadline Alert** (if applicable):
- Amber background card
- Clock icon
- "Respond by [date] to avoid further escalation"
- Days remaining countdown

---

## SUMMARY CARD

Title: "AI Summary"

- Light gray background
- 16px body text
- 1.6 line height
- AI-generated summary of letter contents
- Sparkles icon in header to indicate AI

**Actions**:
- "Regenerate" link (small, muted)

---

## EXTRACTED TEXT CARD

Title: "Full Text"

**Collapsible Section**:
- Default: Collapsed with "Show full text" link
- Expanded: Shows complete OCR-extracted text
- Pre-formatted text (monospace-ish, preserves formatting)
- Light gray background
- Copy button (top right)

---

## DOCUMENT GALLERY CARD

Title: "Letter Images"

**Image Grid**:
- 2 columns desktop, 1 mobile
- Each image:
  - Rounded corners (12px)
  - Subtle shadow
  - Caption below (filename or "Page X")
  - Click to open lightbox

**Lightbox**:
- Full-screen overlay
- Image centered with zoom controls
- Left/right navigation if multiple
- Close button (X) top right
- Download button in lightbox

---

## SUGGESTED ACTIONS CARD

Title: "What You Can Do"

Based on letter type, show relevant actions:

**For Notice to Owner**:
- "Write a formal representation" → Link to appeal flow
- "Pay the reduced amount" → External link
- Deadline reminder

**For Charge Certificate**:
- "Appeal to Traffic Penalty Tribunal" → Link
- "Pay to avoid court action" → Warning about escalation
- Deadline with urgency

**For Appeal Response (Success)**:
- Green success banner
- "Your appeal was successful!"
- "No further action needed"

**For Appeal Response (Rejected)**:
- Amber banner
- "Your appeal was rejected"
- "You can still appeal to the Tribunal within 28 days"
- Action buttons for next steps

**Action Cards**:
- Each action in a clickable card
- Icon + title + brief description
- Arrow icon (right)
- Hover: Subtle lift

---

## RELATED DOCUMENTS SECTION

Title: "Other Letters for This Ticket"

If the ticket has multiple letters:
- Compact list of other letters
- Letter type + date + badge
- Click to navigate
- Current letter highlighted (not clickable)

---

## FOOTER ACTIONS

Sticky on mobile:
- "Back to Ticket" (primary button)
- "Download PDF" (outlined button)

---

## EMPTY/ERROR STATES

**Letter Not Found**:
- Centered content
- Warning icon (48px)
- "Letter not found"
- "This letter doesn't exist or you don't have permission"
- "Go to Tickets" button

---

## ANIMATIONS

- Page enter: Content fades up (staggered)
- Timeline: Dots and line draw in sequentially
- Card hover: Subtle lift
- Image hover: Scale 1.03
- Lightbox: Fade in overlay + scale up image
- Collapse toggle: Smooth height animation
- Action cards: Scale 1.02 on hover

---

## MOBILE CONSIDERATIONS

- Single column layout
- Sticky header with back button
- Timeline becomes vertical (space efficient)
- Full-width cards
- Gallery: Swipeable horizontal carousel
- Sticky bottom action bar
- Collapsible sections for long content
