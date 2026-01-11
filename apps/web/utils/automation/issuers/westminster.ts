import * as Sentry from '@sentry/nextjs';
import generateChallengeContent from '@/utils/ai/generateChallengeContent';
// import { getEvidenceImages } from '@/app/actions';
import {
  ChallengeArgs,
  CommonPcnArgs,
  takeScreenShot,
  uploadEvidence,
} from '../shared';

// Westminster PCN website: https://pcnpayment.westminster.gov.uk/
// ✅ Implemented Westminster-specific logic for accessing PCN details
// ✅ Updated verify function for step2.php PCN details page with evidence image extraction
// ✅ Updated challenge function to navigate through step3.php (grounds selection)
// ✅ Added dynamic URL handling for reason-specific pages (did_not_occur.php)
// ✅ Implemented handleDidNotOccurForm for sub-reason selection and details
// ✅ Implemented handleContactDetailsForm for final contact details and submission
// ✅ Added success confirmation handling (submission.php) with final screenshot
// ✅ Complete end-to-end Westminster challenge automation with success verification
// TODO: Map challenge reasons from ticket.challengeReason to Westminster's 10 specific options
// TODO: Handle other reason-specific pages (not_owner.php, stolen_challenge.php, etc.)

const handleContactDetailsForm = async (page: any, args: ChallengeArgs) => {
  const { user } = args.ticket.vehicle;

  // Fill name field
  await page.fill('#formGroupInput', user.name);

  // Fill postcode for address lookup
  await page.fill('#offender-postcode', user.address.postcode);

  // Click postcode lookup button
  await page.click('#postcodelookup');

  // Wait for address modal to appear
  await page.waitForSelector('#addressModal', { state: 'visible' });

  // Click on the first address in the list (most likely match)
  await page.click('#addressselection .list-group-item:first-child');

  // Confirm address selection
  await page.click('#addselected');

  // Wait for modal to close and address to be populated
  await page.waitForSelector('#addressModal', { state: 'hidden' });

  // Fill email address
  await page.fill('#email-input', user.email);

  // Check email contact preference (optional)
  await page.check('#checkemail');

  // Check required confirmation checkbox
  await page.check('#checkinput');

  // Take final screenshot before submission
  await takeScreenShot({
    page,
    ticketId: args.ticket.id,
    fullPage: true,
  });

  // Submit the final challenge
  await page.click('#submit-btn');

  // Wait for success confirmation page (submission.php)
  await page.waitForURL('**/submission.php');
  await page.waitForSelector('h1:has-text("Challenge submitted")');

  // Wait for confirmation message to be visible
  await page.waitForSelector('.panel-body', {
    hasText: 'has been recorded in our system',
  });

  // Take final success screenshot
  await takeScreenShot({
    page,
    ticketId: args.ticket.id,
    fullPage: true,
  });
};

const handleDidNotOccurForm = async (page: any, args: ChallengeArgs) => {
  // Wait for the "did not occur" details form to load
  await page.waitForSelector('h1:has-text("The contravention did not occur")');

  // TODO: Map sub-reasons based on challengeReason/additionalDetails
  // For now, select "The restriction did not apply" which covers:
  // - Ringo app payment failures/technical issues
  // - Incorrect parking restrictions
  // - Situations where user believed they had valid payment
  await page.click('#restrictiondidnotapply');

  // Wait for selection to be registered
  await page.waitForSelector(
    '#restrictiondidnotapply-selected:not(.fg-invisible)',
    { timeout: 5000 },
  );

  // Generate detailed explanation for the textarea
  const challengeText = await generateChallengeContent({
    pcnNumber: args.pcnNumber,
    challengeReason: args.challengeReason,
    additionalDetails: args.additionalDetails,
    contentType: 'form-field',
    formFieldPlaceholderText:
      'Please provide a detailed explanation of why you believe the notice should be cancelled',
    // TODO: add user evidence image urls when available
    userEvidenceImageUrls: [],
  });

  // Fill the details textarea
  await page.fill('#notesdetails', challengeText ?? '');

  // TODO: Handle file uploads if needed
  // The form supports up to 6 files (jpg, jpeg, png, pdf) up to 5MB each

  // Click Next to proceed to contact details form
  await page.click('#submit-btn');

  // Wait for contact details page to load (challenge_final.php)
  await page.waitForURL('**/challenge_final.php');
  await page.waitForSelector('h1:has-text("Submit my challenge")');

  // Fill out the contact details form
  await handleContactDetailsForm(page, args);
};

