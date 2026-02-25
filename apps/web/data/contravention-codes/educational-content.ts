import type { CodeCategory } from '@parking-ticket-pal/constants';

type FaqItem = {
  question: string;
  answer: string;
};

type CodeEducationalContent = {
  commonScenarios: string[];
  appealApproach: string[];
  additionalFaqItems: FaqItem[];
};

const onStreetDefaults: CodeEducationalContent = {
  commonScenarios: [
    'You parked on a road with yellow line restrictions during controlled hours.',
    'The parking signs or road markings in the area were unclear or partially obscured.',
    'You were loading or unloading but were still issued a ticket.',
    'Your pay-and-display ticket or permit expired while you were delayed.',
  ],
  appealApproach: [
    'Check all parking signs in the area were visible, correctly positioned, and showed the right times.',
    'Verify the yellow line markings were clear and not worn away.',
    'Request the Traffic Regulation Order (TRO) to confirm the restriction is legally valid.',
    'Check the PCN for errors — wrong date, time, location, vehicle registration, or contravention code.',
  ],
  additionalFaqItems: [
    {
      question: 'What does "prescribed hours" mean on a parking ticket?',
      answer:
        'Prescribed hours are the times during which a parking restriction applies, as shown on the accompanying signs. Outside these hours, the restriction does not apply. Always check the times shown on nearby signs — if the sign is missing or unclear, this could be grounds for appeal.',
    },
    {
      question: 'Can I appeal if the road markings were faded or missing?',
      answer:
        'Yes. If yellow lines or bay markings are so worn that they are not clearly visible, this can be valid grounds for appeal. Take photographs showing the condition of the markings as evidence.',
    },
  ],
};

const offStreetDefaults: CodeEducationalContent = {
  commonScenarios: [
    'You parked in a car park but your pay-and-display ticket had expired.',
    'You parked in a bay that was reserved for permit holders only.',
    'Your vehicle was not correctly positioned within the bay markings.',
    'You parked in a suspended bay that was not clearly marked as out of use.',
  ],
  appealApproach: [
    'Check that car park signage clearly showed the terms and conditions, including charges, time limits, and payment methods.',
    'If a payment machine was faulty, take evidence (photos, timestamp) and report it to the operator.',
    'Verify the bay markings were clear enough to park within — worn lines in car parks are a common issue.',
    'Check for a grace period — some car parks must allow a grace period before issuing a ticket.',
  ],
  additionalFaqItems: [
    {
      question:
        'Is there a grace period in car parks before a ticket can be issued?',
      answer:
        'For off-street car parks managed by councils, there is typically a 10-minute observation period before a CEO issues a PCN. Some councils also allow a grace period at the end of paid-for time. Check the signage and the relevant council policy.',
    },
    {
      question: 'What if the parking meter or payment machine was broken?',
      answer:
        'If the only available payment method was not working, this can be grounds for appeal. Take photographs of the faulty machine (showing the error or "out of order" notice) with a timestamp. If there was an alternative way to pay (e.g. phone payment), the council may argue you should have used it.',
    },
  ],
};

const movingTrafficDefaults: CodeEducationalContent = {
  commonScenarios: [
    'You were caught by CCTV driving in a bus lane during restricted hours.',
    'You entered a box junction and could not clear it before the lights changed.',
    'You made a turn that was prohibited at certain times of day.',
    'You drove into a restricted zone that only certain vehicle types could use.',
  ],
  appealApproach: [
    'Request the CCTV footage — you are entitled to see the evidence. Check the camera angle clearly shows your vehicle and the alleged contravention.',
    'Check the road signs were compliant and visible. Signs must be correctly placed, clearly visible, and show the right restriction hours.',
    'For box junctions, you may have a defence if you entered to turn right and were only prevented from clearing the box by oncoming traffic.',
    'Check whether the restriction was in force at the time — many bus lanes and turn restrictions only apply during certain hours.',
  ],
  additionalFaqItems: [
    {
      question: 'Can I appeal a bus lane PCN captured by CCTV?',
      answer:
        'Yes. Common grounds include: the bus lane sign was not visible or was obscured, the restriction was not in force at the time, you were directed into the lane by police or to avoid an emergency vehicle, or you entered the lane to avoid an obstruction. Request the CCTV footage as part of your appeal.',
    },
    {
      question: 'Is it a defence that I entered a box junction to turn right?',
      answer:
        'Partially. You are allowed to enter a box junction to turn right if your exit is clear but you are prevented from completing the turn by oncoming traffic. However, if your exit road (the right turn) was also blocked, this defence does not apply.',
    },
    {
      question: 'What is the penalty for a moving traffic contravention?',
      answer:
        'Moving traffic penalties are typically £65-£130 depending on the authority. In London, the standard amount is £130 (reduced to £65 if paid within 14 days). Outside London, the amount varies by authority but is usually £70 (reduced to £35 within 14 days).',
    },
  ],
};

