# Upload/New Ticket Flow - V0 Prompt

Design an Airbnb-inspired multi-step upload flow for "Parking Ticket Pal."

## Technical Stack
- React/Next.js, Tailwind CSS, FontAwesome Free, shadcn/ui, Framer Motion

## Brand
- Primary: #1ABC9C, Accent: #fdfa64
- Font: Plus Jakarta Sans

---

## PAGE LAYOUT

Centered content, max-width 640px.
Clean white background with subtle gray page bg.

---

## TAB SELECTOR (Top)

Two tabs (pill style):
- "Parking Ticket" (default, with ticket icon)
- "Letter" (with envelope icon)

Active: Teal bg, white text.
Inactive: Light gray bg, dark text.

---

## PARKING TICKET FLOW (Multi-Step Wizard)

### Progress Indicator

Horizontal stepper at top:
- Step 1: "Upload" (camera icon)
- Step 2: "Review" (eye icon)
- Step 3: "Confirm" (check icon)

Current step: Teal circle, bold text.
Completed steps: Teal checkmark.
Future steps: Gray circle.
Connecting lines between steps.

---

### STEP 1: UPLOAD

**Header**:
- "Upload Your Ticket" (28px, 700 weight)
- "Take a photo or upload an image of your PCN" (16px, muted)

**Upload Zone** (Airbnb-style):
- Large dashed border area (300px height)
- Light teal/gray background
- Centered content:
  - Camera icon (48px, teal)
  - "Drag and drop your ticket here"
  - "or"
  - "Browse files" button (outlined)
- Accepted formats: "JPG, PNG, PDF up to 10MB"

**Mobile-Optimized**:
- "Take Photo" button (primary, full width, camera icon)
- "Choose from Gallery" button (outlined, full width)
- Clear separation between options

**Upload Progress**:
- When file selected: Show filename + progress bar
- Animated teal progress bar
- Cancel button (X icon)

**Alternative**:
- Link below upload zone: "Enter details manually instead"

---

### STEP 2: REVIEW (OCR Results)

**Header**:
- "Review Extracted Details" (28px, 700 weight)
- "We've extracted the following from your ticket. Please verify." (16px, muted)

**Thumbnail Preview**:
- Uploaded image thumbnail (120px, rounded, left side)
- Clickable to view full image in lightbox

**Extracted Fields Form**:
Pre-filled from OCR (editable):
- PCN Reference (required, highlighted if confident)
- Issue Date (date picker)
- Issuer/Authority (text input with suggestions)
- Contravention Code (dropdown with description preview)
- Location Address (text input)
- Vehicle Registration (text input, UK plate format)
- Amount (currency input, pounds)
- Payment Deadline (date picker, calculated if not found)

**Confidence Indicators**:
- Green checkmark: High confidence (auto-filled)
- Amber warning: Low confidence (needs review)
- Red alert: Could not extract (manual entry required)

**Form Styling**:
- 48px input height
- 8px radius
- Clear labels above
- Helper text below where needed

**Actions**:
- "Continue" button (primary, right aligned)
- "Back" button (ghost, left aligned)

---

### STEP 3: CONFIRM & SERVICE SELECTION

**Header**:
- "Choose Your Service" (28px, 700 weight)
- "Select how you'd like us to help" (16px, muted)

**Ticket Summary Card**:
Compact card showing:
- PCN Reference (bold)
- Issuer name
- Amount (large)
- Due date with days remaining

**Service Options** (Airbnb-style selection cards):

**Option 1: Standard - £2.99**
- Radio button selection
- "AI Appeal Letter"
- Features list:
  - AI-generated appeal
  - PDF download
  - Email support
- Click: Card gets teal border

**Option 2: Premium - £9.99** (Highlighted)
- "Most Popular" badge (teal pill)
- "Full Service"
- Features list:
  - Everything in Standard
  - We submit for you
  - Priority support
  - Escalation help
- Elevated card with shadow
- Click: Card gets teal border

**Actions**:
- "Add Ticket" button (primary, large)
- "Back" button (ghost)
- Small text: "You'll pay after adding your ticket"

---

## SUCCESS STATE

**Animation**: Confetti or checkmark burst animation

**Content**:
- Large green checkmark (animated drawing)
- "Ticket Added!" (32px, 700 weight)
- PCN reference shown
- "What's next?" section:
  - If Standard: "Generate your appeal letter"
  - If Premium: "We'll start working on your case"

**Actions**:
- "View Ticket" button (primary)
- "Add Another Ticket" button (outlined)

---

## LETTER TAB FLOW

Similar structure but simpler:

### Upload Zone
- Same drag-and-drop style
- "Upload your letter from the council or authority"

### Extracted Details
- Letter Type dropdown (Initial Notice, NTO, Charge Certificate, etc.)
- Sent Date
- Related Ticket (if linkable)
- Amount mentioned (if any)
- Summary (text area)

### Confirm
- Review card
- Link to existing ticket or create association
- "Add Letter" button

---

## TRUST ELEMENTS

Below the form throughout:
- Lock icon + "Your data is encrypted and secure"
- "Trusted by 10,000+ UK drivers"
- Small council logo strip (grayscale)

---

## ANIMATIONS

- Tab switch: Crossfade (200ms)
- Step transitions: Slide left/right + fade
- Upload zone: Subtle pulse when dragging over
- Progress bar: Smooth fill animation
- Success: Checkmark draws in + confetti
- Error: Shake animation on invalid fields
- Field focus: Border color transition

---

## MOBILE CONSIDERATIONS

- Single column layout
- Sticky progress indicator at top
- Large touch targets (min 44px)
- Bottom-aligned primary CTA
- Full-width buttons
- Camera access prompt styling
