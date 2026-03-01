import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { authenticateContext, cleanupTestUser } from './helpers/auth';
import {
  generateUniquePcn,
  getTicketByPcn,
  deleteTicketByPcn,
} from './helpers/db';

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'ticket-council-1.jpg');

// Skip OCR tests if fixture image doesn't exist yet
const hasFixture = fs.existsSync(FIXTURE_PATH);

let testPcn: string;

test.describe('Authenticated upload ticket creation (/new)', () => {
  test.skip(
    !hasFixture,
    'Skipping: ticket fixture image not found. Add ticket-council-1.jpg to e2e/fixtures/',
  );

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

  test('uploads ticket image, OCR extracts details, submits wizard, and saves to DB', async ({
    page,
  }) => {
    // Navigate to /new
    await page.goto('/new');
    await expect(page.getByText('Add Your Document')).toBeVisible();

    // Upload ticket image via file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE_PATH);

    // Wait for OCR processing to complete - wizard should appear
    // The processing state shows progress steps, then wizard opens
    await expect(page.getByText('Confirm your details')).toBeVisible({
      timeout: 60_000, // OCR can take up to 60s
    });

    // Verify OCR extracted some data - badge should show
    await expect(
      page.getByText('Details extracted from your photo'),
    ).toBeVisible();

    // Override PCN to our unique test value so we can find it in DB
    const pcnField = page.getByLabel(/pcn reference/i);
    await pcnField.clear();
    await pcnField.fill(testPcn);

    // Ensure vehicle registration has a value
    const vehicleRegField = page.getByLabel(/vehicle registration/i);
    const regValue = await vehicleRegField.inputValue();
    if (!regValue) {
      await vehicleRegField.fill('AB12CDE');
    }

    // Ensure issuer is filled - if OCR didn't extract it, fill manually
    // IssuerCombobox doesn't use a standard label, so check by placeholder
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
    // If the button text is "Pick a date" (no date selected), we need to pick one
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

    // Submit - click "Add Ticket"
    const addTicketButton = page.getByRole('button', { name: /add ticket/i });
    await expect(addTicketButton).toBeEnabled({ timeout: 5_000 });
    await addTicketButton.click();

    // Wait for success state
    await expect(page.getByText('Ticket Added!')).toBeVisible({
      timeout: 30_000,
    });

    // Verify ticket exists in DB
    const ticket = await getTicketByPcn(testPcn);
    expect(ticket).not.toBeNull();
    expect(ticket!.pcnNumber).toBe(testPcn);
    expect(ticket!.issuer).toBeTruthy();
    expect(ticket!.issuedAt).toBeTruthy();
    expect(ticket!.initialAmount).toBeTruthy();
    expect(ticket!.vehicle).toBeTruthy();
  });
});
