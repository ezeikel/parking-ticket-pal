# V0 Design Prompts

Airbnb-inspired redesign prompts for Parking Ticket Pal. Copy the contents of each file directly into [v0.dev](https://v0.dev).

## Prompts

| # | File | Page |
|---|------|------|
| 1 | `01-landing-page.md` | Homepage/Landing |
| 2 | `02-dashboard.md` | User Dashboard |
| 3 | `03-tickets-list.md` | Tickets List (with map) |
| 4 | `04-ticket-detail.md` | Single Ticket View |
| 5 | `05-vehicles.md` | Vehicles Management |
| 6 | `06-pricing.md` | Pricing Page |
| 7 | `07-blog-index.md` | Blog Listing |
| 8 | `08-blog-post.md` | Blog Article |
| 9 | `09-sign-in.md` | Authentication |
| 10 | `10-account-settings.md` | Account Settings |
| 11 | `11-upload-flow.md` | Upload Ticket/Letter Flow |
| 12 | `12-letter-detail.md` | Letter Detail View |

## Design System

- **Font**: Plus Jakarta Sans (Google Fonts)
- **Primary**: #1ABC9C (teal)
- **Accent**: #fdfa64 (yellow)
- **Cards**: 16px radius, soft shadows
- **Buttons**: 8px radius

## Post-V0 Tasks

After generating each component:

1. **Icons**: Replace FontAwesome Free with Pro variants
2. **Maps**: Integrate with existing Mapbox setup
3. **Animations**: Wire up Framer Motion
4. **Components**: Export to `apps/web/components/`

## Recommended Order

1. Landing Page (sets the tone)
2. Sign In (first auth touchpoint)
3. Dashboard (core experience)
4. Upload Flow (critical conversion point)
5. Tickets List (main feature)
6. Ticket Detail
7. Letter Detail
8. Vehicles
9. Pricing
10. Account Settings
11. Blog Index
12. Blog Post
