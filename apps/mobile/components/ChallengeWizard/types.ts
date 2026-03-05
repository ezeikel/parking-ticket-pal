import { IssuerType } from '@/types';

export type ChallengeWizardStep = 'reason' | 'details' | 'review';

export type ChallengeWizardData = {
  selectedReason: string;
  selectedReasonLabel: string;
  additionalDetails: string;
};

export type WinningPattern = {
  pattern: string;
  frequency: number;
};

export type LosingPattern = {
  pattern: string;
  frequency: number;
};

export type PredictionData = {
  percentage: number;
  numberOfCases: number;
  confidence: string;
  metadata?: {
    winningPatterns?: WinningPattern[];
    losingPatterns?: LosingPattern[];
  };
};

export type ChallengeWizardProps = {
  visible: boolean;
  pcnNumber: string;
  ticketId: string;
  issuerType: IssuerType;
  contraventionCode?: string;
  prediction?: PredictionData;
  onSuccess: () => void;
  onClose: () => void;
};

// Maps winning/losing pattern names to challenge reason IDs
export const PATTERN_TO_REASON: Record<string, string> = {
  SIGNAGE_INADEQUATE: 'PROCEDURAL_IMPROPRIETY',
  PROCEDURAL_ERROR: 'PROCEDURAL_IMPROPRIETY',
  TMO_INVALID: 'INVALID_TMO',
  NOTICE_NOT_SERVED: 'PROCEDURAL_IMPROPRIETY',
  LOADING_EXEMPTION: 'CONTRAVENTION_DID_NOT_OCCUR',
  PERMIT_WAS_VALID: 'CONTRAVENTION_DID_NOT_OCCUR',
  BLUE_BADGE_DISPLAYED: 'CONTRAVENTION_DID_NOT_OCCUR',
  VEHICLE_SOLD: 'NOT_VEHICLE_OWNER',
  VEHICLE_STOLEN: 'VEHICLE_STOLEN',
  HIRE_VEHICLE: 'HIRE_FIRM',
  CCTV_UNCLEAR: 'CONTRAVENTION_DID_NOT_OCCUR',
  EVIDENCE_INSUFFICIENT: 'CONTRAVENTION_DID_NOT_OCCUR',
  TIME_DISCREPANCY: 'CONTRAVENTION_DID_NOT_OCCUR',
  // Private parking patterns
  NO_BREACH_CONTRACT: 'NO_BREACH_CONTRACT',
  UNCLEAR_SIGNAGE: 'UNCLEAR_SIGNAGE',
};

export function emptyChallengeWizardData(): ChallengeWizardData {
  return {
    selectedReason: '',
    selectedReasonLabel: '',
    additionalDetails: '',
  };
}
