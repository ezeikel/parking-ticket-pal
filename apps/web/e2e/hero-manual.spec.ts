import { test, expect } from '@playwright/test';
import { generateUniquePcn } from './helpers/db';

test.describe('Guest manual ticket creation (home page)', () => {
  test('enters details manually, completes wizard, and stores data in localStorage', async ({
    page,
  }) => {
    const testPcn = generateUniquePcn();

    // Navigate to home page
    await page.goto('/');

    // Click "Enter details manually" on the hero section
    await page.getByRole('button', { name: /enter details manually/i }).click();

    // --- Step 1: Issuer Type ---
    await expect(page.getByText('Who issued your ticket?')).toBeVisible();
    await page.getByRole('button', { name: /a local council/i }).click();

    // --- Step 2: Stage ---
    await expect(page.getByText('What stage are you at?')).toBeVisible();
    await page.getByRole('button', { name: /initial ticket/i }).click();

    // --- Step 3: Details ---
    await expect(page.getByText('Enter your ticket details')).toBeVisible();

    // Fill PCN
    await page.getByPlaceholder('e.g. WK12345678').fill(testPcn);

    // Fill Vehicle Registration
    await page.getByPlaceholder('e.g. AB12 CDE').fill('XY99ZAB');

    // Fill Issuer - type "Lewisham" and select from dropdown
    const issuerInput = page.getByPlaceholder('e.g. Lewisham, Westminster...');
    await issuerInput.fill('Lewisham');
    await page.getByRole('button', { name: 'Lewisham' }).click();

    // Fill Date - click date picker and select today
    await page.getByRole('button', { name: /pick a date/i }).click();
    const today = new Date();
    const dayText = today.getDate().toString();
    await page
      .locator('[role="gridcell"]')
      .getByRole('button', { name: dayText, exact: true })
      .first()
      .click();

    // Fill Amount
    await page.getByPlaceholder('e.g. 70').fill('65');

    // Fill Location
    const addressInput = page.getByPlaceholder('Start typing an address');
    await addressInput.fill('10 Downing Street');
    await page
      .locator('.mapboxgl-ctrl-geocoder .suggestions li')
      .first()
      .waitFor({ timeout: 10_000 });
    await page
      .locator('.mapboxgl-ctrl-geocoder .suggestions li')
      .first()
      .click();

    // Click Continue to go to Intent step
    await page.getByRole('button', { name: /continue/i }).click();

    // --- Step 4: Intent ---
    await expect(page.getByText('What would you like to do?')).toBeVisible();

    // Select "Just track my ticket"
    await page.getByRole('button', { name: /just track my ticket/i }).click();

    // --- Step 5: Signup ---
    await expect(page.getByText('Create your free account')).toBeVisible();

    // Click "Create Free Account" - this triggers redirect
    await Promise.all([
      page.waitForURL('**/guest/signup**', { timeout: 10_000 }),
      page.getByRole('button', { name: /create free account/i }).click(),
    ]);

    // Verify we're on the signup page
    expect(page.url()).toContain('/guest/signup');

    // Verify localStorage contains the guest ticket data
    const guestData = await page.evaluate(() => {
      const raw = localStorage.getItem('guestTicketData');
      return raw ? JSON.parse(raw) : null;
    });

    expect(guestData).not.toBeNull();
    expect(guestData.pcnNumber).toBe(testPcn);
    expect(guestData.vehicleReg).toBe('XY99ZAB');
    expect(guestData.issuer).toBe('Lewisham');
    expect(guestData.issuerType).toBe('council');
    expect(guestData.ticketStage).toBe('initial');
    expect(guestData.initialAmount).toBe(6500); // £65 = 6500 pence
    expect(guestData.intent).toBe('track');
    expect(guestData.location).toBeTruthy();
    expect(guestData.issuedAt).toBeTruthy();
  });
});
