import { EvidenceType } from '@parking-ticket-pal/db/types';

export const evidenceTypeOptions: { value: EvidenceType; label: string }[] = [
  { value: EvidenceType.PHOTO_OF_SIGNAGE, label: 'Photo of Signage' },
  { value: EvidenceType.PHOTO_OF_VEHICLE, label: 'Photo of Vehicle' },
  { value: EvidenceType.WITNESS_STATEMENT, label: 'Witness Statement' },
  { value: EvidenceType.PAYMENT_PROOF, label: 'Proof of Payment' },
  { value: EvidenceType.CORRESPONDENCE, label: 'Correspondence' },
  { value: EvidenceType.OTHER, label: 'Other' },
];
