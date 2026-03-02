import { test, expect } from '@playwright/test';
import { generateUniquePcn } from './helpers/db';

test.describe('Guest manual challenge flow (home page)', () => {
  test('enters details manually, selects challenge intent, and redirects to checkout', async ({
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

    // Fill Date - click date picker, go to previous month, select first enabled date
    await page.getByRole('button', { name: /pick a date/i }).click();
    await page.getByRole('button', { name: /previous month/i }).click();
    await page
      .locator('[role="gridcell"]:not([data-disabled]) button')
      .first()
      .click();

    // Fill Amount
    await page.getByPlaceholder('e.g. 70').fill('65');

    // Fill Location - use pressSequentially to trigger geocoder's input events
    const addressInput = page.locator('.mapboxgl-ctrl-geocoder input');
    await addressInput.click();
    await addressInput.pressSequentially('10 Downing Street', { delay: 50 });
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

    // Select "I want to challenge it" (diverges from track flow here)
    await page.getByRole('button', { name: /i want to challenge it/i }).click();

    // --- Step 5: Challenge Reason ---
    await expect(page.getByText('Why do you want to challenge?')).toBeVisible();

    // Select "Unclear / Obscured Signage"
    await page
      .getByRole('button', { name: /unclear \/ obscured signage/i })
      .click();

    // --- Step 6: Result (Score Gate) ---
    await expect(page.getByText("We've analysed your ticket")).toBeVisible();
    await expect(page.getByText('Challenge Success Score')).toBeVisible();
    await expect(page.getByText('Challenge Letter Ready')).toBeVisible();
    await expect(page.getByText('Locked')).toBeVisible();
    // Verify the upgrade CTA button contains both price and label
    const upgradeCta = page.getByRole('button', {
      name: /£14\.99 Upgrade to Premium/i,
    });
    await expect(upgradeCta).toBeVisible();

    // Click "Upgrade to Premium" - triggers redirect to /checkout
    await upgradeCta.click();
    await page.waitForURL('**/checkout**', { timeout: 10_000 });

    // Verify URL
    expect(page.url()).toContain('/checkout');

    // Verify localStorage contains the guest ticket data with challenge fields
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
    expect(guestData.intent).toBe('challenge');
    expect(guestData.challengeReason).toBe('signage');
    expect(guestData.tier).toBe('premium');
    expect(guestData.location).toBeTruthy();
    expect(guestData.issuedAt).toBeTruthy();
  });
});