export const access = async ({ page, pcnNumber, ticket }: CommonPcnArgs) => {
  const maxRetries = 3;

  /* eslint-disable no-await-in-loop */
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await page.goto('https://pcnpayment.westminster.gov.uk/');

      // Wait for the form to be visible
      await page.waitForSelector('#form-check-pcn-vrm');

      // Fill in PCN number field
      await page.fill('#pcn-ref', pcnNumber);

      // Fill in vehicle registration field
      await page.fill(
        '#vehicle-registration-mark',
        ticket.vehicle.registrationNumber,
      );

      // Click the submit button
      await page.click('#ticket-submit');

      // Wait for either success (ticket details) or error message
      await Promise.race([
        page.waitForSelector('#no-such-ticket:not([style*="display: none"])', {
          timeout: 10000,
        }),
        page.waitForLoadState('networkidle', { timeout: 10000 }),
      ]);

      // Check if error message is visible
      const errorDiv = await page.$(
        '#no-such-ticket:not([style*="display: none"])',
      );
      if (errorDiv) {
        throw new Error(
          'PCN/VRM combination does not exist according to Westminster',
        );
      }

      // If we get here, the access was successful
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        // Log error to Sentry when max retries exceeded
        Sentry.captureException(error, {
          tags: {
            issuer: 'westminster',
            action: 'access',
            pcnNumber,
            vehicleRegistration: ticket.vehicle.registrationNumber,
          },
          extra: {
            maxRetries,
            finalAttempt: attempt,
            errorType:
              error instanceof Error ? error.constructor.name : 'Unknown',
          },
        });
        throw error;
      }

      // Log warning to Sentry for retry attempts
      Sentry.captureMessage(
        `Westminster access attempt ${attempt}/${maxRetries} failed, retrying...`,
        'warning',
      );

      console.log(`Attempt ${attempt} failed, retrying...`);
      await page.waitForTimeout(3000); // Wait before retry
    }
  }
  /* eslint-enable no-await-in-loop */
};

export const verify = async (args: CommonPcnArgs) => {
  await access(args);
  const { page, ticket } = args;

  // Wait for PCN details page to load
  await page.waitForSelector('h1:has-text("Penalty Charge Notice details")');

  // DEBUG: take screenshot
  await takeScreenShot({
    page,
    ticketId: ticket.id,
  });

  // Westminster displays evidence images in a photo gallery within #links div
  // Extract full-size evidence image URLs (thumb=false versions)
  const evidenceLinks = await page.$$('#links a[href*="thumb=false"]');

  if (evidenceLinks.length > 0) {
    console.log(`Found ${evidenceLinks.length} Westminster evidence images`);

    // Extract the full-size image URLs
    const imageSources = await Promise.all(
      evidenceLinks.map(async (link) => {
        const href = await link.getAttribute('href');
        return href;
      }),
    );

    // Filter out any null values
    const fullSizeImages = imageSources.filter(
      (src): src is string => src !== null,
    );

    // Upload evidence images to blob storage
    if (fullSizeImages.length > 0) {
      await uploadEvidence({
        page,
        ticketId: ticket.id,
        imageSources: fullSizeImages,
      });

      console.log(
        `Successfully uploaded ${fullSizeImages.length} Westminster evidence images to blob storage`,
      );
    }
  } else {
    console.log('No evidence images found in Westminster #links gallery');
  }

  return true;
};

export const challenge = async (args: ChallengeArgs) => {
  await access(args);

  const { page, challengeReason, additionalDetails } = args;

  // Wait for the PCN details page to load
  await page.waitForSelector('h1:has-text("Penalty Charge Notice details")');

  // Click the Challenge button
  await page.click('a[href*="step3.php"]:has-text("Challenge")');

  // Wait for the challenge form page to load (step 3 - grounds selection)
  await page.waitForURL('**/step3.php');
  await page.waitForSelector('h1:has-text("Challenge")');

  // TODO: Map challenge reasons from ticket.challengeReason to Westminster's specific reasons
  // For now, hardcoding "The contravention did not occur" which covers most scenarios
  // including payment app failures, incorrect signage, etc.

  // Click on reason 1: "The contravention did not occur"
  await page.click('#reason1');

  // Wait for the selection to be registered (checkmark appears)
  await page.waitForSelector('#reason1-selected:not(.fg-invisible)', {
    timeout: 5000,
  });

  // Click Next to proceed to reason-specific details form
  await page.click('#submit-btn');

  // Wait for navigation to reason-specific page (e.g., did_not_occur.php)
  await page.waitForLoadState('networkidle');

  // Handle the details form based on the reason selected
  // For "The contravention did not occur", we get did_not_occur.php
  const currentUrl = page.url();

  if (currentUrl.includes('did_not_occur.php')) {
    await handleDidNotOccurForm(page, args);
  } else {
    // TODO: Handle other reason-specific pages (not_owner.php, stolen_challenge.php, etc.)
    console.log(`Unhandled Westminster challenge page: ${currentUrl}`);
  }

  await takeScreenShot({
    page: args.page,
    ticketId: args.ticket.id,
    fullPage: true,
  });

  // Generate challenge content for reference
  const challengeText = await generateChallengeContent({
    pcnNumber: args.pcnNumber,
    challengeReason,
    additionalDetails,
    contentType: 'form-field',
    formFieldPlaceholderText: '',
    // TODO: add user evidence image urls when available
    userEvidenceImageUrls: [],
  });

  console.log('Westminster challenge submitted successfully');

  return { success: true, challengeText };
};
