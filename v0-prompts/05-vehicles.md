# Vehicles Page - V0 Prompt

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
