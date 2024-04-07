/* eslint-disable import/prefer-default-export */
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/pro-regular-svg-icons';

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


Please ensure that dates and times are formatted as ISO 8601 strings - no need to include the time. If you are unsure about any of the details, please leave them blank. Just return the key value pairs no need to include any other information or response.
`;
