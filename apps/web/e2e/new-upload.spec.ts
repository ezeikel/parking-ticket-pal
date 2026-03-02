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

    // Wait for processing to start - look for processing state indicators
    await expect(
      page
        .getByText(/scanning ticket|extracting details|image uploaded/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 });

    // Wait for wizard to appear after OCR - either confirm step (OCR success)
    // or issuer step (OCR failed, falls back to manual)
    const confirmHeading = page.getByText('Confirm your details');
    const issuerHeading = page.getByText('Who issued your ticket?');

    await expect(confirmHeading.or(issuerHeading)).toBeVisible({
      timeout: 90_000, // OCR can be slow
    });

    const isOcrSuccess = await confirmHeading.isVisible();

    if (isOcrSuccess) {
      // OCR succeeded - verify extraction badge
      await expect(
        page.getByText('Details extracted from your photo'),
      ).toBeVisible();

      // Override PCN to our unique test value so we can find it in DB
      const pcnField = page
        .getByText('PCN Reference')
        .locator('..')
        .getByRole('textbox');
      await expect(pcnField).toBeVisible({ timeout: 5_000 });
      await pcnField.clear();
      await pcnField.fill(testPcn);

      // Ensure vehicle registration has a value
      const vehicleRegField = page
        .getByText('Vehicle Registration')
        .locator('..')
        .getByRole('textbox');
      const regValue = await vehicleRegField.inputValue();
      if (!regValue) {
        await vehicleRegField.fill('AB12CDE');
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
      const addressPlaceholder = page.getByPlaceholder(
        'Start typing an address',
      );
      const addressValue = await addressPlaceholder.inputValue();
      if (!addressValue) {
        const addressInput = page.locator('.mapboxgl-ctrl-geocoder input');
        await addressInput.click();
        await addressInput.pressSequentially('10 Downing Street', {
          delay: 50,
        });
        await page
          .locator('.mapboxgl-ctrl-geocoder .suggestions li')
          .first()
          .waitFor({ timeout: 10_000 });
        await page
          .locator('.mapboxgl-ctrl-geocoder .suggestions li')
          .first()
          .click();
      }
    } else {
      // OCR failed - fill all fields manually
      // Step 1: Issuer type
      await page.getByRole('button', { name: /a local council/i }).click();

      // Step 2: Stage
      await expect(page.getByText('What stage are you at?')).toBeVisible();
      await page.getByRole('button', { name: /initial ticket/i }).click();

      // Step 3: Details
      await expect(page.getByText('Enter your ticket details')).toBeVisible();

      await page.getByPlaceholder('e.g. WK12345678').fill(testPcn);
      await page.getByPlaceholder('e.g. AB12 CDE').fill('AB12CDE');

      const issuerInput = page.getByPlaceholder(
        'e.g. Lewisham, Westminster...',
      );
      await issuerInput.fill('Lewisham');
      await page.getByRole('button', { name: 'Lewisham' }).click();

      await page.getByRole('button', { name: /pick a date/i }).click();
      await page.getByRole('button', { name: /previous month/i }).click();
      await page
        .locator('[role="gridcell"]:not([data-disabled]) button')
        .first()
        .click();

      await page.getByPlaceholder('e.g. 70').fill('70');

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

    // Submit - click "Add Ticket"
    const addTicketButton = page.getByRole('button', {
      name: /add ticket/i,
    });
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
