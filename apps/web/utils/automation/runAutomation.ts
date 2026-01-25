/**
 * Automation Runner for Learned Recipes
 *
 * This service executes learned automation recipes to submit parking ticket
 * challenges on issuer websites.
 *
 * It uses Playwright to:
 * 1. Navigate through the recorded steps
 * 2. Fill in form fields with actual user data
 * 3. Handle CAPTCHAs if encountered
 * 4. Submit the challenge
 * 5. Take screenshots for verification
 */

import { db, IssuerAutomationStatus, ChallengeStatus } from '@parking-ticket-pal/db';
import { Address } from '@parking-ticket-pal/types';
import { put } from '@/lib/storage';
import { createServerLogger } from '@/lib/logger';
import { setupBrowser } from './shared';
import generateChallengeContent from '@/utils/ai/generateChallengeContent';
import type { RecipeStep } from './learn';

const logger = createServerLogger({ action: 'run-automation' });

/**
 * Context data for filling in placeholders
 */
export type AutomationContext = {
  pcnNumber: string;
  vehicleReg: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  challengeReason: string;
  challengeText?: string;
};

/**
 * Parameters for running an automation
 */
export type RunAutomationParams = {
  automationId: string;
  challengeId: string;
  ticketId: string;
  context: AutomationContext;
  dryRun?: boolean; // If true, don't actually submit
};

/**
 * Result of running an automation
 */
export type RunAutomationResult = {
  success: boolean;
  challengeSubmitted: boolean;
  screenshotUrls: string[];
  error?: string;
  captchaEncountered?: boolean;
  challengeText?: string;
};

/**
 * Replace placeholders in a value with actual context data
 */
function replacePlaceholders(value: string, context: AutomationContext): string {
  const replacements: Record<string, string> = {
    '{{pcnNumber}}': context.pcnNumber,
    '{{vehicleReg}}': context.vehicleReg,
    '{{firstName}}': context.firstName,
    '{{lastName}}': context.lastName,
    '{{fullName}}': context.fullName,
    '{{email}}': context.email,
    '{{phone}}': context.phone || '',
    '{{addressLine1}}': context.addressLine1,
    '{{addressLine2}}': context.addressLine2 || '',
    '{{city}}': context.city,
    '{{postcode}}': context.postcode,
    '{{challengeReason}}': context.challengeReason,
    '{{challengeText}}': context.challengeText || '',
  };

  let result = value;
  for (const [placeholder, replacement] of Object.entries(replacements)) {
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacement);
  }

  return result;
}

/**
 * Upload a screenshot during automation run
 */
async function uploadRunScreenshot(
  automationId: string,
  challengeId: string,
  stepNumber: number,
  screenshot: Buffer,
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `automation/runs/${automationId}/${challengeId}/step-${stepNumber}-${timestamp}.png`;

  const blob = await put(path, screenshot, {
    contentType: 'image/png',
  });

  return blob.url;
}

/**
 * Execute a single automation step
 */
async function executeStep(
  page: any,
  step: RecipeStep,
  context: AutomationContext,
  automationId: string,
  challengeId: string,
): Promise<{ success: boolean; screenshotUrl?: string; error?: string }> {
  try {
    switch (step.action) {
      case 'navigate': {
        const url = step.value ? replacePlaceholders(step.value, context) : '';
        if (url) {
          await page.goto(url);
          if (step.waitFor) {
            await page.waitForSelector(step.waitFor, { timeout: 10000 });
          }
        }
        break;
      }

      case 'fill': {
        if (step.selector && step.value) {
          const value = replacePlaceholders(step.value, context);
          await page.waitForSelector(step.selector, { timeout: 10000 });
          await page.fill(step.selector, value);
        }
        break;
      }

      case 'click': {
        if (step.selector) {
          await page.waitForSelector(step.selector, { timeout: 10000 });
          await page.click(step.selector);
          if (step.waitFor) {
            await page.waitForSelector(step.waitFor, { timeout: 15000 });
          }
        }
        break;
      }

      case 'select': {
        if (step.selector && step.value) {
          const value = replacePlaceholders(step.value, context);
          await page.waitForSelector(step.selector, { timeout: 10000 });
          await page.selectOption(step.selector, value);
        }
        break;
      }

      case 'wait': {
        if (step.waitFor) {
          await page.waitForSelector(step.waitFor, { timeout: 15000 });
        } else if (step.value) {
          // Wait for a specific amount of time (value in ms)
          await page.waitForTimeout(parseInt(step.value, 10));
        }
        break;
      }

      case 'screenshot': {
        const buffer = await page.screenshot({ fullPage: true });
        const screenshotUrl = await uploadRunScreenshot(
          automationId,
          challengeId,
          step.order,
          buffer,
        );
        return { success: true, screenshotUrl };
      }

      case 'solve_captcha': {
        // Use the 2captcha integration from shared.ts
        // The chromium browser is already configured with the RecaptchaPlugin
        try {
          await page.solveRecaptchas();
        } catch (captchaError) {
          logger.warn('CAPTCHA solving failed', { step: step.order, error: captchaError });
          // Continue even if captcha solving fails - some sites don't always show captcha
        }
        break;
      }

      case 'upload_file': {
        // File upload handling would go here
        // For now, skip as it's complex
        logger.warn('File upload step skipped - not implemented', { step: step.order });
        break;
      }

      default:
        logger.warn('Unknown step action', { action: step.action, step: step.order });
    }

    // Take a screenshot after every step for debugging
    const buffer = await page.screenshot({ fullPage: false });
    const screenshotUrl = await uploadRunScreenshot(
      automationId,
      challengeId,
      step.order,
      buffer,
    );

    return { success: true, screenshotUrl };
  } catch (error) {
    logger.error('Step execution failed', {
      step: step.order,
      action: step.action,
      selector: step.selector,
    }, error instanceof Error ? error : new Error(String(error)));

    // Take a screenshot on error
    try {
      const buffer = await page.screenshot({ fullPage: true });
      const screenshotUrl = await uploadRunScreenshot(
        automationId,
        challengeId,
        step.order,
        buffer,
      );
      return {
        success: false,
        screenshotUrl,
        error: error instanceof Error ? error.message : 'Step execution failed',
      };
    } catch {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Step execution failed',
      };
    }
  }
}

