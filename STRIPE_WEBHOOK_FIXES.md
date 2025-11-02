# Stripe Webhook Fixes Summary

## Issues Fixed

### 1. ✅ Subscription Creation Bug
**Problem:** Webhooks were using `updateMany` instead of `upsert`, which would fail if no subscription existed.

**Fix:** Changed all subscription operations to use `upsert` to properly create subscriptions on first purchase:
```typescript
await db.subscription.upsert({
  where: { userId: user.id },
  create: { /* ... */ },
  update: { /* ... */ },
});
```

### 2. ✅ Missing `source` Field
**Problem:** Stripe webhooks weren't setting `source: STRIPE` on subscription records.

**Fix:** All subscription upserts now include:
```typescript
source: SubscriptionSource.STRIPE,
```

### 3. ✅ Missing `stripeSubscriptionId`
**Problem:** Stripe subscription ID wasn't being stored in the database.

**Fix:** Now storing the Stripe subscription ID:
```typescript
stripeSubscriptionId: createdCustomerSubscription.id,
```

### 4. ✅ Hardcoded PREMIUM Type
**Problem:** All subscriptions were hardcoded to `PREMIUM`, ignoring `STANDARD` tier purchases.

**Fix:** Added helper function `getSubscriptionTierFromPriceId()` that checks the actual Stripe price ID to determine if it's STANDARD or PREMIUM:
```typescript
const priceId = subscription.items.data[0]?.price?.id;
if (priceId) {
  const tierFromPrice = getSubscriptionTierFromPriceId(priceId);
  if (tierFromPrice === 'STANDARD') {
    type = SubscriptionType.STANDARD;
  } else if (tierFromPrice === 'PREMIUM') {
    type = SubscriptionType.PREMIUM;
  }
}
```

### 5. ✅ Inconsistent User Lookups
**Problem:** Mixed use of `updateMany` and direct user lookups.

**Fix:** Standardized to:
- Find user first with `findUnique`
- Use user.id for upserts
- Return early if user not found

## Files Modified

### 1. [`apps/web/constants/stripe.ts`](apps/web/constants/stripe.ts)
Added new helper function:
```typescript
export const getSubscriptionTierFromPriceId = (priceId: string): 'STANDARD' | 'PREMIUM' | null
```

### 2. [`apps/web/app/api/payment/webhook/route.ts`](apps/web/app/api/payment/webhook/route.ts)
Updated all subscription-related webhook handlers:
- `checkout.session.completed` (subscription payments)
- `customer.subscription.created`
- `customer.subscription.updated`

## What Still Works

✅ **Ticket Tier Upgrades** - One-time purchases continue to work correctly
✅ **Subscription Cancellation** - `customer.subscription.deleted` handler unchanged
✅ **Stripe Customer ID Storage** - Still properly stored on User model

## Testing Checklist

After deploying these changes, test:

- [ ] New STANDARD subscription purchase → creates subscription with `type: STANDARD, source: STRIPE`
- [ ] New PREMIUM subscription purchase → creates subscription with `type: PREMIUM, source: STRIPE`
- [ ] Existing subscription renewal → maintains correct type
- [ ] Subscription upgrade (STANDARD → PREMIUM) → updates type correctly
- [ ] Subscription cancellation → deletes subscription record
- [ ] Per-ticket upgrade → still updates `Ticket.tier` correctly

## Database Migration

Before deploying, ensure the Prisma migration has been run:
```bash
cd apps/web
pnpm dlx prisma migrate deploy
```

This adds:
- `Subscription.source` field (STRIPE | REVENUECAT)
- `Subscription.stripeSubscriptionId` field
- `Subscription.revenueCatSubscriptionId` field
- `User.revenueCatCustomerId` field

## Backward Compatibility

The fixes maintain backward compatibility:
- Defaults to `PREMIUM` if price ID detection fails
- Falls back to metadata `subscriptionType` if available
- Existing subscriptions will be updated on next webhook event
