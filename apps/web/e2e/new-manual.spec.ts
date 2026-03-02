import { test, expect } from '@playwright/test';
import { authenticateContext, cleanupTestUser } from './helpers/auth';
import {
  generateUniquePcn,
  getTicketByPcn,
  deleteTicketByPcn,
} from './helpers/db';

let testPcn: string;

test.describe('Authenticated manual ticket creation (/new)', () => {
  test.beforeEach(async ({ context }) => {
    await authenticateContext(context);
    testPcn = generateUniquePcn();
  });

  test.afterEach(async () => {
    // Clean up test ticket from DB
    if (testPcn) {
      await deleteTicketByPcn(testPcn);
    }
    await cleanupTestUser();
  });

  test('creates a ticket via manual entry wizard and saves to DB', async ({
    page,
  }) => {
    // Navigate to /new
    await page.goto('/new');
    await expect(page.getByText('Add Your Document')).toBeVisible();

    // Click "Enter details manually"
    await page.getByRole('button', { name: /enter details manually/i }).click();

    // --- Step 1: Issuer Type ---
    await expect(page.getByText('Who issued your ticket?')).toBeVisible();
    // Select "Council"
    await page.getByRole('button', { name: /a local council/i }).click();

    // --- Step 2: Stage ---
    await expect(page.getByText('What stage are you at?')).toBeVisible();
    // Select "Initial Ticket"
    await page.getByRole('button', { name: /initial ticket/i }).click();

    // --- Step 3: Details ---
    await expect(page.getByText('Enter your ticket details')).toBeVisible();

    // Fill PCN
    await page.getByPlaceholder('e.g. WK12345678').fill(testPcn);

    // Fill Vehicle Registration
    await page.getByPlaceholder('e.g. AB12 CDE').fill('AB12CDE');

    // Fill Issuer - type "Lewisham" and select from dropdown
    const issuerInput = page.getByPlaceholder('e.g. Lewisham, Westminster...');
    await issuerInput.fill('Lewisham');
    // Wait for dropdown and click the option
    await page.getByRole('button', { name: 'Lewisham' }).click();

    // Fill Date - click date picker, go to previous month, select first enabled date
    await page.getByRole('button', { name: /pick a date/i }).click();
    await page.getByRole('button', { name: /previous month/i }).click();
    await page
      .locator('[role="gridcell"]:not([data-disabled]) button')
      .first()
      .click();

    // Fill Amount
    await page.getByPlaceholder('e.g. 70').fill('70');

    // Fill Location - use pressSequentially to trigger geocoder's input events
    const addressInput = page.locator('.mapboxgl-ctrl-geocoder input');
    await addressInput.click();
    await addressInput.pressSequentially('10 Downing Street', { delay: 50 });
    // Wait for Mapbox suggestions and select the first one
    await page
      .locator('.mapboxgl-ctrl-geocoder .suggestions li')
      .first()
      .waitFor({ timeout: 10_000 });
    await page
      .locator('.mapboxgl-ctrl-geocoder .suggestions li')
      .first()
      .click();

    // Submit - click "Add Ticket"
    const addTicketButton = page.getByRole('button', { name: /add ticket/i });
    await expect(addTicketButton).toBeEnabled();
    await addTicketButton.click();

    // Wait for success state
    await expect(page.getByText('Ticket Added!')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(testPcn)).toBeVisible();

    // Verify ticket exists in DB
    const ticket = await getTicketByPcn(testPcn);
    expect(ticket).not.toBeNull();
    expect(ticket!.pcnNumber).toBe(testPcn);
    expect(ticket!.issuer).toBe('Lewisham');
    expect(ticket!.issuedAt).toBeTruthy();
    expect(ticket!.initialAmount).toBe(7000); // £70 = 7000 pence
    expect(ticket!.location).toBeTruthy();
    expect(ticket!.vehicle.registrationNumber).toBe('AB12CDE');
  });
});
