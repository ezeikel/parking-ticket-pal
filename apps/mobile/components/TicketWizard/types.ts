import type { Address } from '@parking-ticket-pal/types';
import type { OCRProcessingResult } from '@/hooks/api/useOCR';

export type WizardStep =
  | 'issuer'
  | 'stage'
  | 'details'
  | 'confirm'
  | 'intent'
  | 'reason'
  | 'creating';

export type IssuerType = 'council' | 'private';
export type TicketStage = 'initial' | 'nto' | 'rejection' | 'charge_cert';
export type UserIntent = 'track' | 'challenge';
export type ChallengeReason =
  | 'signage'
  | 'grace_period'
  | 'loading'
  | 'disabled'
  | 'emergency'
  | 'other';

export type WizardData = {
  pcnNumber: string;
  vehicleReg: string;
  issuerType: IssuerType | null;
  ticketStage: TicketStage | null;
  issuedAt: Date | null;
  contraventionCode: string;
  initialAmount: number;
  issuer: string;
  location: Address | null;
  intent: UserIntent | null;
  challengeReason: ChallengeReason | null;
  imageUrl?: string;
  tempImagePath?: string;
  extractedText?: string;
};

export type WizardResult = {
  ticketId: string;
  intent: UserIntent;
};

export type WizardStepProps = {
  wizardData: WizardData;
  onNext: (updates: Partial<WizardData>) => void;
  onBack: () => void;
};

export const CHALLENGE_REASONS = [
  {
    id: 'signage' as const,
    label: 'Unclear / Obscured Signage',
    desc: 'Signs were missing, hidden, or confusing',
  },
  {
    id: 'grace_period' as const,
    label: 'Grace Period / Just Over Time',
    desc: 'I was only slightly over the time limit',
  },
  {
    id: 'loading' as const,
    label: 'Loading / Unloading',
    desc: 'I was actively loading or unloading goods',
  },
  {
    id: 'disabled' as const,
    label: 'Blue Badge Holder',
    desc: 'I have a valid disabled parking badge',
  },
  {
    id: 'emergency' as const,
    label: 'Medical / Emergency',
    desc: 'There was an emergency situation',
  },
  {
    id: 'other' as const,
    label: 'Other Reason',
    desc: 'My situation is different',
  },
];

export function buildWizardDataFromOCR(ocrResult: OCRProcessingResult): WizardData {
  return {
    pcnNumber: ocrResult.data?.pcnNumber ?? '',
    vehicleReg: ocrResult.data?.vehicleReg ?? '',
    issuerType: null,
    ticketStage: null,
    issuedAt: ocrResult.data?.issuedAt ? new Date(ocrResult.data.issuedAt) : null,
    contraventionCode: ocrResult.data?.contraventionCode ?? '',
    initialAmount: ocrResult.data?.initialAmount ?? 0,
    issuer: ocrResult.data?.issuer ?? '',
    location: ocrResult.data?.location ?? null,
    intent: null,
    challengeReason: null,
    imageUrl: ocrResult.imageUrl,
    tempImagePath: ocrResult.tempImagePath,
    extractedText: ocrResult.data?.extractedText,
  };
}

export function emptyWizardData(): WizardData {
  return {
    pcnNumber: '',
    vehicleReg: '',
    issuerType: null,
    ticketStage: null,
    issuedAt: null,
    contraventionCode: '',
    initialAmount: 0,
    issuer: '',
    location: null,
    intent: null,
    challengeReason: null,
  };
}
