# Ticket Detail Page - V0 Prompt

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
