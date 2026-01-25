/**
 * Learning Service for Auto-Challenge Automation
 *
 * This service uses Playwright MCP to discover and record the challenge
 * submission flow for unsupported parking ticket issuers.
 *
 * Flow:
 * 1. Search for the issuer's challenge/appeal portal
 * 2. Navigate through the challenge flow
 * 3. Record each step (selectors, actions, form fields)
 * 4. Take screenshots at each step
 * 5. Save the recipe for human review
 */

import { db, IssuerAutomationStatus } from '@parking-ticket-pal/db';
import { put } from '@/lib/storage';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'learn-automation' });

/**
 * Step types that can be recorded in a recipe
 */
export type StepAction =
  | 'navigate'
  | 'fill'
  | 'click'
  | 'select'
  | 'wait'
  | 'screenshot'
  | 'solve_captcha'
  | 'upload_file';

/**
 * A single step in an automation recipe
 */
export type RecipeStep = {
  order: number;
  action: StepAction;
  selector?: string; // CSS selector or accessibility label
  value?: string; // Value to fill (can use placeholders like {{pcnNumber}})
  description: string; // Human-readable description
  screenshotUrl?: string; // Screenshot taken after this step
  waitFor?: string; // Selector to wait for after action
  optional?: boolean; // Step may not always appear
  fieldType?: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'file';
  placeholder?: string; // Placeholder mapping for dynamic values
};

/**
 * Placeholders that can be used in recipe steps
 */
export const PLACEHOLDERS = {
  PCN_NUMBER: '{{pcnNumber}}',
  VEHICLE_REG: '{{vehicleReg}}',
  FIRST_NAME: '{{firstName}}',
  LAST_NAME: '{{lastName}}',
  FULL_NAME: '{{fullName}}',
  EMAIL: '{{email}}',
  PHONE: '{{phone}}',
  ADDRESS_LINE1: '{{addressLine1}}',
  ADDRESS_LINE2: '{{addressLine2}}',
  CITY: '{{city}}',
  POSTCODE: '{{postcode}}',
  CHALLENGE_REASON: '{{challengeReason}}',
  CHALLENGE_TEXT: '{{challengeText}}',
} as const;

/**
 * Parameters for learning an issuer's challenge flow
 */
export type LearnParams = {
  automationId: string;
  ticketId: string;
  pcnNumber: string;
  vehicleReg: string;
  issuerName: string;
  issuerWebsite?: string; // Optional starting URL
};

/**
 * Result of the learning process
 */
export type LearnResult = {
  success: boolean;
  automationId: string;
  steps?: RecipeStep[];
  challengeUrl?: string;
  needsAccount?: boolean;
  captchaType?: string;
  error?: string;
  needsHumanHelp?: boolean;
  humanHelpReason?: string;
};

/**
 * Upload a screenshot to storage and return the URL
 * @internal - Will be used when full learning implementation is complete
 */
export async function uploadLearningScreenshot(
  automationId: string,
  stepNumber: number,
  screenshot: Buffer,
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `automation/learning/${automationId}/step-${stepNumber}-${timestamp}.png`;

  const blob = await put(path, screenshot, {
    contentType: 'image/png',
  });

  return blob.url;
}

/**
 * Search for an issuer's challenge/appeal portal URL
 */
async function findChallengeUrl(issuerName: string): Promise<string | null> {
  // Common URL patterns for UK council parking challenge portals
  const searchTerms = [
    `${issuerName} parking PCN challenge online`,
    `${issuerName} penalty charge notice appeal`,
    `${issuerName} parking ticket representation`,
  ];

  // For now, return null - this will be implemented with web search
  // In production, this would use a search API or predefined issuer database
  logger.info('Searching for challenge URL', { issuerName, searchTerms });

  return null;
}

/**
 * Detect form fields on the current page
 * @internal - Will be used when full learning implementation is complete
 */
export function detectFormFields(_pageSnapshot: string): Array<{
  selector: string;
  type: string;
  label?: string;
  name?: string;
  placeholder?: string;
  suggestedPlaceholder?: string;
}> {
  // This would analyze the page snapshot to find form fields
  // For now, return empty - will be implemented with Playwright snapshot analysis
  return [];
}

/**
 * Detect if the page has a CAPTCHA
 * @internal - Will be used when full learning implementation is complete
 */
export function detectCaptcha(pageSnapshot: string): {
  hasCaptcha: boolean;
  type?: 'recaptcha' | 'hcaptcha' | 'turnstile' | 'unknown';
} {
  const captchaPatterns = {
    recaptcha: /g-recaptcha|grecaptcha|recaptcha/i,
    hcaptcha: /h-captcha|hcaptcha/i,
    turnstile: /cf-turnstile|turnstile/i,
  };

  for (const [type, pattern] of Object.entries(captchaPatterns)) {
    if (pattern.test(pageSnapshot)) {
      return { hasCaptcha: true, type: type as 'recaptcha' | 'hcaptcha' | 'turnstile' };
    }
  }

  return { hasCaptcha: false };
}

