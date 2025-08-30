import * as Sentry from '@sentry/nextjs';
import generateChallengeContent from '@/utils/ai/generateChallengeContent';
// import { getEvidenceImages } from '@/app/actions';
import {
  ChallengeArgs,
  CommonPcnArgs,
  takeScreenShot,
  uploadEvidence,
} from '../shared';

// TODO: Lewisham have updated their website - have started to update challenge but verify needs to be updated
// TODO: evidence images are in a div with the id "imageListViewGridMain" - need to get the src of each image and upload to blob storage
// TODO: div with text "Outstanding Charge"
// TODO: div with text "Payment Status"

export const access = async ({ page, pcnNumber, ticket }: CommonPcnArgs) => {
  const maxRetries = 3;

  /* eslint-disable no-await-in-loop */
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await page.goto(
        'https://pcnevidence.lewisham.gov.uk/pcnonline/index.php',
      );
      await page.fill('#txt_penalityChargeNotice', pcnNumber);
      await page.fill(
        '#txt_vehicleRegistrationNumber',
        ticket.vehicle.registrationNumber,
      );

      // Check if the search button is disabled due to non-human activity detection
      const searchButton = await page.$('#btn_Search');
      const isDisabled = await searchButton?.getAttribute('disabled');

      if (isDisabled) {
        // Check for the captcha verification message
        const captchaMessage = await page.$('.captchaVerificationStatus');
        if (captchaMessage) {
          const messageText = await captchaMessage.textContent();
          if (messageText?.includes('Non-human activity has been detected')) {
            console.info(
              `Attempt ${attempt}: Non-human activity detected, refreshing page...`,
            );

            // Log warning to Sentry for retry attempts
            Sentry.captureMessage(
              `Lewisham non-human activity detected on attempt ${attempt}/${maxRetries}`,
              'warning',
            );

            // Wait a bit before refreshing to avoid being too aggressive
            await page.waitForTimeout(2000);

            if (attempt < maxRetries) {
              // eslint-disable-next-line no-continue
              continue; // Try again
            } else {
              // Log error to Sentry when max retries exceeded
              Sentry.captureException(
                new Error(
                  `Max retries (${maxRetries}) exceeded due to non-human activity detection on Lewisham website`,
                ),
                {
                  tags: {
                    issuer: 'lewisham',
                    action: 'access',
                    pcnNumber,
                    vehicleRegistration: ticket.vehicle.registrationNumber,
                  },
                  extra: {
                    maxRetries,
                    finalAttempt: attempt,
                  },
                },
              );

              throw new Error(
                'Max retries reached due to non-human activity detection',
              );
            }
          }
        }
      }

      await page.click('#btn_Search');
      await page.waitForURL('**/ticketdetails');

      // If we get here, the access was successful
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        // Log error to Sentry when max retries exceeded for general errors
        Sentry.captureException(error, {
          tags: {
            issuer: 'lewisham',
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

      // Log warning to Sentry for general retry attempts
      Sentry.captureMessage(
        `Lewisham access attempt ${attempt}/${maxRetries} failed, retrying...`,
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

  await page.waitForSelector('h1:has-text("Penalty Charge Notice details")');

  // DEBUG: take screenshot
  await takeScreenShot({
    page,
    userId: ticket.vehicle.user.id,
    ticketId: ticket.id,
  });

  // click the first image to open the gallery
  await page.click('#links a:first-child');
  await page.waitForSelector('#blueimp-image-gallery');

  // get all image sources from the gallery
  const images = await page.$$('#blueimp-image-gallery .slides img');

  const imageSources = await Promise.all(
    images.map(async (img) => {
      const src = await img.getAttribute('src');
      return src;
    }),
  );

  // ignore thumbnails
  const fullSizeImages = imageSources.filter(
    (src): src is string => src !== null && src.includes('thumb=false'),
  );

  // upload evidence images to blob storage
  if (fullSizeImages.length > 0) {
    await uploadEvidence({
      page,
      userId: ticket.vehicle.user.id,
      ticketId: ticket.id,
      imageSources: fullSizeImages,
    });
  }

  // close the gallery
  await page.click('#blueimp-image-gallery a.close');

  // pause for 3 minutes
  await new Promise((resolve) => {
    setTimeout(resolve, 3 * 60 * 1000);
  });

  return true;
};

// Lewisham has simplified their challenge process - no need for specific reason mapping

export const challenge = async (args: ChallengeArgs) => {
  await access(args);

  const { page, challengeReason, additionalDetails } = args;

  await page.click('#btn_Challenge');

  // wait for contact page
  await page.waitForURL('**/contact');

  // fill out the contact form with ticket information
  const { user } = args.ticket.vehicle;

  // fill title (assuming Mr/Mrs/Ms based on name or defaulting to Mr)
  await page.click('#Title');
  await page.click('li:has-text("Mr")'); // Default to Mr, could be made dynamic

  // fill first name
  await page.fill('#txt_First_Name', user.name.split(' ')[0] || '');

  // fill surname
  await page.fill(
    '#txt_Surname',
    user.name.split(' ').slice(1).join(' ') || '',
  );

  // fill email address
  await page.fill('#txt_Email_Address', user.email);

  // fill confirm email address
  await page.fill('#txt_ConfirmEmail', user.email);

  // fill address line 1
  await page.fill('#txt_Line_1', user.address.line1);

  // fill address line 2 if available
  if (user.address.line2) {
    await page.fill('#txt_Line_2', user.address.line2);
  }

  // fill town
  await page.fill('#txt_Town', user.address.city || '');

  // fill postcode
  await page.fill('#txt_Post_Code', user.address.postcode);

  // util function to generate challenge text
  const challengeText = await generateChallengeContent({
    pcnNumber: args.pcnNumber,
    challengeReason,
    additionalDetails,
    contentType: 'form-field',
    formFieldPlaceholderText: '',
    // TODO: add user evidence image urls
    userEvidenceImageUrls: [],
  });

  // fill out textarea with challenge text
  await page.fill('#mtxt_Notes', challengeText ?? '');

  await takeScreenShot({
    page: args.page,
    userId: args.ticket.vehicle.user.id,
    ticketId: args.ticket.id,
    name: 'challenge-pre-submit',
    fullPage: true,
  });

  // click the Submit button to submit the challenge
  await page.click('#Submit');

  await takeScreenShot({
    page: args.page,
    userId: args.ticket.vehicle.user.id,
    ticketId: args.ticket.id,
    name: 'challenge-submitted',
  });

  return { success: true, challengeText };
};
