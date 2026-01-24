# Dashboard - V0 Prompt

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
