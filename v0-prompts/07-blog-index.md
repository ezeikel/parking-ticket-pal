# Blog Index Page - V0 Prompt

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
