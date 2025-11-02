# RevenueCat In-App Purchases Setup Guide

This guide explains how to configure and use RevenueCat for in-app purchases in the Parking Ticket Pal mobile app.

## Table of Contents

1. [Overview](#overview)
2. [RevenueCat Dashboard Configuration](#revenuecat-dashboard-configuration)
3. [Environment Variables](#environment-variables)
4. [Products & Entitlements](#products--entitlements)
5. [Testing](#testing)
6. [Production Deployment](#production-deployment)

---

## Overview

The app uses RevenueCat for mobile in-app purchases (iOS App Store & Google Play), while Stripe continues to handle web subscriptions. Both systems sync to the same backend database.

**Architecture:**
- **Mobile:** RevenueCat SDK → Apple/Google Stores → RevenueCat Webhooks → Backend
- **Web:** Stripe Checkout → Stripe Webhooks → Backend
- **Source of Truth:** PostgreSQL database (Subscription model with `source` field)

---

## RevenueCat Dashboard Configuration

### 1. Create RevenueCat Account & Project

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Create a new project: **Parking Ticket Pal**
3. Add iOS and Android apps with bundle/package IDs:
   - iOS: `com.chewybytes.parkingticketpal.app`
   - Android: `com.chewybytes.parkingticketpal.app`

### 2. Configure Products

Create 6 products in RevenueCat:

#### Non-Consumables (One-Time Purchases)
| Product ID | Type | Price | Description |
|------------|------|-------|-------------|
| `standard_ticket_v1` | Non-Consumable | £2.99 | Ticket Standard - Email + SMS reminders, timeline tracking, and document storage for one ticket |
| `premium_ticket_v1` | Non-Consumable | £9.99 | Ticket Premium - Everything in Standard plus AI-generated appeal letters, success prediction, and automatic challenge submission |

**Note:** Version suffixes (`_v1`, `_v2`, etc.) allow for product updates if Apple rejects the original. Product IDs cannot be reused after rejection.

#### Subscriptions (Auto-Renewable)
| Product ID | Type | Price | Description |
|------------|------|--------|-------------|
| `standard_sub_monthly_v1` | Subscription | £6.99/month | Track up to 5 tickets/month with reminders, document storage, and progress tracking (fair use applies) |
| `standard_sub_yearly_v1` | Subscription | £69.99/year | Same as Standard Monthly, billed yearly (save £13.89) |
| `premium_sub_monthly_v1` | Subscription | £14.99/month | Manage up to 10 tickets/month with full AI support, appeal generation, and auto-submission (fair use applies) |
| `premium_sub_yearly_v1` | Subscription | £149.99/year | Same as Premium Monthly, billed yearly (save £29.89) |

**Note:** Each subscription duration (monthly/yearly) requires a separate Product ID in App Store Connect and Google Play Console.

### 3. Create Entitlements

Create two entitlements to manage subscription access:

| Entitlement ID | Products |
|----------------|----------|
| `standard_access` | `standard_sub_monthly_v1`, `standard_sub_yearly_v1` |
| `premium_access` | `premium_sub_monthly_v1`, `premium_sub_yearly_v1` |

### 4. Configure Offerings

Create a default offering that includes all products:
- Name: **Default**
- Packages:
  - Standard Monthly (`standard_sub_monthly_v1`)
  - Standard Yearly (`standard_sub_yearly_v1`)
  - Premium Monthly (`premium_sub_monthly_v1`)
  - Premium Yearly (`premium_sub_yearly_v1`)
  - Standard Ticket Upgrade (`standard_ticket_v1`)
  - Premium Ticket Upgrade (`premium_ticket_v1`)

### 5. Connect to App Stores

#### iOS (App Store Connect)
1. In RevenueCat Dashboard → iOS App → Configuration
2. Add App Store Connect API Key (create in ASC if needed)
3. Link your app's bundle ID
4. Create the 4 products in App Store Connect matching the IDs above

#### Android (Google Play Console)
1. In RevenueCat Dashboard → Android App → Configuration
2. Add Google Play Service Account JSON key
3. Link your app's package name
4. Create the 4 products in Google Play Console matching the IDs above

### 6. Configure Webhooks

1. Go to RevenueCat Dashboard → Integrations → Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/revenuecat`
3. Generate a webhook secret and save it (you'll need this for `REVENUECAT_WEBHOOK_SECRET`)
4. Select events to send:
   - ✅ INITIAL_PURCHASE
   - ✅ RENEWAL
   - ✅ CANCELLATION
   - ✅ UNCANCELLATION
   - ✅ NON_RENEWING_PURCHASE
   - ✅ EXPIRATION
   - ✅ PRODUCT_CHANGE
   - ✅ BILLING_ISSUE

---

## Environment Variables

### Backend (apps/web/.env.local)

```env
# RevenueCat API Key (found in RevenueCat Dashboard → API Keys)
REVENUECAT_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# RevenueCat Webhook Secret (from Webhooks integration setup)
REVENUECAT_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Pricing multiplier for mobile (if showing "Apple tax" messaging)
PRICING_MOBILE_MULTIPLIER=1.0
```

### Mobile App (apps/mobile/.env.local or EAS Secrets)

```env
# RevenueCat API Keys (Public keys from RevenueCat Dashboard)
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_xxxxxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_xxxxxxxxxxxxxxxx
```

#### Setting Environment Variables for EAS Builds

For production builds via EAS, set secrets using the CLI:

```bash
cd apps/mobile

# iOS Key
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_API_KEY_IOS --value appl_xxx --type string

# Android Key
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID --value goog_xxx --type string
```

Or add them in EAS Dashboard → Project → Secrets.

---

## Products & Entitlements

### Product Flow

#### Subscription Purchase Flow
1. User taps "Subscribe" or "Upgrade" button
2. `PaywallModal` appears with RevenueCat's paywall UI
3. User selects a plan (Standard or Premium, Monthly or Yearly)
4. Purchase completes → RevenueCat webhook fires
5. Backend receives webhook → updates `Subscription` table with:
   - `source: REVENUECAT`
   - `type: STANDARD | PREMIUM`
   - `revenueCatSubscriptionId: <transaction_id>`
6. User now has global access to upgraded features

#### Non-Consumable Purchase Flow (Ticket Upgrades)
1. User taps "Upgrade Ticket" button on a FREE ticket
2. `PaywallModal` appears with ticket upgrade options
3. User purchases `standard_ticket_v1` or `premium_ticket_v1` (non-consumable)
4. Mobile app calls `/api/iap/confirm-purchase` with `ticketId` and `productId`
5. Backend verifies purchase with RevenueCat REST API
6. Backend updates `Ticket.tier` to STANDARD or PREMIUM
7. Ticket now has upgraded features permanently

### Entitlement Hierarchy

| Access Level | Entitlement | Features |
|--------------|-------------|----------|
| Free (Ticket) | None | Basic ticket viewing |
| Standard (Ticket) | Per-ticket upgrade | Email + SMS reminders, timeline tracking, document storage |
| Premium (Ticket) | Per-ticket upgrade | Everything in Standard + AI-generated appeal letters, success prediction, automatic challenge submission |
| Standard (Subscription) | `standard_access` | Track up to 5 tickets/month with reminders, document storage, and progress tracking (fair use applies) |
| Premium (Subscription) | `premium_access` | Manage up to 10 tickets/month with full AI support, appeal generation, and auto-submission (fair use applies) |

### Access Logic

The app determines feature access using this priority:
1. **Active Subscription (either source)** → Global unlock based on subscription type
2. **Ticket Tier** → Individual ticket upgrade (STANDARD/PREMIUM)
3. **Free** → Limited features

Implemented in:
- Backend: [`apps/web/lib/subscription.ts`](apps/web/lib/subscription.ts)
- Mobile: [`apps/mobile/contexts/purchases.tsx`](apps/mobile/contexts/purchases.tsx)

---

## Testing

### Sandbox Testing

#### iOS (TestFlight/Simulator)
1. Create a Sandbox Apple ID in App Store Connect
2. Sign out of production Apple ID in Settings → App Store
3. When making a purchase, use the sandbox Apple ID
4. Test purchases are free and subscriptions renew quickly (1 hour = 5 minutes)

#### Android (Internal Testing Track)
1. Add test Google accounts in Play Console → Setup → License testing
2. Install app from Internal Testing track
3. Purchases will be free for test accounts

### Testing Checklist

- [ ] Standard subscription purchase
- [ ] Premium subscription purchase
- [ ] Standard ticket upgrade (consumable)
- [ ] Premium ticket upgrade (consumable)
- [ ] Subscription renewal
- [ ] Subscription cancellation
- [ ] Subscription upgrade (Standard → Premium)
- [ ] Restore purchases (after reinstalling app)
- [ ] Prevent duplicate subscriptions (user has Stripe sub, tries to buy mobile)
- [ ] Webhook receives all events and updates DB correctly

### Useful Testing Commands

```bash
# Check user's subscription status in database
npx prisma studio
# Navigate to User → find user → check subscription relation

# Check RevenueCat customer info via API
curl -X GET \
  https://api.revenuecat.com/v1/subscribers/<USER_ID> \
  -H "Authorization: Bearer $REVENUECAT_API_KEY"

# Trigger test webhook
curl -X POST https://your-domain.com/api/webhooks/revenuecat \
  -H "Content-Type: application/json" \
  -H "X-RevenueCat-Signature: test-signature" \
  -d '{...webhook_payload...}'
```

---

## Production Deployment

### 1. Database Migration

Run the Prisma migration to add RevenueCat fields:

```bash
cd apps/web
pnpm dlx prisma migrate deploy
```

This adds:
- `User.revenueCatCustomerId`
- `Subscription.revenueCatSubscriptionId`
- `Subscription.source` enum (STRIPE | REVENUECAT)

### 2. Deploy Backend

Ensure environment variables are set in your hosting platform (Vercel, etc.):
- `REVENUECAT_API_KEY`
- `REVENUECAT_WEBHOOK_SECRET`

### 3. Deploy Mobile App

#### iOS
```bash
cd apps/mobile
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

#### Android
```bash
cd apps/mobile
eas build --platform android --profile production
eas submit --platform android --profile production
```

### 4. Update Webhook URL

Once backend is deployed, update the webhook URL in RevenueCat Dashboard to your production domain.

### 5. Monitoring

Monitor the following:
- RevenueCat Dashboard → Customers → Recent Events
- Backend logs for webhook events (`[RevenueCat Webhook]` prefix)
- Sentry for errors in purchase flow
- PostHog events: `restore_purchases_tapped`, `subscription_upgraded`, etc.

---

## Key Files Reference

### Backend
- [`apps/web/lib/revenuecat.ts`](apps/web/lib/revenuecat.ts) - RevenueCat REST API client
- [`apps/web/lib/subscription.ts`](apps/web/lib/subscription.ts) - Unified subscription logic
- [`apps/web/app/api/iap/confirm-purchase/route.ts`](apps/web/app/api/iap/confirm-purchase/route.ts) - Consumable purchase verification
- [`apps/web/app/api/webhooks/revenuecat/route.ts`](apps/web/app/api/webhooks/revenuecat/route.ts) - Webhook handler
- [`apps/web/prisma/schema.prisma`](apps/web/prisma/schema.prisma) - Database schema

### Mobile
- [`apps/mobile/contexts/purchases.tsx`](apps/mobile/contexts/purchases.tsx) - RevenueCat SDK integration
- [`apps/mobile/contexts/auth.tsx`](apps/mobile/contexts/auth.tsx) - Auth + RC user identification
- [`apps/mobile/components/PaywallModal.tsx`](apps/mobile/components/PaywallModal.tsx) - Paywall UI
- [`apps/mobile/components/UpgradeButton.tsx`](apps/mobile/components/UpgradeButton.tsx) - Subscription button
- [`apps/mobile/components/TicketUpgradeButton.tsx`](apps/mobile/components/TicketUpgradeButton.tsx) - Per-ticket upgrade
- [`apps/mobile/app/(authenticated)/(tabs)/settings.tsx`](apps/mobile/app/(authenticated)/(tabs)/settings.tsx) - Settings with subscription management

---

## Troubleshooting

### "No offerings available"
- Check RevenueCat API keys in `.env.local`
- Verify offerings are configured in RevenueCat Dashboard
- Check mobile app logs for SDK initialization errors

### Purchases not syncing to backend
- Verify webhook URL is correct in RevenueCat Dashboard
- Check webhook secret matches `REVENUECAT_WEBHOOK_SECRET`
- Review backend logs for webhook errors
- Test webhook manually using cURL

### User has Stripe subscription but mobile still shows paywall
- Check user's `subscription.source` field in database
- Verify `canPurchaseMobileSubscription()` logic in `lib/subscription.ts`
- Check mobile app properly fetches user data from `/api/me`

### Restore purchases not working
- Ensure user is signed in with same Apple/Google account
- Check user ID matches between app and RevenueCat (`Purchases.logIn()` called)
- Verify `revenueCatCustomerId` stored in database

---

## Support

For RevenueCat-specific issues, see:
- [RevenueCat Documentation](https://docs.revenuecat.com)
- [RevenueCat Community](https://community.revenuecat.com)

For app-specific issues:
- Check Sentry for errors
- Review CloudWatch/Vercel logs for backend issues
- Contact development team
