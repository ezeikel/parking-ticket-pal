# Parking Ticket Pal - Dashboard V0 Prompt

Design a premium, Airbnb-inspired dashboard for **Parking Ticket Pal** - a personal command center for managing parking tickets, tracking appeals, and staying on top of deadlines.

---

## Technical Stack

- React/Next.js 16 with TypeScript
- Tailwind CSS v4
- FontAwesome icons (Free for now, will swap to Pro)
- shadcn/ui component patterns
- **Framer Motion** for all animations
- **Recharts** for charts and data visualizations
- **Mapbox GL JS** for map integration
- Mobile-first responsive design

---

## Design System - Airbnb Aesthetic

### Typography
- **Primary Font**: Cereal (Airbnb's font) - if unavailable, use **Plus Jakarta Sans** from Google Fonts
- **Hierarchy**:
  - Page title: 32px, weight 700
  - Section headers: 24px, weight 600
  - Card titles: 18px, weight 600
  - Body: 16px, weight 400
  - Captions/muted: 14px, weight 400

### Colors
- **Primary**: Teal `#1ABC9C` (CTAs, positive indicators, links)
- **Accent**: Yellow `#fdfa64` (highlights, badges)
- **Background**: White `#FFFFFF` (cards), Light gray `#F7F7F7` (page background)
- **Text**: Near-black `#222222`, Muted gray `#717171`
- **Success**: Green `#00A699` (paid, won, positive)
- **Warning**: Amber `#FFB400` (upcoming deadlines, needs attention)
- **Urgent/Error**: Coral `#FF5A5F` (overdue, critical)
- **Neutral**: Slate `#64748B` (inactive, pending)

### Components
- **Card radius**: 16px
- **Button radius**: 8px
- **Input radius**: 8px
- **Shadows**: Soft `0 2px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.06)`
- **Hover shadows**: `0 4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.08)`

---

## PAGE LAYOUT

### Overall Structure
```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (sticky) - Logo, Nav, User Menu                      │
├─────────────────────────────────────────────────────────────┤
│ PAGE HEADER - "Dashboard" title, greeting, primary CTA      │
├─────────────────────────────────────────────────────────────┤
│ URGENT ALERTS (conditional)                                 │
├─────────────────────────────────────────────────────────────┤
│ STATS CARDS ROW (4 cards)                                   │
├─────────────────────────────────────────────────────────────┤
│ MAIN CONTENT (2 columns)                                    │
│ ┌─────────────────────┐ ┌─────────────────────────────────┐ │
│ │ TICKETS LIST        │ │ MAP VIEW                        │ │
│ │ (scrollable)        │ │ (Mapbox)                        │ │
│ │                     │ │                                 │ │
│ └─────────────────────┘ └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ANALYTICS SECTION (charts)                                  │
├─────────────────────────────────────────────────────────────┤
│ QUICK ACTIONS                                               │
├─────────────────────────────────────────────────────────────┤
│ RECENT ACTIVITY TIMELINE                                    │
└─────────────────────────────────────────────────────────────┘
```

**Mobile**: Single column, map toggleable

---

## HEADER (Sticky)

- **Left**: Logo "Parking Ticket Pal"
- **Center** (desktop): Nav links - Dashboard (active), Tickets, Vehicles, Letters, Settings
- **Right**:
  - Notification bell with badge count
  - User avatar dropdown (Settings, Help, Log Out)
- **Style**: White background, subtle bottom border, 64px height

---

## PAGE HEADER

**Layout**: Flex row, space-between

**Left side**:
- Title: "Dashboard" (32px, weight 700)
- Greeting: "Welcome back, [First Name]" (16px, muted gray)
- Subtitle: "Here's what's happening with your tickets" (14px, muted)

**Right side**:
- Primary CTA button: "Upload New Ticket" (teal bg, white text, plus icon)
- Style: Large button with hover shadow

**Framer Motion**: Title fades in, button scales slightly on hover

---

## URGENT ALERTS SECTION (Conditional)

Only show if there are tickets requiring immediate attention.

**Alert Card** (amber/warning style):
- **Background**: Amber `#FEF3C7` with amber `#F59E0B` left border (4px)
- **Icon**: Alert triangle (amber)
- **Content**:
  - Title: "Action Required"
  - Message: "You have **3 tickets** with deadlines in the next 7 days"
  - Sub-message: "1 ticket due tomorrow"
- **CTA**: "View Urgent Tickets" button (amber outlined)
- **Dismiss**: X button to dismiss temporarily

**Critical Alert** (coral/urgent style):
- For overdue or bailiff-stage tickets
- **Background**: Coral `#FEE2E2` with coral `#FF5A5F` left border
- **Message**: "**1 ticket** is past deadline. Fine may have increased."

**Framer Motion**: Slide down on mount, shake animation on critical alerts

---

## STATS CARDS ROW

**Grid**: 4 columns desktop, 2x2 tablet, stack mobile

### Card Design
Each card contains:
- **Icon** (24px) in a light colored circle (color matches stat type)
- **Value** (32px, weight 700) - large number
- **Label** (14px, muted) - description
- **Trend indicator** (optional) - up/down arrow with percentage

### Stats Cards:

**1. Total Tickets**
- Icon: Ticket (teal circle)
- Value: "12"
- Label: "Total Tickets"
- Trend: "+2 this month" (green arrow up)

**2. Money at Stake**
- Icon: Pound sign (amber circle)
- Value: "£1,340"
- Label: "Outstanding Fines"
- Trend: "£450 in discount period" (amber info)

**3. Success Rate**
- Icon: Trophy (green circle)
- Value: "78%"
- Label: "Appeal Success"
- Trend: "6 of 8 won" (green)

**4. Upcoming Deadlines**
- Icon: Calendar-alert (coral circle if urgent, amber otherwise)
- Value: "3"
- Label: "Due This Week"
- Trend: "Next: 2 days" (amber or coral based on urgency)

**Framer Motion**:
- Cards stagger fade-in on load (100ms delay each)
- Numbers animate counting up
- Cards lift slightly on hover

---

## MAIN CONTENT SECTION - Split View (Airbnb Map Style)

### Layout
- **Desktop**: 50% list / 50% map, side by side
- **Tablet**: 60% list / 40% map
- **Mobile**: List view with map toggle button

### Left Panel - Tickets List

**Header Row**:
- Title: "Your Tickets" (20px, weight 600)
- Filter dropdown: "All Tickets" / "Needs Action" / "Pending" / "Won" / "Paid"
- Sort dropdown: "Newest First" / "Deadline Soonest" / "Amount Highest"
- View toggle: List icon / Grid icon

**Ticket Cards** (scrollable list, max-height with scroll):

Each ticket card contains:

```
┌────────────────────────────────────────────────────────────┐
│ ┌──────┐                                                   │
│ │ LOGO │  PCN: AB12345678              Status Badge        │
│ │      │  Lewisham Council             [NEEDS ACTION]      │
│ └──────┘                                                   │
│                                                            │
│ 📍 High Street, Lewisham SE13        💷 £130              │
│ 📅 Issued: 15 Jan 2024               ⏰ Due in 5 days      │
│                                                            │
│ ┌──────────────────────────────────────────────────┐       │
│ │ Success Prediction: ████████░░ 73%              │       │
│ └──────────────────────────────────────────────────┘       │
│                                                            │
│ [Challenge Now]                              [View Details]│
└────────────────────────────────────────────────────────────┘
```

**Card Elements**:
- **Issuer logo/avatar**: Circle with issuer initials or logo placeholder
- **PCN Reference**: Bold, monospace font
- **Issuer name**: Regular text
- **Status badge**: Colored pill
  - "NEEDS ACTION" (amber)
  - "PENDING APPEAL" (blue)
  - "WON" (green)
  - "PAID" (gray)
  - "OVERDUE" (coral)
  - "BAILIFF STAGE" (dark red)
- **Location**: Map pin icon + address (truncated)
- **Amount**: Pound sign + amount
- **Issued date**: Calendar icon + date
- **Deadline**: Clock icon + "Due in X days" (color coded)
- **Success prediction bar**: Horizontal progress bar with percentage
  - Green (>60%), Amber (40-60%), Red (<40%)
- **Action buttons**: "Challenge Now" (primary), "View Details" (secondary)

**Hover behavior**: Card lifts, shadow increases, corresponding map marker pulses

**Empty state** (if no tickets):
- Illustration placeholder
- "No tickets yet"
- "Upload your first ticket to get started"
- Large "Upload Ticket" button

**Framer Motion**:
- Cards fade in with stagger
- Hover lift animation
- Smooth scroll

### Right Panel - Map View

**Map Configuration**:
- **Provider**: Mapbox GL JS
- **Style**: `mapbox://styles/mapbox/light-v11` (clean, minimal)
- **Center**: Auto-center on user's tickets, or UK center if none
- **Zoom**: Auto-fit all markers with padding

**Custom Markers**:
- Teal pin with car icon inside
- Different colors based on status:
  - Teal: Pending/Active
  - Amber: Upcoming deadline
  - Coral: Overdue
  - Green: Won/Resolved
  - Gray: Paid

**Marker Interaction**:
- **Hover**: Marker scales up, pulse animation
- **Click**: Popup appears with mini ticket card:
  ```
  ┌────────────────────────┐
  │ PCN: AB12345678        │
  │ £130 · Due in 5 days   │
  │ [View Details →]       │
  └────────────────────────┘
  ```

**List-Map Sync**:
- Hovering a list card highlights corresponding marker
- Clicking a marker scrolls list to that ticket

**Map Controls**:
- Zoom in/out (top-right)
- Fullscreen toggle
- Re-center button

**Mobile Map**:
- Hidden by default
- Toggle button: "Show Map" / "Show List"
- Full-screen overlay when shown

**Framer Motion**:
- Markers drop in with bounce (staggered 100ms)
- Popup fade in on click

---

## ANALYTICS SECTION

**Section header**: "Your Ticket Analytics" (24px, weight 600)

**Grid**: 2 columns desktop, stack mobile

### Chart 1 - Tickets Over Time (Line/Area Chart)

**Card**:
- Title: "Tickets Received"
- Subtitle: "Last 12 months"
- **Chart**: Area chart with gradient fill
  - X-axis: Months
  - Y-axis: Ticket count
  - Line color: Teal
  - Fill: Teal gradient (20% opacity)
- **Legend**: Show total count "42 tickets this year"

### Chart 2 - Tickets by Status (Donut Chart)

**Card**:
- Title: "Status Breakdown"
- **Chart**: Donut/ring chart
  - Segments:
    - Pending (teal) - 5
    - Won (green) - 6
    - Lost (red) - 2
    - Paid (gray) - 4
- **Center**: Total count "17 total"
- **Legend**: Below chart with segment labels and counts

### Chart 3 - Money Saved vs Paid (Bar Chart)

**Card**:
- Title: "Financial Impact"
- **Chart**: Horizontal bar comparison
  - "Saved" bar (green): £780
  - "Paid" bar (gray): £260
- **Summary**: "You've saved £780 by challenging tickets"

### Chart 4 - Success Rate Trend (Small Line Chart)

**Card**:
- Title: "Success Rate Trend"
- **Chart**: Sparkline style mini chart
- **Value**: "78%" (large)
- **Trend**: "↑ 12% from last quarter"

**Recharts Implementation Notes**:
- Use `ResponsiveContainer` for all charts
- Custom tooltip styling matching design system
- Animate on mount with duration 1000ms
- Colors from design system palette

**Framer Motion**: Charts fade in when section enters viewport, bars/segments animate from 0

---

## QUICK ACTIONS SECTION

**Section header**: "Quick Actions" (24px, weight 600)

**Grid**: 4 columns desktop, 2x2 mobile

### Action Cards:

**1. Upload New Ticket** (PRIMARY - teal background, white text)
- Icon: Camera/Plus
- Title: "Upload Ticket"
- Subtitle: "Snap or upload your PCN"
- Arrow icon on right

**2. View All Tickets** (outlined)
- Icon: Ticket stack
- Title: "All Tickets"
- Subtitle: "12 total"
- Arrow icon

**3. Manage Vehicles** (outlined)
- Icon: Car
- Title: "Vehicles"
- Subtitle: "3 registered"
- Arrow icon

**4. Download Letters** (outlined)
- Icon: File-download
- Title: "Letters & Forms"
- Subtitle: "8 documents"
- Arrow icon

**Card style**:
- 80px min-height
- Icon + text left-aligned
- Arrow right-aligned
- Hover: Lift + shadow (outlined), Darken (primary)

**Framer Motion**: Hover scale and shadow animation

---

## RECENT ACTIVITY TIMELINE

**Section header**: "Recent Activity" (24px, weight 600), with "View All" link

**Timeline Card**:

Vertical timeline with activity items:

```
● Today
│
├─ 🎉 Appeal Won - PCN AB12345678
│     Lewisham Council cancelled your ticket
│     Saved £130 · 2 hours ago
│
├─ 📄 Letter Generated - PCN CD98765432
│     Challenge letter ready for download
│     3 hours ago
│
● Yesterday
│
├─ ⏰ Reminder Sent - PCN EF11223344
│     14-day deadline approaching
│     "Discount period expires in 3 days"
│
├─ 📤 Challenge Submitted - PCN GH55667788
│     Automatically submitted to Westminster Council
│     Awaiting response
│
● This Week
│
├─ 📸 Ticket Uploaded - PCN IJ99887766
│     Extracted from photo successfully
│     Vehicle: AB12 CDE
```

**Timeline item structure**:
- **Icon**: Emoji or colored icon based on activity type
- **Title**: Bold action name
- **Description**: Details
- **Metadata**: Time ago, additional info
- **Status badge** (if applicable)

**Activity types & icons**:
- 🎉 Appeal Won (green)
- ❌ Appeal Lost (red)
- 📄 Letter/Form Generated (blue)
- 📤 Challenge Submitted (teal)
- ⏰ Reminder Sent (amber)
- 📸 Ticket Uploaded (gray)
- 💳 Payment Made (gray)
- ⚠️ Deadline Warning (coral)

**Framer Motion**: Items fade in sequentially, subtle line drawing animation

---

## UPCOMING DEADLINES WIDGET (Sidebar or Card)

**Card with amber accent**:
- Title: "Upcoming Deadlines"
- Icon: Calendar with exclamation

**Deadline list**:
```
┌────────────────────────────────────────┐
│ ⚠️ TOMORROW                            │
│    PCN AB12345678 · £130               │
│    14-day discount expires             │
│    [Take Action]                       │
├────────────────────────────────────────┤
│ 📅 IN 3 DAYS                           │
│    PCN CD98765432 · £65                │
│    Appeal window closes                │
│    [View Details]                      │
├────────────────────────────────────────┤
│ 📅 IN 5 DAYS                           │
│    PCN EF11223344 · £110               │
│    Response deadline                   │
│    [View Details]                      │
└────────────────────────────────────────┘
```

**Color coding**:
- Tomorrow/Today: Coral background tint
- 2-3 days: Amber background tint
- 4-7 days: Light gray

---

## TICKET STAGE TRACKER (Featured Card)

For the most urgent/active ticket, show a stage tracker:

**Card title**: "Track: PCN AB12345678"

**Stage progress bar**:
```
[PCN Issued] ───●─── [Notice to Owner] ─────── [Appeal] ─────── [Tribunal] ─────── [Resolved]
     ✓              CURRENT                    Next step
```

**Stages** (horizontal stepper):
1. **PCN Issued** (completed - green check)
2. **Notice to Owner** (current - pulsing dot)
3. **Representation/Appeal** (upcoming - gray)
4. **Tribunal** (upcoming - gray)
5. **Resolved** (upcoming - gray)

**Below tracker**:
- Current status explanation: "You received a Notice to Owner. You have 28 days to make a formal representation."
- Recommended action: "We recommend challenging this ticket. Your success prediction is 73%."
- CTA: "Generate Appeal Letter" (teal button)

**Framer Motion**: Progress line draws to current stage, dots pulse at current

---

## EMPTY STATE (No Tickets)

When user has no tickets:

**Full page centered content**:
- Large illustration placeholder (car with ticket)
- Title: "Welcome to Parking Ticket Pal!"
- Subtitle: "You don't have any tickets yet. When you do, upload them here and we'll help you fight back."
- Large primary CTA: "Upload Your First Ticket" (teal, with camera icon)
- Secondary text: "Or add a ticket manually" (link)

**Framer Motion**: Illustration fades in, bounces slightly

---

## NOTIFICATIONS PANEL (Dropdown from Bell)

**Trigger**: Click notification bell in header

**Panel**:
- Width: 360px
- Max-height: 480px with scroll
- Position: Dropdown from bell icon

**Content**:
- Header: "Notifications" with "Mark all read" link
- List of notifications:
  ```
  ┌────────────────────────────────────┐
  │ 🔴 New                             │
  │ ⏰ Deadline Tomorrow               │
  │ PCN AB12345678 discount expires    │
  │ 1 hour ago                         │
  ├────────────────────────────────────┤
  │ 🔴 New                             │
  │ 🎉 Appeal Successful!              │
  │ Lewisham cancelled PCN CD987654    │
  │ 3 hours ago                        │
  ├────────────────────────────────────┤
  │ Read                               │
  │ 📄 Letter Ready                    │
  │ Your PE3 form is ready to download │
  │ Yesterday                          │
  └────────────────────────────────────┘
  ```
- Footer: "View All Notifications" link

**Framer Motion**: Dropdown slides down, notifications fade in

---

## RESPONSIVE BEHAVIOR

### Desktop (>1024px)
- Full layout as described
- Split view for tickets/map
- 4-column stats grid
- 2-column analytics

### Tablet (768-1024px)
- 2x2 stats grid
- Narrower map panel (40%)
- Single column analytics
- 2x2 quick actions

### Mobile (<768px)
- Single column everything
- Stats carousel or 2x2 grid
- Map hidden with toggle button
- Quick actions as horizontal scroll
- Activity timeline simplified
- Bottom sheet for ticket details

---

## LOADING STATES

**Skeleton loaders**:
- Stats cards: Pulsing gray rectangles
- Ticket cards: Placeholder card outlines
- Charts: Pulsing chart placeholders
- Map: Gray rectangle with loading spinner

**Framer Motion**: Skeleton pulse animation, content fades in replacing skeleton

---

## ERROR STATES

**API Error Card**:
- Icon: Alert circle (coral)
- Title: "Unable to load tickets"
- Message: "Please check your connection and try again"
- CTA: "Retry" button

---

## KEY FRAMER MOTION PATTERNS

```tsx
// Page load stagger
const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

// Card fade up
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
}

// Stats number counting
// Use animate() or useSpring with integer rounding

// Chart animations
// Recharts has built-in animation props:
// <AreaChart animationDuration={1000} animationEasing="ease-out">

// Map marker bounce
const markerVariants = {
  hidden: { scale: 0, y: -20 },
  visible: {
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 15 }
  }
}

// Hover card lift
whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}

// Timeline draw
const timelineVariants = {
  hidden: { pathLength: 0 },
  visible: { pathLength: 1, transition: { duration: 1.5 } }
}
```

---

## DATA FLOW NOTES

**Props/Data the dashboard expects**:
```typescript
interface DashboardData {
  user: {
    name: string
    email: string
  }
  stats: {
    totalTickets: number
    outstandingAmount: number // in pence
    successRate: number // percentage
    upcomingDeadlines: number
  }
  tickets: Ticket[]
  recentActivity: ActivityItem[]
  notifications: Notification[]
  chartData: {
    ticketsOverTime: { month: string; count: number }[]
    statusBreakdown: { status: string; count: number }[]
    financialImpact: { saved: number; paid: number }
  }
}

interface Ticket {
  id: string
  pcnNumber: string
  issuer: string
  issuerType: 'COUNCIL' | 'TFL' | 'PRIVATE_COMPANY'
  status: TicketStatus
  amount: number // in pence
  location: { address: string; lat: number; lng: number }
  issuedAt: Date
  deadlineDate: Date
  successPrediction: number // percentage
  vehicleReg: string
}
```

---

## IMPORTANT IMPLEMENTATION NOTES

1. All animations should respect `prefers-reduced-motion`
2. Map should lazy load (only initialize when visible)
3. Charts should use `ResponsiveContainer` from Recharts
4. Ticket list should virtualize if >50 items (react-window)
5. Use proper ARIA labels for accessibility
6. Numbers should format with locale (£1,340 not £1340)
7. Dates should be relative ("2 days ago") with full date on hover
8. Empty states should always provide a clear CTA
9. Loading states should match layout to prevent layout shift
