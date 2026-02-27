import { IssuerType } from '@/types';

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
    description: 'Use if you have already paid the penalty charge',
  },
  INVALID_TMO: {
    id: 'INVALID_TMO',
    label: 'The Traffic Management Order is invalid',
    description:
      'Select if the parking restrictions are not legally enforceable',
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
    description: 'Valid payment was made in accordance with terms',
  },
  EXCESSIVE_CHARGE: {
    id: 'EXCESSIVE_CHARGE',
    label: 'The charge is excessive',
    description: 'The penalty amount is not a genuine pre-estimate of loss',
  },
} as const;

export type CouncilChallengeReason = keyof typeof COUNCIL_CHALLENGE_REASONS;
export type PrivateChallengeReason = keyof typeof PRIVATE_CHALLENGE_REASONS;

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

export const FORM_TYPES = {
  TE7: {
    id: 'TE7',
    name: 'TE7 Form',
    description: 'Application to file a statement out of time',
    issuerTypes: [IssuerType.COUNCIL, IssuerType.TFL],
  },
  TE9: {
    id: 'TE9',
    name: 'TE9 Form',
    description: 'Witness statement - Unpaid penalty charge',
    issuerTypes: [IssuerType.COUNCIL, IssuerType.TFL],
  },
  PE2: {
    id: 'PE2',
    name: 'PE2 Form',
    description: 'Application to file a statement out of time',
    issuerTypes: [IssuerType.PRIVATE_COMPANY],
  },
  PE3: {
    id: 'PE3',
    name: 'PE3 Form',
    description: 'Statutory declaration - Unpaid penalty charge',
    issuerTypes: [IssuerType.PRIVATE_COMPANY],
  },
} as const;

export type FormType = keyof typeof FORM_TYPES;

export const getAvailableForms = (issuerType: IssuerType): FormType[] => {
  return Object.entries(FORM_TYPES)
    .filter(([_, form]) => (form.issuerTypes as readonly IssuerType[]).includes(issuerType))
    .map(([key]) => key as FormType);
};