const CATEGORY_CONTENT: Record<CodeCategory, CodeEducationalContent> = {
  'on-street': onStreetDefaults,
  'off-street': offStreetDefaults,
  'moving-traffic': movingTrafficDefaults,
};

/**
 * Per-code overrides for the most common codes.
 * These provide more specific scenarios and tips than the category defaults.
 */
const CODE_OVERRIDES: Partial<Record<string, Partial<CodeEducationalContent>>> =
  {
    '01': {
      commonScenarios: [
        'You parked on a single or double yellow line during controlled hours without realising the restriction was in force.',
        'You stopped briefly to drop off or pick up a passenger on a restricted street.',
        'The parking restriction sign was obscured by foliage, other signs, or street furniture.',
        'You were loading or unloading goods but spent longer than the allowed observation period.',
      ],
    },
    '05': {
      commonScenarios: [
        'Your pay-and-display ticket expired because you were delayed by a queue in a shop or appointment running late.',
        'You topped up via phone parking but the session expired before you returned.',
        'You returned to the vehicle within a few minutes of the ticket expiring.',
        'The parking meter was running slow or the time displayed was incorrect.',
      ],
    },
    '12': {
      commonScenarios: [
        "You parked in a residents' bay without a valid permit, or your permit had expired.",
        'Your visitor voucher was not properly displayed or had incorrect details.',
        'You have a valid permit but it was not visible through the windscreen.',
        'You were parked in a shared-use bay but did not have the correct payment or voucher.',
      ],
    },
    '34': {
      commonScenarios: [
        'You drove in a bus lane during restricted hours, often captured by a CCTV camera.',
        'You moved into the bus lane to avoid an obstruction or emergency vehicle.',
        'You were directed into the bus lane by road works or temporary traffic management.',
        'The bus lane signs were not clearly visible or were obscured.',
      ],
      appealApproach: [
        'Check the bus lane operating hours on the signs. Many bus lanes only operate during peak hours (e.g. 7-10am and 4-7pm).',
        'Request the CCTV footage to verify the time and confirm the restriction was in force.',
        'If you were avoiding an emergency vehicle or obstruction, provide evidence of the circumstances.',
        'Check the camera signage was compliant — cameras must be signed to be enforceable.',
      ],
    },
    '46': {
      commonScenarios: [
        'You stopped on a red route or clearway, even briefly, to drop off passengers or goods.',
        'You pulled over on a red route because of a vehicle breakdown or medical emergency.',
        'You were loading or unloading on a red route outside the marked loading bays.',
        'The red route markings or signs were not clearly visible in the area.',
      ],
    },
    '47': {
      commonScenarios: [
        'You stopped in a bus stop marked with a yellow bus stop cage.',
        'You pulled into a bus stop briefly to drop off or pick up passengers.',
        'You parked at a bus stop that appeared to be disused or had no bus service.',
        'The bus stop markings or signs were unclear or partially obscured.',
      ],
    },
    '31': {
      commonScenarios: [
        'You entered a box junction and the traffic ahead stopped, preventing you from clearing the box.',
        'You entered the box junction to turn right and were blocked by oncoming traffic, but other traffic also blocked your exit.',
        'You were pushed into the box junction by traffic behind you.',
        'The box junction markings were faded or the junction geometry was confusing.',
      ],
      appealApproach: [
        'Request the CCTV footage to see the full context — were you already committed to crossing when traffic stopped?',
        'If you were turning right and only blocked by oncoming traffic, you have a valid defence.',
        'Check whether the box junction markings were clearly visible and properly maintained.',
        'Note the traffic light sequence — if lights changed unexpectedly quickly, this may support your case.',
      ],
    },
  };

export function getEducationalContentForCode(
  code: string,
  category: CodeCategory,
): CodeEducationalContent {
  const categoryDefaults = CATEGORY_CONTENT[category];
  const override = CODE_OVERRIDES[code];

  if (!override) {
    return categoryDefaults;
  }

  return {
    commonScenarios:
      override.commonScenarios ?? categoryDefaults.commonScenarios,
    appealApproach: override.appealApproach ?? categoryDefaults.appealApproach,
    additionalFaqItems:
      override.additionalFaqItems ?? categoryDefaults.additionalFaqItems,
  };
}

export type { CodeEducationalContent, FaqItem };
