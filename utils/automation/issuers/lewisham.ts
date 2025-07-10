import { ChallengeReasonId } from '@/types';
import { getEvidenceImages } from '@/app/actions';
import generateChallengeText from '@/utils/ai/generateChallengeText';
import { CommonPcnArgs, takeScreenShot, uploadEvidence } from '../shared';

export const access = async ({ page, pcnNumber, ticket }: CommonPcnArgs) => {
  await page.goto('https://pcnevidence.lewisham.gov.uk/pcnonline/index.php');
  await page.fill('#pcn-ref', pcnNumber);
  await page.fill(
    '#vehicle-registration-mark',
    ticket.vehicle.registrationNumber,
  );
  await page.click('#ticket-submit');
  await page.waitForURL('**/step2.php');
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

// TODO: fill out the detailed reasons
export const LEWISHAM_CHALLENGE_REASONS = {
  CONTRAVENTION_DID_NOT_OCCUR: {
    description: 'The contravention did not occur',
    detailedReasons: [
      'At the time I am supposed to have been in contravention, I was loading and unloading',
      'The restriction that I am supposed to have ignored was not signed',
      'At the time I am supposed to have been in contravention, the restriction did not apply',
      'At the time I am supposed to have been in contravention, I was elsewhere',
      'I was instructed by a police officer to do this',
    ],
  },
  NOT_VEHICLE_OWNER: {
    description:
      'I was not the owner of the vehicle at the time the contravention occurred',
    detailedReasons: [],
  },
  VEHICLE_STOLEN: {
    description:
      'The vehicle had been taken without the keepers consent (i.e. it was stolen)',
    detailedReasons: [],
  },
  HIRE_FIRM: {
    description: 'We are a hire firm and will provide details of the hirer',
    detailedReasons: [],
  },
  EXCEEDED_AMOUNT: {
    description: 'The PCN exceeded the amount applicable',
    detailedReasons: [],
  },
  ALREADY_PAID: {
    description: 'The PCN has been paid',
    detailedReasons: [],
  },
  INVALID_TMO: {
    description: 'The Traffic Management Order is invalid',
    detailedReasons: [],
  },
  CEO_SERVICE: {
    description: 'The CEO was not prevented from serving the PCN',
    detailedReasons: [],
  },
  PROCEDURAL_IMPROPRIETY: {
    description:
      'There has been a procedural impropriety on the part of the enforcement authority',
    detailedReasons: [],
  },
  OTHER: {
    description: 'I wish to challenge this PCN for other reasons',
    detailedReasons: [],
  },
} as const;

export const challenge = async (
  args: CommonPcnArgs & { reason: ChallengeReasonId },
) => {
  await access(args);

  const { page, reason } = args;

  // click role of button with text "Challenge"
  await page.click('a[role="button"]:has-text("Challenge")');

  // wait for challenge.php
  await page.waitForURL('**/challenge.php');

  // Get the reason text
  const reasonObj =
    LEWISHAM_CHALLENGE_REASONS[
      reason as keyof typeof LEWISHAM_CHALLENGE_REASONS
    ];

  if (!reasonObj) {
    throw new Error(`Invalid challenge reason: ${reason}`);
  }

  // Click the list item containing the exact reason text
  await page.click(`li:has-text("${reasonObj.description}")`);

  // Click the Next button
  await page.click('#submit-btn');

  if (reason === 'CONTRAVENTION_DID_NOT_OCCUR') {
    // wait for did_not_occur.php
    await page.waitForURL('**/did_not_occur.php');

    // click on first detailed reason
    // TODO: get from user input
    await page.click(`li:has-text("${reasonObj.detailedReasons[0]}")`);
  }

  // get placeholder text for notesdetails textarea
  const notesDetailsPlaceholder = await page.$eval(
    '#notesdetails',
    (el) => (el as HTMLTextAreaElement).placeholder,
  );

  // get any evidence images
  const evidenceImagesUrls = await getEvidenceImages({
    pcnNumber: args.pcnNumber,
  });

  // get ai generated challenge text
  const challengeText = await generateChallengeText({
    pcnNumber: args.pcnNumber,
    formFieldPlaceholderText: notesDetailsPlaceholder,
    // reason and detailed reason as string
    reason: `${reasonObj.description} - ${reasonObj.detailedReasons[0]}`,
    issuerEvidenceImageUrls: evidenceImagesUrls ?? [],
    userEvidenceImageUrls: [],
  });

  // fill out textarea with challenge text
  await page.fill('#notesdetails', challengeText ?? '');

  // click the Next button to submit the challenge
  await page.click('#submit-btn:has-text("Next")');

  // wait for /challenge_final.php
  await page.waitForURL('**/challenge_final.php');

  // fill in name
  await page.fill('input[name="appelantname"]', args.ticket.vehicle.user.name);

  await page.fill('#email-input', args.ticket.vehicle.user.email);

  const { postcode } = args.ticket.vehicle.user.address;

  await page.fill('#offender-postcode', postcode);

  // click postcode lookup button postcodelookup
  await page.click('#postcodelookup');

  // wait for address modal to appear
  await page.waitForSelector('#addressModal[style="display: block;"]');

  const addressItems = await page.$$('#addressselection .list-group-item');

  const matchingAddress = await Promise.all(
    addressItems.map(async (item) => {
      const text = (await item.textContent()) || '';
      return {
        item,
        matches: text.includes(args.ticket.vehicle.user.address.line1),
      };
    }),
  );

  // click first matching address or fall back to first address in list
  const addressToClick =
    matchingAddress.find((a) => a.matches)?.item || addressItems[0];
  await addressToClick.click();

  await page.click('#addselected');

  await page.check('#checkinput');

  await takeScreenShot({
    page: args.page,
    userId: args.ticket.vehicle.user.id,
    ticketId: args.ticket.id,
    name: 'challenge-submitted',
  });

  // pause for 3 minutes
  await new Promise((resolve) => {
    setTimeout(resolve, 3 * 60 * 1000);
  });

  return true;
};
