# Parking Ticket Pal - Landing Page V0 Prompt

Design a premium, Airbnb-inspired landing page for **Parking Ticket Pal** - a UK app that helps drivers challenge unfair parking tickets using AI, automation, and smart form generation.

---

## Technical Stack

- React/Next.js 16 with TypeScript
- Tailwind CSS v4
- FontAwesome icons (Free for now, will swap to Pro)
- shadcn/ui component patterns
- **Framer Motion** for all animations (critical requirement)
- **Recharts** for any stats/data visualizations
- Mobile-first responsive design

---

## Design System - Airbnb Aesthetic

### Typography
- **Primary Font**: Cereal (Airbnb's font) - if unavailable, use **Plus Jakarta Sans** from Google Fonts
- **Hierarchy**:
  - Hero headline: 56-72px, weight 800
  - Section titles: 36-48px, weight 700
  - Body: 16-18px, weight 400
  - Captions/muted: 14px, weight 400

### Colors
- **Primary**: Teal `#1ABC9C` (buttons, accents, highlights)
- **Accent**: Yellow `#fdfa64` (badges, highlighted text on dark backgrounds)
- **Background**: White `#FFFFFF`, Light gray `#F7F7F7` (alternating sections)
- **Text**: Near-black `#222222`, Muted gray `#717171`
- **Success**: Green `#00A699`
- **Warning**: Amber `#FFB400`
- **Error/Urgent**: Coral `#FF5A5F`

### Spacing & Components
- **Section padding**: 80-120px vertical
- **Content max-width**: 1280px centered
- **Card radius**: 16px
- **Button radius**: 8px
- **Shadows**: Soft layered `0 2px 4px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.08)`
- **Generous whitespace** throughout

---

## NAVIGATION BAR (Sticky)

- **Logo** (left): "Parking Ticket Pal" with car/ticket icon
- **Nav links** (center): How It Works, Pricing, Blog, FAQ
- **Right side**: "Log In" (ghost button), "Get Started" (teal filled)
- **Scroll behavior**: Transparent on hero → white background with subtle shadow on scroll
- **Mobile**: Hamburger menu with slide-in drawer

**Framer Motion**: Fade in on mount, background opacity transition on scroll

---

## HERO SECTION (Full Viewport - 100dvh)

### Video Background
- Full viewport video background (render as placeholder div with class for video)
- Semi-transparent dark overlay: `linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 100%)`
- Note: Videos will cycle through parking-related scenes (added later)

### Hero Content - Two Column Layout

**LEFT COLUMN (60%)** - Main messaging:

1. **Pre-headline badge** (yellow pill with white text):
   "Over 70% of appeals succeed at tribunal"

2. **Main headline** (white, 56px desktop / 40px mobile, weight 800):
   ```
   Don't pay that
   parking ticket yet
   ```
   - "Don't" has an animated strikethrough line (coral `#FF5A5F`) that draws across
   - "parking ticket" wrapped in yellow (`#fdfa64`) highlight/pill with dark text

3. **Subheadline** (white at 90% opacity, 20px):
   "Upload your ticket, get an AI-powered appeal letter in minutes, and let us handle the paperwork. Works for council PCNs, TfL, and private parking charges."

4. **Benefit pills** (horizontal row, white border pills with check icons):
   - "Council, TfL & Private"
   - "Deadline Tracking"
   - "Auto-Fill Forms"

5. **CTA Buttons** (row):
   - **Primary**: "Upload Your Ticket" (teal bg, white text, camera icon, large)
   - **Secondary**: "See How It Works" (white border, white text, play-circle icon)

6. **App Store Buttons** (row below CTAs):
   - Apple App Store badge
   - Google Play Store badge
   - Style: 80% opacity, brighten on hover, small caption "Also available on mobile"

**RIGHT COLUMN (40%)** - Quick Action Card:

Floating white card with soft shadow:
- **Header**: "Check your ticket in seconds"
- **Two tabs**: "Upload Photo" | "Enter Details" (toggle between)

**Upload Photo tab (default)**:
- Dashed border upload zone (light gray)
- Camera icon centered
- "Drag & drop your ticket or click to upload"
- Supported formats: "JPG, PNG, PDF"

**Enter Details tab**:
- Input field: "PCN Reference Number" (placeholder: "e.g., AB12345678")
- Input field: "Vehicle Registration" (placeholder: "e.g., AB12 CDE")
- Button: "Check My Ticket" (teal, full width)

**Card footer**: "Free to upload. No credit card required."

### Framer Motion Animations
- Left content: Stagger fade-up (y: 30 → 0, opacity: 0 → 1), 100ms delay between elements
- Right card: Slide in from right with spring physics (x: 100 → 0)
- Strikethrough line: Draw animation (scaleX: 0 → 1) with 600ms delay after load
- Benefit pills: Slide up with stagger

---

## LIVE STATS BAR (Animated Counter Section)

Full-width teal (`#1ABC9C`) background section immediately after hero:

**4 stats in responsive grid** (4 cols desktop, 2x2 tablet, stack mobile):

| Stat | Value | Label | Icon |
|------|-------|-------|------|
| 1 | "12,847" | "Tickets Uploaded" | ticket icon |
| 2 | "£2.4M" | "Saved by Drivers" | pound-sign icon |
| 3 | "73%" | "Appeal Success Rate" | chart-line-up icon |
| 4 | "4.9/5" | "App Store Rating" | star icon |

**Framer Motion**:
- Numbers animate counting up from 0 when section enters viewport (useInView hook)
- Spring animation for bouncy feel
- Stagger each stat by 150ms
- Icons have subtle scale pulse on load (1 → 1.1 → 1)

---

## PROBLEM / PAIN POINTS SECTION

**Background**: White

**Section header** (centered):
- Title: "Sound familiar?" (36px, weight 700)
- Subtitle: "You're not alone. Over 8 million parking tickets are issued in the UK every year."

**3 problem cards** (grid: 3 cols desktop, stack mobile):

| # | Icon | Title | Description |
|---|------|-------|-------------|
| 1 | Maze/route icon (coral tint) | "Confusing Appeal Process" | "Different rules for councils, TfL, and private companies. Each has different forms, deadlines, and requirements." |
| 2 | Clock/timer icon (amber tint) | "Tight Deadlines That Double Your Fine" | "Miss 14 days and your fine increases by 50%. Miss 28 days and you lose your right to appeal entirely." |
| 3 | Gavel/scale icon (gray tint) | "Intimidating Legal Paperwork" | "PE2, PE3, TE7, TE9 forms. Order for Recovery. Charge Certificates. It's designed to make you just pay up." |

**Card style**:
- White background, 16px radius, soft shadow
- Colored icon in light circle at top
- Hover: Lift slightly with increased shadow

**Framer Motion**: Cards fade-up and stagger on scroll (150ms delay between)

---

## HOW IT WORKS SECTION

**Background**: Light gray `#F7F7F7`

**Section header** (centered):
- Title: "How Parking Ticket Pal Works"
- Subtitle: "From ticket to appeal in minutes, not hours"

**3 large step cards** connected by dotted line (desktop only):

**Step 1** - Upload icon in teal circle:
- Title: "Upload Your Ticket"
- Description: "Snap a photo of your PCN or upload the PDF. Our AI extracts all the details instantly - PCN number, vehicle reg, contravention code, deadline dates."
- Small visual: Phone with camera icon

**Step 2** - Sparkles/wand icon in teal circle:
- Title: "AI Analyzes & Generates Appeal"
- Description: "We check your ticket against thousands of tribunal cases, calculate your success probability, and generate a legally-sound appeal letter tailored to your specific contravention."
- Small visual: Document with sparkles

**Step 3** - Rocket/send icon in teal circle:
- Title: "We Handle the Paperwork"
- Description: "Download your appeal letter as PDF, or let us auto-submit it directly to the council. We pre-fill all the forms (PE2, PE3, TE7, TE9) and track your case through every stage."
- Small visual: Checkmark with paper plane

**Desktop**: Cards in horizontal row with animated dotted connector line between them
**Mobile**: Vertical stack with vertical connector line

**Framer Motion**:
- Steps reveal sequentially on scroll (stagger 200ms)
- Dotted line draws itself (stroke-dashoffset animation)
- Icons have subtle bounce on reveal

---

## FEATURES DEEP DIVE SECTION

**Background**: White

**Section header** (centered):
- Title: "Everything You Need to Fight Back"

**Bento grid layout** (asymmetric cards):

**Large card (spans 2 columns)** - AI Challenge Letters:
- Icon: Brain/sparkles
- Title: "AI-Powered Challenge Letters"
- Description: "Our AI analyzes your ticket against real tribunal decisions for your specific contravention code. We know what arguments work and write a persuasive appeal letter signed with your signature."
- Visual: Mock letter preview with signature

**Medium card** - Success Prediction:
- Icon: Chart-pie
- Title: "Parking Ticket Power Score"
- Description: "See your chances of winning before you pay. We analyze historical tribunal data to predict your appeal success rate."
- Visual: Circular progress showing "73% likely to succeed"

**Medium card** - Automated Submission:
- Icon: Robot/automation
- Title: "Auto-Submit to 40+ Councils"
- Description: "For supported councils like Lewisham and Horizon Parking authorities, we can submit your challenge directly - no manual form filling needed."
- Badge: "Lewisham, Westminster, TfL + more"

**Medium card** - Form Generation:
- Icon: File-lines
- Title: "Pre-Filled Legal Forms"
- Description: "PE2, PE3, TE7, TE9, N244 - we know what forms you need at each stage and pre-fill them with your details and signature."
- Visual: Stack of form icons

**Medium card** - Deadline Tracking:
- Icon: Bell/calendar
- Title: "Never Miss a Deadline"
- Description: "Email and SMS reminders before your 14-day discount expires, before your appeal window closes, and at every stage of escalation."
- Visual: Timeline with notification bells

**Small card** - Vehicle Management:
- Icon: Car
- Title: "Multi-Vehicle Support"
- Description: "Track tickets across all your vehicles. We auto-detect registration from ticket photos."

**Small card** - Stage Tracking:
- Icon: Timeline/flow
- Title: "Full Lifecycle Tracking"
- Description: "From PCN to Notice to Owner to Bailiff stage - we track every step and tell you exactly what to do next."

**Framer Motion**: Cards fade in with stagger, hover lifts card

---

## PRICING SECTION

**Background**: Light gray `#F7F7F7`

**Section header** (centered):
- Title: "Simple, Pay-Per-Ticket Pricing"
- Subtitle: "No subscriptions. No hidden fees. Only pay when we can help."

**3 pricing cards** (grid):

**FREE** - £0:
- Subtitle: "Track & Organize"
- Features (with check icons):
  - Upload unlimited tickets
  - OCR extraction & auto-fill
  - Deadline tracking dashboard
  - Vehicle management
  - Basic ticket timeline
- CTA: "Get Started Free" (outlined button)
- Note: "No credit card required"

**STANDARD** - £2.99 per ticket:
- **"Most Popular"** badge (teal pill)
- Subtitle: "Full Appeal Package"
- Features:
  - Everything in Free
  - AI-generated challenge letter
  - Success prediction score
  - PDF letter download
  - Email delivery to you
  - Email & SMS reminders
- CTA: "Choose Standard" (teal filled button)
- Card has teal border and slight elevation
- Note: "Money-back if appeal rejected"

**PREMIUM** - £9.99 per ticket:
- Subtitle: "White Glove Service"
- Features:
  - Everything in Standard
  - We submit on your behalf (supported councils)
  - Pre-filled legal forms (PE2, PE3, TE7, TE9)
  - Signature embedding
  - Priority email support
  - Full stage escalation support
- CTA: "Choose Premium" (outlined button)
- Note: "Best for complex cases"

**Below cards**: "Have a fleet? Contact us for business pricing →"

**Framer Motion**: Cards scale slightly on hover, popular card has subtle glow

---

## TESTIMONIALS / SOCIAL PROOF SECTION

**Background**: White

**Header row**:
- Left side: Large "4.9" rating with 5 gold stars, "from 2,847 reviews"
- Right side: Trust badges (Trustpilot logo, App Store logo, Google Play logo) in grayscale

**6 testimonial cards** (2 rows of 3 desktop, carousel on mobile):

Each card contains:
- 5-star rating row (gold stars)
- Quote text (18px, slightly italic)
- Horizontal divider
- Person: Name, Location
- Green success badge: "Saved £XX"
- Timestamp: "X weeks ago"

**Example testimonials**:

1. > "I was about to pay a £130 Westminster fine until I tried this. The AI letter was so professional - they cancelled it in 3 days!"
   - Sarah M., Manchester - **Saved £130** - 2 weeks ago

2. > "The PE3 form was already filled out with my signature. All I had to do was send it. Brilliant."
   - James K., Bristol - **Saved £65** - 1 week ago

3. > "Deadline reminders literally saved me. I had no idea I only had 14 days before it doubled!"
   - Priya S., London - **Saved £110** - 3 weeks ago

4. > "Used it for two TfL tickets. Both cancelled. The tribunal case analysis is genuinely useful."
   - Tom D., Birmingham - **Saved £180** - 1 month ago

5. > "Better than any solicitor and a fraction of the price. The auto-submit feature is magic."
   - Emma L., Leeds - **Saved £70** - 2 weeks ago

6. > "I was skeptical AI could help with legal stuff. The TE7 form it generated was perfect."
   - Michael R., Edinburgh - **Saved £95** - 3 weeks ago

**Framer Motion**: Cards fade in with stagger on scroll, subtle hover lift

---

## SUPPORTED AUTHORITIES SECTION

**Background**: Light gray `#F7F7F7`

**Section header** (centered):
- Title: "Works With 40+ UK Authorities"
- Subtitle: "Council PCNs, TfL, and private parking companies"

**Auto-scrolling logo carousel** (marquee effect):
- Placeholder logos for: Lewisham, Westminster, TfL, Hammersmith & Fulham, Tower Hamlets, Southwark, Lambeth, APCOA, Horizon Parking, UK Parking Control, etc.
- Grayscale logos, colorize on hover
- Continuous horizontal scroll animation

**Below carousel**: "Don't see your council? We support manual appeals for any UK authority."

---

## FAQ SECTION

**Background**: White

**Section header** (centered):
- Title: "Frequently Asked Questions"

**Accordion layout** (8 questions, clean style with +/- icons):

1. **"What types of tickets can you help with?"**
   > We support council PCNs (Penalty Charge Notices), TfL tickets, and private parking charges from companies like APCOA and UK Parking Control. Our system covers 30+ contravention codes across all major UK parking violations.

2. **"How does the AI know my appeal will succeed?"**
   > We've analyzed thousands of real tribunal decisions from London and other UK tribunals. For each contravention code, we know what arguments have worked historically and use that to both predict your success rate and craft your appeal letter.

3. **"What are PE2, PE3, TE7, and TE9 forms?"**
   > These are official appeal forms used at different stages. PE2 is your initial formal representation, PE3 is for appealing a rejection, TE7 is for tribunal appeals, and TE9 is for out-of-time applications. We pre-fill all of these for you.

4. **"Can you actually submit the appeal for me?"**
   > Yes! For supported councils (Lewisham, Horizon Parking authorities, and more), our Premium tier uses browser automation to submit your challenge directly on the council's website. For others, we generate the forms and letters for you to submit.

5. **"What if my appeal fails?"**
   > If your Standard or Premium appeal is rejected and you followed our process, we offer a money-back guarantee. Plus, we'll help you escalate to tribunal (TE7 form) if you want to continue fighting.

6. **"How long does the process take?"**
   > Uploading and generating your appeal letter takes about 2 minutes. Council response times vary from 2 days to 8 weeks depending on the authority.

7. **"Is my data secure?"**
   > Yes. We use bank-level encryption, never share your data with third parties, and comply with UK GDPR. Your ticket images and personal details are stored securely and deleted upon request.

8. **"Do I need to create an account?"**
   > You can upload and analyze a ticket without an account, but you'll need one to save your tickets, track deadlines, and access premium features.

**Framer Motion**: Smooth accordion height animation, icon rotation on expand

---

## NEWSLETTER CTA SECTION

**Background**: Light gray `#F7F7F7`

**Content** (centered, max-width 600px):
- Icon: Envelope with sparkles
- Headline: "Stay ahead of UK parking law changes"
- Subtext: "Get monthly tips, tribunal insights, and success stories. No spam, ever."
- **Input + button row**: Email input field + "Subscribe" button (teal)
- Trust text below: "Join 8,000+ drivers who fight smarter"

---

## FINAL CTA SECTION

**Full-width teal (`#1ABC9C`) background**:

- Headline (white, 40px): "Ready to Fight Your Ticket?"
- Subtext (white/80%): "Most tickets have a 14-day deadline. Don't wait until your fine doubles."
- **Large white button**: "Upload Your Ticket Now" (with camera icon)
- **Secondary row**: App Store + Google Play badges (white/outlined style)

**Framer Motion**: Subtle parallax on scroll, button has gentle pulse animation

---

## FOOTER

**Dark background** (`#1A1A1A`):

**Top section** (4 columns, responsive grid):

**Column 1** - Brand:
- Logo: "Parking Ticket Pal"
- Tagline: "Fight unfair parking tickets with AI"
- App Store badges (stacked, small)

**Column 2** - Product:
- Upload Ticket
- Pricing
- How It Works
- Dashboard

**Column 3** - Resources:
- Blog
- FAQ
- Success Stories
- UK Parking Laws Guide
- Contravention Codes

**Column 4** - Company:
- About Us
- Contact
- Careers
- Press

**Bottom section** (single row):
- Left: Social icons (Twitter/X, Instagram, TikTok, LinkedIn)
- Center: "Made with care in South London"
- Right: © 2024 Parking Ticket Pal · Privacy Policy · Terms of Service

---

## RESPONSIVE BREAKPOINTS

- **Mobile** (<768px): Single column everywhere, hero card stacks below text, carousel for testimonials
- **Tablet** (768-1024px): 2-column grids, reduced spacing
- **Desktop** (>1024px): Full layout as described

---

## KEY FRAMER MOTION PATTERNS

```tsx
// Fade up on scroll (use with useInView)
const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
}

// Stagger children container
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

// Number counting animation (for stats)
// Use framer-motion's useSpring or animate
const countUp = {
  from: 0,
  to: targetNumber,
  duration: 2,
  ease: "easeOut"
}

// Draw line animation (for strikethrough)
const drawLine = {
  hidden: { scaleX: 0, originX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.8, delay: 0.6, ease: "easeInOut" }
  }
}

// Card hover
const cardHover = {
  y: -4,
  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
  transition: { duration: 0.2 }
}
```

---

## IMPORTANT IMPLEMENTATION NOTES

1. All animations should respect `prefers-reduced-motion: reduce`
2. Lazy load sections below the fold
3. Video background placeholder should be a dark gray div with subtle gradient
4. Use semantic HTML throughout (header, main, section, footer)
5. Ensure all interactive elements have visible focus states
6. Forms should have proper validation and loading states
7. Stats numbers should be realistic placeholders that can be swapped for real data
