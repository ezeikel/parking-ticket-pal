# Account Settings Page - V0 Prompt

Design an Airbnb-inspired account settings page for "Parking Ticket Pal."

## Technical Stack
- React/Next.js, Tailwind CSS, FontAwesome Free, shadcn/ui, Framer Motion

## Brand
- Primary: #1ABC9C
- Font: Plus Jakarta Sans

---

## PAGE LAYOUT

- Title: "Account Settings" (32px, 700 weight)
- Two columns (desktop): Nav tabs (20%) | Content (80%)
- Mobile: Horizontal scrolling tab pills at top

---

## NAVIGATION TABS (vertical, left side)

- Profile (default)
- Notifications
- Billing
- Security
- Delete Account

Active: Teal text, light teal background pill.
Icons for each.

---

## PROFILE TAB

**Profile Picture Card**:
- Avatar (120px, circular)
- "Change Photo" button (outlined)
- "Remove" link (muted)

**Personal Information Card**:
Title: "Personal Information"
Form:
- Full Name (input)
- Email (input, "Verified" badge if applicable)
- Phone (optional input)
- "Save Changes" button

**Address Card**:
Title: "Address"
UK format fields:
- Address Line 1
- Address Line 2
- City
- Postcode
- Country (default: United Kingdom)
- "Save Address" button

---

## NOTIFICATIONS TAB

Card with toggle switches:
- Email notifications (master)
- Ticket deadline reminders
- Status updates
- Marketing & tips

Each toggle with label and description (14px, muted).

---

## BILLING TAB

**Current Plan Card**:
- Plan name + price
- Renewal date
- "Change Plan" button
- "Cancel Subscription" link

**Payment Method Card**:
- Card on file: •••• 4242 (Visa icon)
- Expiry date
- "Update Payment Method" button

**Billing History Card**:
Table: Date | Description | Amount | Status | Invoice link

---

## SECURITY TAB

**Connected Accounts Card**:
- Google: Connected/Not connected + Connect/Disconnect button
- Apple: Same

**Sessions Card**:
- List of active sessions
- Device, location, last active
- "Sign Out All Other Sessions" button

---

## DELETE ACCOUNT TAB

Warning card (red border/tint):
- Warning icon
- "Delete Your Account"
- Explanation of what's lost
- "Delete My Account" button (destructive)
- Requires confirmation dialog

---

## ANIMATIONS

- Tab switch: Content crossfade
- Toggle: Smooth slide
- Save: Success checkmark animation
- Form change: Highlight border briefly
