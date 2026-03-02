import { test, expect } from '@playwright/test';
import { authenticateContext, cleanupTestUser } from './helpers/auth';
import {
  generateUniquePcn,
  deleteTicketByPcn,
  seedVehicleForUser,
  seedTicketForUser,
  upgradeTicketTier,
  getChallengesByTicketId,
} from './helpers/db';

let testPcn: string;
let testUserId: string;
let testTicketId: string;

test.describe('Challenge letter generation', () => {
  test.beforeEach(async ({ context }) => {
    const user = await authenticateContext(context);
    testUserId = user.id;
    testPcn = generateUniquePcn();

    // Seed a PREMIUM ticket (default status is ISSUED_DISCOUNT_PERIOD = needs action)
    const vehicleId = await seedVehicleForUser(testUserId, 'AB12CDE');
    testTicketId = await seedTicketForUser(testUserId, testPcn, vehicleId);
    await upgradeTicketTier(testTicketId, 'PREMIUM');
  });

  test.afterEach(async () => {
    if (testPcn) {
      await deleteTicketByPcn(testPcn);
    }
    await cleanupTestUser();
  });

  test('generates a challenge letter for a PREMIUM ticket', async ({
    page,
  }) => {
    // 1. Navigate to ticket detail page
    await page.goto(`/tickets/${testTicketId}`);

    // 2. Verify "Generate Challenge Letter" button is visible (PREMIUM + needs-action)
    const generateButton = page.getByRole('button', {
      name: /generate challenge letter/i,
    });
    await expect(generateButton).toBeVisible({ timeout: 15_000 });

    // 3. Open the dialog
    await generateButton.click();

    // Wait for dialog heading
    await expect(
      page.getByRole('heading', { name: /generate challenge letter/i }),
    ).toBeVisible();

    // 4. Select a challenge reason from the dropdown
    // Click the Select trigger to open the dropdown
    await page.locator('#reason').click();

    // Select "The contravention did not occur" from the dropdown
    await page
      .getByRole('option', { name: /the contravention did not occur/i })
      .click();

    // Optionally fill additional details
    await page
      .locator('#customReason')
      .fill('I was loading goods at the time of the alleged contravention.');

    // 5. Submit the form
    const submitButton = page.getByRole('button', {
      name: /generate & email letter/i,
    });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // 6. Wait for success toast (AI generation + PDF + email can take up to 60s)
    await expect(
      page.getByText(/your challenge letter is on the way/i),
    ).toBeVisible({ timeout: 90_000 });

    // 7. Verify ChallengeLettersCard renders with the generated letter
    await expect(page.getByText('Your Appeal Letter')).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole('button', { name: /view full letter/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /download pdf/i }),
    ).toBeVisible();

    // 8. Verify DB record
    const challenges = await getChallengesByTicketId(testTicketId);
    expect(challenges.length).toBeGreaterThanOrEqual(1);

    const challenge = challenges[0];
    expect(challenge.type).toBe('LETTER');
    expect(challenge.status).toBe('SUCCESS');
    expect(challenge.metadata).not.toBeNull();
    expect((challenge.metadata as Record<string, unknown>).pdfGenerated).toBe(
      true,
    );
    expect((challenge.metadata as Record<string, unknown>).pdfUrl).toBeTruthy();
  });
});
