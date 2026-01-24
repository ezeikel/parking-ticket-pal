# Sign In Page - V0 Prompt

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
