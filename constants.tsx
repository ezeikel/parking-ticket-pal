/* eslint-disable import/prefer-default-export */
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { TicketType, TicketStatus } from '@prisma/client';
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

export const TICKET_TYPE: {
  [key in TicketType]: string;
} = {
  [TicketType.PARKING_CHARGE_NOTICE]: 'Parking Charge Notice',
  [TicketType.PENALTY_CHARGE_NOTICE]: 'Penalty Charge Notice',
};

export const TICKET_STATUS: {
  [key in TicketStatus]: string;
} = {
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