/**
 * Detect if the page requires account creation/login
 * @internal - Will be used when full learning implementation is complete
 */
export function detectAccountRequirement(pageSnapshot: string): {
  requiresAccount: boolean;
  hasLoginForm: boolean;
  hasRegisterForm: boolean;
} {
  const loginPatterns = /log\s*in|sign\s*in|password|username/i;
  const registerPatterns = /register|create\s*account|sign\s*up/i;

  return {
    requiresAccount: loginPatterns.test(pageSnapshot) || registerPatterns.test(pageSnapshot),
    hasLoginForm: loginPatterns.test(pageSnapshot),
    hasRegisterForm: registerPatterns.test(pageSnapshot),
  };
}

/**
 * Map a form field to a placeholder based on its label/name
 * @internal - Will be used when full learning implementation is complete
 */
export function mapFieldToPlaceholder(field: {
  label?: string;
  name?: string;
  placeholder?: string;
}): string | null {
  const text = `${field.label || ''} ${field.name || ''} ${field.placeholder || ''}`.toLowerCase();

  if (/pcn|penalty.*charge.*notice|ticket.*number/i.test(text)) {
    return PLACEHOLDERS.PCN_NUMBER;
  }
  if (/vehicle.*reg|registration|vrm|vrn/i.test(text)) {
    return PLACEHOLDERS.VEHICLE_REG;
  }
  if (/first.*name|forename/i.test(text)) {
    return PLACEHOLDERS.FIRST_NAME;
  }
  if (/last.*name|surname|family.*name/i.test(text)) {
    return PLACEHOLDERS.LAST_NAME;
  }
  if (/full.*name|your.*name/i.test(text)) {
    return PLACEHOLDERS.FULL_NAME;
  }
  if (/email/i.test(text)) {
    return PLACEHOLDERS.EMAIL;
  }
  if (/phone|mobile|telephone/i.test(text)) {
    return PLACEHOLDERS.PHONE;
  }
  if (/address.*line.*1|street.*address/i.test(text)) {
    return PLACEHOLDERS.ADDRESS_LINE1;
  }
  if (/address.*line.*2/i.test(text)) {
    return PLACEHOLDERS.ADDRESS_LINE2;
  }
  if (/city|town/i.test(text)) {
    return PLACEHOLDERS.CITY;
  }
  if (/post.*code|zip/i.test(text)) {
    return PLACEHOLDERS.POSTCODE;
  }
  if (/reason|grounds|why/i.test(text)) {
    return PLACEHOLDERS.CHALLENGE_REASON;
  }
  if (/details|description|explanation|comments|notes/i.test(text)) {
    return PLACEHOLDERS.CHALLENGE_TEXT;
  }

  return null;
}

/**
 * Main learning function - discovers and records the challenge flow
 *
 * Note: This is a placeholder implementation. The full implementation
 * would use Playwright MCP to:
 * 1. Navigate to the issuer's website
 * 2. Use Claude to analyze the page and identify next steps
 * 3. Record each action as a recipe step
 * 4. Take screenshots at each step
 * 5. Handle edge cases (CAPTCHA, account creation, etc.)
 */
