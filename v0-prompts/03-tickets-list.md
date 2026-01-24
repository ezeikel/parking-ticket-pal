# Tickets List Page - V0 Prompt

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
