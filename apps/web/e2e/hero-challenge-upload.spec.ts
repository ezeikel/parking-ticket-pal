import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'ticket-council-1.jpg');

const hasFixture = fs.existsSync(FIXTURE_PATH);

test.describe('Guest upload challenge flow (home page)', () => {
  test.skip(
    !hasFixture,
    'Skipping: ticket fixture image not found. Add ticket-council-1.jpg to e2e/fixtures/',
  );

  test('uploads ticket image via hero, OCR pre-fills wizard, selects challenge, and redirects to checkout', async ({
    page,
  }) => {
    // Navigate to home page
    await page.goto('/');

    // Upload ticket image via the hero file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE_PATH);

    // Wait for OCR processing to complete - confirm step should appear
    await expect(page.getByText('Confirm your details')).toBeVisible({
      timeout: 90_000, // OCR can take a while
    });

    // Verify OCR extracted data badge
    await expect(
      page.getByText('Details extracted from your photo'),
    ).toBeVisible();

    // Check PCN was extracted (non-empty)
    const pcnInput = page
      .getByText('PCN Reference')
      .locator('..')
      .getByRole('textbox');
    await expect(pcnInput).toBeVisible({ timeout: 5_000 });
    const pcnValue = await pcnInput.inputValue();
    expect(pcnValue.length).toBeGreaterThan(0);

    // Ensure vehicle registration has a value
    const vehicleRegInput = page
      .getByText('Vehicle Registration')
      .locator('..')
      .getByRole('textbox');
    const regValue = await vehicleRegInput.inputValue();
    if (!regValue) {
      await vehicleRegInput.fill('AB12CDE');
    }

    // Ensure issuer is filled
    const issuerInput = page.getByPlaceholder(
      /e\.g\. Lewisham|search for issuer/i,
    );
    const issuerValue = await issuerInput.inputValue();
    if (!issuerValue || issuerValue.length < 2) {
      await issuerInput.fill('Lewisham');
      await page.getByRole('button', { name: 'Lewisham' }).click();
    }

    // Ensure date is filled
    const dateButton = page.getByRole('button', { name: /pick a date/i });
    if ((await dateButton.count()) > 0) {
      const dateText = await dateButton.textContent();
      if (dateText?.includes('Pick a date')) {
        await dateButton.click();
        await page.getByRole('button', { name: /previous month/i }).click();
        await page
          .locator('[role="gridcell"]:not([data-disabled]) button')
          .first()
          .click();
      }
    }

    // Ensure amount is filled
    const amountInput = page.getByPlaceholder('e.g. 70');
    const amountValue = await amountInput.inputValue();
    if (!amountValue) {
      await amountInput.fill('70');
    }

    // Ensure location is filled - use pressSequentially to trigger geocoder events
    const addressPlaceholder = page.getByPlaceholder('Start typing an address');
    const addressValue = await addressPlaceholder.inputValue();
    if (!addressValue) {
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
    }

    // Click Continue to go to Intent step
    await page.getByRole('button', { name: /continue/i }).click();

    // --- Intent step ---
    await expect(page.getByText('What would you like to do?')).toBeVisible();

    // Select "I want to challenge it" (diverges from track flow here)
    await page.getByRole('button', { name: /i want to challenge it/i }).click();

    // --- Challenge Reason step ---
    await expect(page.getByText('Why do you want to challenge?')).toBeVisible();

    // Select "Unclear / Obscured Signage"
    await page
      .getByRole('button', { name: /unclear \/ obscured signage/i })
      .click();

    // --- Result (Score Gate) step ---
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
    expect(guestData.pcnNumber).toBeTruthy(); // PCN comes from OCR
    expect(guestData.issuerType).toBeTruthy();
    expect(guestData.intent).toBe('challenge');
    expect(guestData.challengeReason).toBe('signage');
    expect(guestData.tier).toBe('premium');
    expect(guestData.issuedAt).toBeTruthy();
    expect(guestData.location).toBeTruthy();
  });
});
