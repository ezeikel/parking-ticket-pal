import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { TicketType, TicketStatus, IssuerType } from '@prisma/client';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faCreditCard, faUser } from '@fortawesome/pro-duotone-svg-icons';

export const NAVIGATION_ITEMS = [
  {
    id: '1',
    label: 'Account',
    component: (
      <FontAwesomeIcon
        icon={faUser as IconProp}
        size="xl"
        className="text-black"
      />
    ),
    href: '/account',
  },
  {
    id: '2',
    label: 'Billing',
    component: (
      <FontAwesomeIcon
        icon={faCreditCard as IconProp}
        size="xl"
        className="text-black"
      />
    ),
    href: '/billing',
  },
];

export const AUTHENTICATED_PATHS = [
  '/dashboard',
  '/account',
  /\/ticket\/[a-zA-Z0-9]+/,
  '/billing',
];

export const BACKGROUND_INFORMATION_PROMPT = `
Imagine you are working as customer support for a company called "PCNs" that handles the management of fines related parking, moving traffic, bus lane, congestion charge, cctv enforcement and private land in the UK.
`;

export const CREATE_TICKET_PROMPT = `
Please provide the following details from the Penalty Charge Notice (PCN) image in a JSON format:

pcnNumber: [PCN Number]
type: [PARKING_CHARGE_NOTICE or PENALTY_CHARGE_NOTICE based on who issued the ticket]
dateIssued: [Date of Notice in ISO 8601 format]
dateTimeOfContravention: [Date and Time of Contravention in ISO 8601 format]
vehicleRegistration: [Vehicle Registration Number]
location: [Location where the contravention occurred, if available]
firstSeen: [Time when the vehicle was first seen in contravention, if available]
contraventionCode: [Contravention Code]
contraventionDescription: [Contravention Description]
amountDue: [Amount Due in pennies]
issuer: [Body Issuing the PCN e.g. Lambeth Council or ParkingEye Ltd]
issuerType: [COUNCIL or TFL or PRIVATE_COMPANY based on the issuer]
discountedPaymentDeadline: [Deadline for paying the discounted amount in ISO 8601 format, if available]
fullPaymentDeadline: [Deadline for paying the full amount in ISO 8601 format, if available]

Some things to note:
- Please ensure that dates and times are formatted as ISO 8601 strings.
- If you are unsure about any of the details, please leave them blank.
- Just return the JSON, no need to include any other information or response.
`;

export const TICKET_TYPE: Record<TicketType, string> = {
  [TicketType.PARKING_CHARGE_NOTICE]: 'Parking Charge Notice',
  [TicketType.PENALTY_CHARGE_NOTICE]: 'Penalty Charge Notice',
};

export const TICKET_STATUS: Record<TicketStatus, string> = {
  [TicketStatus.REDUCED_PAYMENT_DUE]: 'Reduced Payment Due',
  [TicketStatus.FULL_PAYMENT_DUE]: 'Full Payment Due',
  [TicketStatus.NOTICE_TO_OWNER_SENT]: 'Notice to Owner Sent',

  // Appeals Process
  [TicketStatus.APPEALED]: 'Appealed',
  [TicketStatus.APPEAL_ACCEPTED]: 'Appeal Accepted',
  [TicketStatus.APPEAL_REJECTED]: 'Appeal Rejected',

  // Post-Notice Appeals (Tribunal/POPLA)
  [TicketStatus.TRIBUNAL_APPEAL_IN_PROGRESS]: 'Tribunal Appeal In Progress',
  [TicketStatus.TRIBUNAL_APPEAL_ACCEPTED]: 'Tribunal Appeal Accepted',
  [TicketStatus.TRIBUNAL_APPEAL_REJECTED]: 'Tribunal Appeal Rejected',

  // Escalation
  [TicketStatus.ORDER_FOR_RECOVERY]: 'Order for Recovery',
  [TicketStatus.CCJ_PENDING]: 'CCJ Pending',
  [TicketStatus.CCJ_ISSUED]: 'CCJ Issued',

  // Resolution
  [TicketStatus.PAID]: 'Paid',
  [TicketStatus.CANCELLED]: 'Cancelled',
};

export const CREATING_CHALLENGE_LETTER_TEXT: string[] = [
  'Assembling your defense team...',
  'Consulting the parking gods...',
  'Sharpening the quills for battle...',
  'Mobilizing the legal eagles...',
  'Plotting the course through red tape...',
  'Unearthing hidden loopholes...',
  'Gathering evidence from the scene...',
  'Calibrating the justice scales...',
  'Decoding the traffic law runes...',
  'Polishing your case to a shine...',
];

export const UPLOADING_TICKET_TEXT: string[] = [
  'Focusing the lens on justice...',
  'Capturing the fine print...',
  'Snapping the secrets of the ticket...',
  'Prepping the photo lab for analysis...',
  'Aligning the evidence in frame...',
  'Zooming in on the details...',
  'Processing pixels for clues...',
  'Developing the photographic evidence...',
  'Scanning for hidden markers...',
  'Exposing the truth layer by layer...',
];

export const UK_COUNCILS = [
  {
    id: 'lewisham',
    name: 'Lewisham Council',
    shortName: 'Lewisham',
    type: IssuerType.COUNCIL,
    automationSupported: true,
    url: 'https://pcnevidence.lewisham.gov.uk/pcnonline/index.php',
    matchPatterns: [/lewisham/i, /london borough of lewisham/i],
  },
  {
    id: 'lambeth',
    name: 'Lambeth Council',
    shortName: 'Lambeth',
    type: IssuerType.COUNCIL,
    automationSupported: false,
    matchPatterns: [/lambeth/i, /london borough of lambeth/i],
  },
] as const;

