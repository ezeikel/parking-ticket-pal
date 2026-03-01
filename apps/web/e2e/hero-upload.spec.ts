import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'ticket-council-1.jpg');

const hasFixture = fs.existsSync(FIXTURE_PATH);

test.describe('Guest upload ticket creation (home page)', () => {
  test.skip(
    !hasFixture,
    'Skipping: ticket fixture image not found. Add ticket-council-1.jpg to e2e/fixtures/',
  );

  test('uploads ticket image via hero, OCR pre-fills wizard, and stores data in localStorage', async ({
    page,
  }) => {
    // Navigate to home page
    await page.goto('/');

    // Upload ticket image via the hero file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE_PATH);

    // Wait for OCR processing - confirm step should appear with pre-filled data
    await expect(page.getByText('Confirm your details')).toBeVisible({
      timeout: 60_000, // OCR can take up to 60s
    });

    // Verify OCR extracted data badge
    await expect(
      page.getByText('Details extracted from your photo'),
    ).toBeVisible();

    // Verify OCR pre-filled at least PCN and vehicle reg (non-empty)
    const pcnInput = page.getByLabel(/pcn/i).first();
    const pcnValue = await pcnInput.inputValue();
    expect(pcnValue.length).toBeGreaterThan(0);

    const vehicleRegInput = page.getByLabel(/vehicle registration/i);
    const regValue = await vehicleRegInput.inputValue();
    if (!regValue) {
      await vehicleRegInput.fill('AB12CDE');
    }

    // Ensure issuer is filled
    const issuerInput = page.getByPlaceholder(
      /search for issuer|lewisham|westminster/i,
    );
    const issuerValue = await issuerInput.inputValue();
    if (!issuerValue || issuerValue.length < 2) {
      await issuerInput.fill('Lewisham');
      await page.getByRole('button', { name: 'Lewisham' }).click();
    }

    // Ensure date is filled
    const dateButton = page.getByRole('button', { name: /pick a date/i });
    const dateText = await dateButton.textContent();
    if (dateText?.includes('Pick a date')) {
      await dateButton.click();
      const today = new Date();
      await page
        .locator('[role="gridcell"]')
        .getByRole('button', { name: today.getDate().toString(), exact: true })
        .first()
        .click();
    }

    // Ensure amount is filled
    const amountInput = page.getByPlaceholder('e.g. 70');
    const amountValue = await amountInput.inputValue();
    if (!amountValue) {
      await amountInput.fill('70');
    }

    // Ensure location is filled
    const addressInput = page.getByPlaceholder('Start typing an address');
    const addressValue = await addressInput.inputValue();
    if (!addressValue) {
      await addressInput.fill('10 Downing Street');
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
    await page.getByRole('button', { name: /just track my ticket/i }).click();

    // --- Signup step ---
    await expect(page.getByText('Create your free account')).toBeVisible();

    // Click "Create Free Account" - triggers redirect to /guest/signup
    await Promise.all([
      page.waitForURL('**/guest/signup**', { timeout: 10_000 }),
      page.getByRole('button', { name: /create free account/i }).click(),
    ]);

    expect(page.url()).toContain('/guest/signup');

    // Verify localStorage has the guest ticket data
    const guestData = await page.evaluate(() => {
      const raw = localStorage.getItem('guestTicketData');
      return raw ? JSON.parse(raw) : null;
    });

    expect(guestData).not.toBeNull();
    expect(guestData.pcnNumber).toBeTruthy();
    expect(guestData.issuerType).toBeTruthy();
    expect(guestData.intent).toBe('track');
    expect(guestData.issuedAt).toBeTruthy();
    expect(guestData.location).toBeTruthy();
  });
});
