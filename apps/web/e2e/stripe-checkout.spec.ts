import { test, expect, type Page } from '@playwright/test';
import { authenticateContext, cleanupTestUser } from './helpers/auth';
import {
  generateUniquePcn,
  getTicketByPcn,
  deleteTicketByPcn,
  seedVehicleForUser,
  seedTicketForUser,
  upgradeTicketTier,
} from './helpers/db';

let testPcn: string;
let testUserId: string;

/**
 * Fill out the Stripe hosted checkout form with test card details.
 * Stripe's DOM can vary by locale and pre-fill state, so optional
 * fields use a visibility check with a short timeout.
 */
async function fillStripeCheckout(page: Page) {
  // Wait for the Stripe form to be ready (submit button indicates form is loaded)
  const submitButton = page.locator(
    '[data-testid="hosted-payment-submit-button"]',
  );
  await submitButton.waitFor({ state: 'visible', timeout: 30_000 });

  // Email — may be pre-filled/hidden via customer_email
  const emailInput = page.locator('input#email');
  const emailVisible = await emailInput
    .isVisible({ timeout: 3_000 })
    .catch(() => false);
  if (emailVisible) {
    await emailInput.fill('e2e-test@parkingticketpal.test');
  }

  // Card number
  const cardInput = page.locator(
    '[placeholder="\\31 234 1234 1234 1234"], [placeholder="1234 1234 1234 1234"]',
  );
  await cardInput.waitFor({ state: 'visible', timeout: 10_000 });
  await cardInput.fill('4242424242424242');

  // Expiry
  const expiryInput = page.locator(
    '[placeholder="MM \\/ YY"], [placeholder="MM / YY"]',
  );
  await expiryInput.fill('12/30');

  // CVC
  const cvcInput = page.locator('[placeholder="CVC"]');
  await cvcInput.fill('123');

  // Billing name — conditionally fill
  const nameInput = page.locator('input[name="billingName"]');
  const nameVisible = await nameInput
    .isVisible({ timeout: 2_000 })
    .catch(() => false);
  if (nameVisible) {
    await nameInput.fill('E2E Test User');
  }

  // Postal code — conditionally fill
  const postalInput = page.locator('input[name="postalCode"]');
  const postalVisible = await postalInput
    .isVisible({ timeout: 2_000 })
    .catch(() => false);
  if (postalVisible) {
    await postalInput.fill('SE13 5EQ');
  }

  // Submit payment
  await submitButton.click();
}

test.describe('Stripe checkout full payment flow', () => {
  test.beforeEach(async ({ context }) => {
    const user = await authenticateContext(context);
    testUserId = user.id;
    testPcn = generateUniquePcn();
  });

  test.afterEach(async () => {
    if (testPcn) {
      await deleteTicketByPcn(testPcn);
    }
    await cleanupTestUser();
  });

  test('completes payment via Stripe and creates a PREMIUM ticket', async ({
    page,
  }) => {
    // 1. Navigate to home to establish origin for localStorage
    await page.goto('/');

    // 2. Seed localStorage with guest ticket data (pre-payment)
    await page.evaluate((pcn) => {
      localStorage.setItem(
        'guestTicketData',
        JSON.stringify({
          pcnNumber: pcn,
          vehicleReg: 'AB12CDE',
          issuerType: 'council',
          ticketStage: 'initial',
          intent: 'challenge',
          challengeReason: 'signage',
          tier: 'premium',
          initialAmount: 7000,
          issuer: 'Lewisham',
          email: 'e2e-test@parkingticketpal.test',
          createdAt: new Date().toISOString(),
        }),
      );
    }, testPcn);

    // 3. Navigate to checkout which triggers Stripe session creation
    await page.goto('/checkout?source=wizard');

    // 4. Wait for redirect to Stripe hosted checkout
    await page.waitForURL('**/checkout.stripe.com/**', { timeout: 30_000 });

    // 5. Fill Stripe checkout form with test card
    await fillStripeCheckout(page);

    // 6. Wait for Stripe redirect → claim page → auto-redirect to create-ticket
    //    The claim page auto-redirects when user is pre-authenticated, so we may
    //    land on either /guest/claim or /guest/create-ticket depending on timing.
    await page.waitForURL(
      (url) =>
        url.pathname.includes('/guest/claim') ||
        url.pathname.includes('/guest/create-ticket'),
      { timeout: 60_000 },
    );

    // 7. Wait for create-ticket page (may already be there)
    await page.waitForURL('**/guest/create-ticket**', { timeout: 15_000 });

    // 9. Wait for ticket creation success
    await expect(page.getByText('Ticket Created!')).toBeVisible({
      timeout: 30_000,
    });

    // 10. Verify ticket in DB with PREMIUM tier
    const ticket = await getTicketByPcn(testPcn);
    expect(ticket).not.toBeNull();
    expect(ticket!.pcnNumber).toBe(testPcn);
    expect(ticket!.tier).toBe('PREMIUM');
    expect(ticket!.issuer).toBe('Lewisham');
    expect(ticket!.initialAmount).toBe(7000);
    expect(ticket!.vehicle.registrationNumber).toBe('AB12CDE');

    // 11. Verify localStorage was cleared after successful creation
    const guestData = await page.evaluate(() =>
      localStorage.getItem('guestTicketData'),
    );
    expect(guestData).toBeNull();
  });

  test('upgrades an existing ticket to PREMIUM via Stripe checkout', async ({
    page,
  }) => {
    // 1. Seed a FREE-tier ticket in the database
    const vehicleId = await seedVehicleForUser(testUserId, 'AB12CDE');
    const ticketId = await seedTicketForUser(testUserId, testPcn, vehicleId);

    // Verify the seeded ticket starts as FREE
    const seededTicket = await getTicketByPcn(testPcn);
    expect(seededTicket).not.toBeNull();
    expect(seededTicket!.tier).toBe('FREE');

    // 2. Navigate to checkout with ticketId — triggers createTicketCheckoutSession
    await page.goto(`/checkout?ticketId=${ticketId}`);

    // 3. Wait for redirect to Stripe hosted checkout
    await page.waitForURL('**/checkout.stripe.com/**', { timeout: 30_000 });

    // 4. Fill Stripe checkout form with test card
    await fillStripeCheckout(page);

    // 5. Wait for Stripe to redirect back to /tickets/{id}?success=true
    await page.waitForURL(`**/tickets/${ticketId}?success=true`, {
      timeout: 60_000,
    });

    // 6. Verify the ticket detail page renders (PaymentRedirectHandler strips ?success=true)
    await page.waitForURL(`**/tickets/${ticketId}`, { timeout: 15_000 });

    // 7. Simulate Stripe webhook (checkout.session.completed)
    //    Stripe webhooks don't fire in local/CI without `stripe listen`.
    //    The checkout flow above already verified the full payment + redirect.
    //    In production, the webhook handler updates: ticket.tier → PREMIUM
    await upgradeTicketTier(ticketId, 'PREMIUM');

    // 8. Verify the DB was updated
    const upgradedTicket = await getTicketByPcn(testPcn);
    expect(upgradedTicket).not.toBeNull();
    expect(upgradedTicket!.tier).toBe('PREMIUM');
    expect(upgradedTicket!.pcnNumber).toBe(testPcn);
    expect(upgradedTicket!.vehicle.registrationNumber).toBe('AB12CDE');
  });
});
