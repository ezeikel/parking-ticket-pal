/* eslint-disable import/prefer-default-export */
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/pro-regular-svg-icons';
import { TicketType, TicketStatus } from '@prisma/client';

export const NAVIGATION_ITEMS = [
  {
    id: '1',
    label: 'Account',
    component: (
      <FontAwesomeIcon icon={faUser} size="xl" className="text-black" />
    ),
    href: '/account',
  },
];

export const AUTHENTICATED_PATHS = [
  '/dashboard',
  '/account',
  /\/ticket\/[a-zA-Z0-9]+/,
];

export const BACKGROUND_INFORMATION_PROMPT = `
Imagine you are working as customer support for a company called "PCNs" that handles the management of fines related parking, moviing trafiic, bus lane, congestion charge, cctv enforcement and private land.
`;

export const CREATE_TICKET_PROMPT = `
Please provide the following details from the Penalty Charge Notice (PCN) image in a structured key-value format:

pcnNumber: [PCN Number]
type: [PARKING_CHARGE_NOTICE or PENALTY_CHARGE_NOTICE based on who issued the ticket]
dateIssued: [Date of Notice]
vehicleRegistration: [Vehicle Registration Number]
dateOfContravention: [Date of Contravention]
contraventionCode: [Contravention Code]
contraventionDescription: [Contravention Description]
amountDue: [Amount Due in pennies]
issuer: [Body Issuing the PCN e.g. Lambeth Council or ParkingEye Ltd]
issuerType: [COUNCIL or TFL or PRIVATE_COMPANY based on the issuer]

Some things to note:
- please ensure that dates and times are formatted as ISO 8601 strings, no need to include the time
- if you are unsure about any of the details, please leave them blank
- just return the key value pairs no need to include any other information or response
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
  [TicketStatus.FULL_PAYMENT_PLUS_INCREASE_DUE]:
    'Full Payment Plus Increase Due',
  [TicketStatus.PAID]: 'Paid',
  [TicketStatus.APPEALED]: 'Appealed',
  [TicketStatus.APPEAL_SUCCESSFUL]: 'Appeal Successful',
  [TicketStatus.APPEAL_REJECTED]: 'Appeal Rejected',
  [TicketStatus.COUNTY_COURT]: 'County Court',
  [TicketStatus.COUNTY_COURT_JUDGEMENT]: 'County Court Judgement',
  [TicketStatus.ORDER_FOR_RECOVERY]: 'Order for Recovery',
  [TicketStatus.DEBT_COLLECTION]: 'Debt Collection',
  [TicketStatus.TRIBUNAL]: 'Tribunal',
  [TicketStatus.POPLA]: 'POPLA',
};

export const LOADING_TEXT: string[] = [
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