export async function learnIssuerFlow(params: LearnParams): Promise<LearnResult> {
  const {
    automationId,
    ticketId,
    pcnNumber: _pcnNumber, // Reserved for future use in actual learning
    vehicleReg: _vehicleReg, // Reserved for future use in actual learning
    issuerName,
    issuerWebsite,
  } = params;

  logger.info('Starting learning flow', {
    automationId,
    ticketId,
    issuerName,
  });

  try {
    // Update status to LEARNING
    await db.issuerAutomation.update({
      where: { id: automationId },
      data: {
        status: IssuerAutomationStatus.LEARNING,
      },
    });

    // Step 1: Find the challenge URL
    let challengeUrl: string | undefined = issuerWebsite;
    if (!challengeUrl) {
      const foundUrl = await findChallengeUrl(issuerName);
      challengeUrl = foundUrl ?? undefined;
    }

    if (!challengeUrl) {
      // Could not find the challenge URL automatically
      await db.issuerAutomation.update({
        where: { id: automationId },
        data: {
          status: IssuerAutomationStatus.NEEDS_HUMAN_HELP,
          failureReason: `Could not automatically find challenge portal for ${issuerName}. Manual URL required.`,
        },
      });

      return {
        success: false,
        automationId,
        needsHumanHelp: true,
        humanHelpReason: `Could not find challenge portal URL for ${issuerName}`,
      };
    }

    // Step 2: Start browser automation with Playwright MCP
    // This would use the Playwright MCP tools to:
    // - Navigate to the challenge URL
    // - Analyze the page structure
    // - Identify form fields and buttons
    // - Record the flow step by step

    // Placeholder: Create initial steps based on common patterns
    const steps: RecipeStep[] = [
      {
        order: 1,
        action: 'navigate',
        value: challengeUrl,
        description: `Navigate to ${issuerName} challenge portal`,
      },
      {
        order: 2,
        action: 'fill',
        selector: 'input[name*="pcn"], input[id*="pcn"], input[placeholder*="PCN"]',
        value: PLACEHOLDERS.PCN_NUMBER,
        description: 'Enter PCN number',
        fieldType: 'text',
        placeholder: 'pcnNumber',
      },
      {
        order: 3,
        action: 'fill',
        selector: 'input[name*="reg"], input[id*="vrm"], input[placeholder*="registration"]',
        value: PLACEHOLDERS.VEHICLE_REG,
        description: 'Enter vehicle registration',
        fieldType: 'text',
        placeholder: 'vehicleReg',
      },
      {
        order: 4,
        action: 'click',
        selector: 'button[type="submit"], input[type="submit"], button:has-text("Search"), button:has-text("Find")',
        description: 'Click search/submit button',
        waitFor: 'form, .results, .ticket-details',
      },
    ];

    // For now, mark as PENDING_REVIEW since we need human verification
    await db.issuerAutomation.update({
      where: { id: automationId },
      data: {
        status: IssuerAutomationStatus.PENDING_REVIEW,
        challengeUrl,
        steps: steps as any,
        needsAccount: false,
        captchaType: null,
      },
    });

    logger.info('Learning flow completed - pending review', {
      automationId,
      challengeUrl,
      stepsCount: steps.length,
    });

    return {
      success: true,
      automationId,
      steps,
      challengeUrl,
      needsAccount: false,
    };
  } catch (error) {
    logger.error('Learning flow failed', {
      automationId,
      ticketId,
      issuerName,
    }, error instanceof Error ? error : new Error(String(error)));

    // Update status to FAILED
    await db.issuerAutomation.update({
      where: { id: automationId },
      data: {
        status: IssuerAutomationStatus.FAILED,
        lastFailed: new Date(),
        failureReason: error instanceof Error ? error.message : 'Unknown error during learning',
      },
    });

    return {
      success: false,
      automationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Continue learning from where we left off (e.g., after human provides URL)
 */
export async function continueLearnIssuerFlow(
  automationId: string,
  additionalInfo: {
    challengeUrl?: string;
    steps?: RecipeStep[];
  },
): Promise<LearnResult> {
  const automation = await db.issuerAutomation.findUnique({
    where: { id: automationId },
  });

  if (!automation) {
    return {
      success: false,
      automationId,
      error: 'Automation not found',
    };
  }

  // If challenge URL was provided, update and continue learning
  if (additionalInfo.challengeUrl) {
    await db.issuerAutomation.update({
      where: { id: automationId },
      data: {
        challengeUrl: additionalInfo.challengeUrl,
        status: IssuerAutomationStatus.LEARNING,
      },
    });

    // Trigger learning with the new URL
    return learnIssuerFlow({
      automationId,
      ticketId: '', // Not needed for URL-based continuation
      pcnNumber: '',
      vehicleReg: '',
      issuerName: automation.issuerName,
      issuerWebsite: additionalInfo.challengeUrl,
    });
  }

  // If steps were provided (e.g., from manual recording), use them directly
  if (additionalInfo.steps && additionalInfo.steps.length > 0) {
    await db.issuerAutomation.update({
      where: { id: automationId },
      data: {
        steps: additionalInfo.steps as any,
        status: IssuerAutomationStatus.PENDING_REVIEW,
      },
    });

    return {
      success: true,
      automationId,
      steps: additionalInfo.steps,
    };
  }

  return {
    success: false,
    automationId,
    error: 'No additional information provided',
  };
}

/**
 * Verify that a learned recipe still works
 */
export async function verifyRecipe(automationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const automation = await db.issuerAutomation.findUnique({
    where: { id: automationId },
  });

  if (!automation) {
    return { success: false, error: 'Automation not found' };
  }

  if (!automation.challengeUrl) {
    return { success: false, error: 'No challenge URL configured' };
  }

  try {
    // This would use Playwright MCP to:
    // 1. Navigate to the challenge URL
    // 2. Verify the page structure matches expected selectors
    // 3. Check that form fields are still present
    // 4. NOT submit any actual data

    // For now, just update the lastVerified timestamp
    await db.issuerAutomation.update({
      where: { id: automationId },
      data: {
        lastVerified: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    await db.issuerAutomation.update({
      where: { id: automationId },
      data: {
        lastFailed: new Date(),
        failureReason: error instanceof Error ? error.message : 'Verification failed',
        status: IssuerAutomationStatus.FAILED,
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Approve a recipe after human review
 */
export async function approveRecipe(automationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await db.issuerAutomation.update({
      where: { id: automationId },
      data: {
        status: IssuerAutomationStatus.VERIFIED,
        lastVerified: new Date(),
      },
    });

    logger.info('Recipe approved', { automationId });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve recipe',
    };
  }
}

/**
 * Reject a recipe and mark as needing human help
 */
export async function rejectRecipe(
  automationId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.issuerAutomation.update({
      where: { id: automationId },
      data: {
        status: IssuerAutomationStatus.NEEDS_HUMAN_HELP,
        failureReason: reason,
      },
    });

    logger.info('Recipe rejected', { automationId, reason });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject recipe',
    };
  }
}
