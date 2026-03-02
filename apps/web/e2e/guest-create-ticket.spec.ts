import { test, expect } from '@playwright/test';
import { authenticateContext, cleanupTestUser } from './helpers/auth';
import {
  generateUniquePcn,
  getTicketByPcn,
  deleteTicketByPcn,
} from './helpers/db';

let testPcn: string;

test.describe('Post-payment guest ticket creation', () => {
  test.beforeEach(async ({ context }) => {
    await authenticateContext(context);
    testPcn = generateUniquePcn();
  });

  test.afterEach(async () => {
    if (testPcn) {
      await deleteTicketByPcn(testPcn);
    }
    await cleanupTestUser();
  });

  test('creates a PREMIUM ticket from seeded localStorage after payment', async ({
    page,
  }) => {
    // Navigate to home first to establish origin for localStorage
    await page.goto('/');

    // Seed localStorage with guest ticket data (simulating completed payment)
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
          paymentCompleted: true,
          createdAt: new Date().toISOString(),
        }),
      );
    }, testPcn);

    // Navigate to the guest create-ticket page
    await page.goto('/guest/create-ticket');

    // Wait for ticket creation success
    await expect(page.getByText('Ticket Created!')).toBeVisible({
      timeout: 30_000,
    });

    // Verify ticket exists in DB with PREMIUM tier
    const ticket = await getTicketByPcn(testPcn);
    expect(ticket).not.toBeNull();
    expect(ticket!.pcnNumber).toBe(testPcn);
    expect(ticket!.tier).toBe('PREMIUM');
    expect(ticket!.issuer).toBe('Lewisham');
    expect(ticket!.initialAmount).toBe(7000); // 7000 pence
    expect(ticket!.vehicle.registrationNumber).toBe('AB12CDE');

    // Verify localStorage was cleared after successful creation
    const guestData = await page.evaluate(() =>
      localStorage.getItem('guestTicketData'),
    );
    expect(guestData).toBeNull();
  });
});