export const UK_PRIVATE_COMPANIES = [
  {
    id: 'horizon',
    name: 'Horizon Parking',
    type: IssuerType.PRIVATE_COMPANY,
    automationSupported: true,
    url: 'https://horizonparkingportal.co.uk/#manage',
    matchPatterns: [/horizon parking/i, /horizon/i],
  },
  {
    id: 'parkingEye',
    name: 'ParkingEye',
    type: IssuerType.PRIVATE_COMPANY,
    automationSupported: false,
    matchPatterns: [/parking\s*eye/i, /parkingeye ltd/i],
  },
] as const;

export const UK_TRANSPORT_AUTHORITIES = [
  {
    id: 'tfl',
    name: 'Transport for London',
    type: IssuerType.TFL,
    automationSupported: false,
    matchPatterns: [/transport for london/i, /tfl/i],
  },
] as const;

export const ISSUERS = [
  ...UK_COUNCILS,
  ...UK_PRIVATE_COMPANIES,
  ...UK_TRANSPORT_AUTHORITIES,
] as const;

export const findIssuer = (text: string) =>
  ISSUERS.find((issuer) =>
    issuer.matchPatterns.some((pattern) => pattern.test(text)),
  );

export const COUNCIL_CHALLENGE_REASONS = {
  CONTRAVENTION_DID_NOT_OCCUR: {
    id: 'CONTRAVENTION_DID_NOT_OCCUR',
    label: 'The contravention did not occur',
    description:
      'Use this if you believe no parking violation actually took place',
  },
  NOT_VEHICLE_OWNER: {
    id: 'NOT_VEHICLE_OWNER',
    label: 'I was not the owner of the vehicle at the time',
    description:
      'Select if you had sold or transferred the vehicle before the ticket was issued',
  },
  VEHICLE_STOLEN: {
    id: 'VEHICLE_STOLEN',
    label: 'The vehicle had been taken without consent',
    description:
      'Use if the vehicle was reported as stolen at the time of the contravention',
  },
  HIRE_FIRM: {
    id: 'HIRE_FIRM',
    label: 'We are a hire firm and will provide details of the hirer',
    description: 'For vehicle rental companies only',
  },
  EXCEEDED_AMOUNT: {
    id: 'EXCEEDED_AMOUNT',
    label: 'The PCN exceeded the amount applicable',
    description:
      'Use if you believe the fine amount is higher than legally allowed',
  },
  ALREADY_PAID: {
    id: 'ALREADY_PAID',
    label: 'The PCN has been paid',
    description: 'Select if you have already paid this penalty',
  },
  INVALID_TMO: {
    id: 'INVALID_TMO',
    label: 'The Traffic Management Order is invalid',
    description:
      'Use if you believe the parking restriction itself is not legally valid',
  },
  PROCEDURAL_IMPROPRIETY: {
    id: 'PROCEDURAL_IMPROPRIETY',
    label: 'There has been a procedural impropriety',
    description:
      'Select if proper procedures were not followed when issuing the ticket',
  },
} as const;

export const PRIVATE_CHALLENGE_REASONS = {
  NO_BREACH_CONTRACT: {
    id: 'NO_BREACH_CONTRACT',
    label: 'No breach of contract occurred',
    description: 'The parking terms and conditions were not breached',
  },
  NOT_VEHICLE_KEEPER: {
    id: 'NOT_VEHICLE_KEEPER',
    label: 'I was not the keeper/owner of the vehicle at the time',
    description:
      'The vehicle was sold/transferred before the ticket was issued',
  },
  VEHICLE_STOLEN: {
    id: 'VEHICLE_STOLEN',
    label: 'The vehicle was stolen/taken without consent',
    description: 'The vehicle was reported as stolen at the time',
  },
  UNCLEAR_SIGNAGE: {
    id: 'UNCLEAR_SIGNAGE',
    label: 'Signs were unclear or inadequate',
    description: 'Parking terms were not clearly displayed or visible',
  },
  BROKEN_EQUIPMENT: {
    id: 'BROKEN_EQUIPMENT',
    label: 'Payment equipment was not working',
    description: 'Parking meters, machines or apps were faulty',
  },
  MITIGATING_CIRCUMSTANCES: {
    id: 'MITIGATING_CIRCUMSTANCES',
    label: 'Mitigating circumstances',
    description: 'Emergency situations or other exceptional circumstances',
  },
  ALREADY_PAID: {
    id: 'ALREADY_PAID',
    label: 'Payment was made correctly',
    description: 'You paid for parking and can provide evidence',
  },
  EXCESSIVE_CHARGE: {
    id: 'EXCESSIVE_CHARGE',
    label: 'The charge is excessive',
    description: 'The penalty amount is not a genuine pre-estimate of loss',
  },
} as const;

// Type for the challenge reasons
export type CouncilChallengeReason = keyof typeof COUNCIL_CHALLENGE_REASONS;
export type PrivateChallengeReason = keyof typeof PRIVATE_CHALLENGE_REASONS;

// Helper function to get the appropriate challenge reasons based on issuer type
export const getChallengeReasons = (issuerType: IssuerType) => {
  switch (issuerType) {
    case IssuerType.COUNCIL:
    case IssuerType.TFL:
      return COUNCIL_CHALLENGE_REASONS;
    case IssuerType.PRIVATE_COMPANY:
      return PRIVATE_CHALLENGE_REASONS;
    default:
      throw new Error(`Unknown issuer type: ${issuerType}`);
  }
};