/**
 * Run an automation recipe to submit a challenge
 */
export async function runAutomation(params: RunAutomationParams): Promise<RunAutomationResult> {
  const { automationId, challengeId, ticketId, context, dryRun = false } = params;

  logger.info('Starting automation run', {
    automationId,
    challengeId,
    ticketId,
    dryRun,
  });

  // Fetch the automation recipe
  const automation = await db.issuerAutomation.findUnique({
    where: { id: automationId },
  });

  if (!automation) {
    return {
      success: false,
      challengeSubmitted: false,
      screenshotUrls: [],
      error: 'Automation not found',
    };
  }

  if (automation.status !== IssuerAutomationStatus.VERIFIED) {
    return {
      success: false,
      challengeSubmitted: false,
      screenshotUrls: [],
      error: `Automation is not verified (status: ${automation.status})`,
    };
  }

  const steps = automation.steps as RecipeStep[];
  if (!steps || steps.length === 0) {
    return {
      success: false,
      challengeSubmitted: false,
      screenshotUrls: [],
      error: 'Automation has no steps',
    };
  }

  // Generate challenge text if not provided
  let challengeText = context.challengeText;
  if (!challengeText) {
    challengeText = await generateChallengeContent({
      pcnNumber: context.pcnNumber,
      challengeReason: context.challengeReason,
      additionalDetails: undefined,
      contentType: 'form-field',
      formFieldPlaceholderText: '',
      userEvidenceImageUrls: [],
    }) || '';
  }

  const contextWithText = { ...context, challengeText };

  // Start the browser
  const { browser, page } = await setupBrowser();
  const screenshotUrls: string[] = [];
  let captchaEncountered = false;

  try {
    // Execute each step
    for (const step of steps.sort((a, b) => a.order - b.order)) {
      // Skip submit step in dry run mode
      if (dryRun && step.action === 'click' && step.description?.toLowerCase().includes('submit')) {
        logger.info('Skipping submit step in dry run mode', { step: step.order });
        continue;
      }

      // Track CAPTCHA steps
      if (step.action === 'solve_captcha') {
        captchaEncountered = true;
      }

      const result = await executeStep(page, step, contextWithText, automationId, challengeId);

      if (result.screenshotUrl) {
        screenshotUrls.push(result.screenshotUrl);
      }

      if (!result.success && !step.optional) {
        // Non-optional step failed
        await browser.close();

        // Update challenge status
        await db.challenge.update({
          where: { id: challengeId },
          data: {
            status: ChallengeStatus.ERROR,
            metadata: {
              automationId,
              error: result.error,
              failedAtStep: step.order,
              screenshotUrls,
            },
          },
        });

        return {
          success: false,
          challengeSubmitted: false,
          screenshotUrls,
          error: `Step ${step.order} failed: ${result.error}`,
          captchaEncountered,
        };
      }
    }

    // Close browser
    await browser.close();

    // Update challenge status
    const finalStatus = dryRun ? ChallengeStatus.PENDING : ChallengeStatus.SUCCESS;
    await db.challenge.update({
      where: { id: challengeId },
      data: {
        status: finalStatus,
        submittedAt: dryRun ? undefined : new Date(),
        metadata: {
          automationId,
          challengeSubmitted: !dryRun,
          dryRun,
          screenshotUrls,
          challengeText,
        },
      },
    });

    logger.info('Automation run completed', {
      automationId,
      challengeId,
      dryRun,
      screenshotCount: screenshotUrls.length,
    });

    return {
      success: true,
      challengeSubmitted: !dryRun,
      screenshotUrls,
      captchaEncountered,
      challengeText,
    };
  } catch (error) {
    logger.error('Automation run failed', {
      automationId,
      challengeId,
    }, error instanceof Error ? error : new Error(String(error)));

    try {
      await browser.close();
    } catch {
      // Ignore browser close errors
    }

    // Update challenge status
    await db.challenge.update({
      where: { id: challengeId },
      data: {
        status: ChallengeStatus.ERROR,
        metadata: {
          automationId,
          error: error instanceof Error ? error.message : 'Unknown error',
          screenshotUrls,
        },
      },
    });

    return {
      success: false,
      challengeSubmitted: false,
      screenshotUrls,
      error: error instanceof Error ? error.message : 'Unknown error',
      captchaEncountered,
    };
  }
}

/**
 * Build automation context from ticket and user data
 */
export function buildAutomationContext(
  ticket: {
    pcnNumber: string;
    vehicle: {
      registrationNumber: string;
      user: {
        name: string | null;
        email: string;
        phoneNumber: string | null;
        address: unknown;
      };
    };
  },
  challengeReason: string,
  customReason?: string,
): AutomationContext {
  const user = ticket.vehicle.user;
  const address = user.address as Address | null;
  const nameParts = (user.name || '').split(' ');

  return {
    pcnNumber: ticket.pcnNumber,
    vehicleReg: ticket.vehicle.registrationNumber,
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    fullName: user.name || '',
    email: user.email,
    phone: user.phoneNumber || undefined,
    addressLine1: address?.line1 || '',
    addressLine2: address?.line2 || undefined,
    city: address?.city || '',
    postcode: address?.postcode || '',
    challengeReason,
    challengeText: customReason,
  };
}
