export interface AuthData {
  userId: string;
  sessionToken: string;
  email: string;
}

export interface RecentImport {
  id: string;
  pcnNumber: string;
  issuer: string;
  importedAt: string;
  ticketId: string;
}

export interface ScrapedTicketData {
  pcnNumber: string | null;
  vehicleReg: string | null;
  issuedAt: string | null;
  contraventionCode: string | null;
  initialAmount: number | null;
  issuer: string;
  issuerDisplayName: string;
  location: string | null;
}

export interface ScrapedEvidence {
  imageUrl: string;
  description: string;
  evidenceType: 'PHOTO_OF_SIGNAGE' | 'PHOTO_OF_VEHICLE' | 'WITNESS_STATEMENT' | 'PAYMENT_PROOF' | 'CORRESPONDENCE' | 'OTHER';
}

export interface ScrapedData {
  ticket: ScrapedTicketData;
  evidence: ScrapedEvidence[];
}
