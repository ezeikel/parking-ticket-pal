const GUEST_LETTER_KEY = 'guestLetterData';

export type GuestLetterData = {
  pcnNumber: string;
  vehicleReg: string;
  letterType: string; // LetterType enum value
  summary: string;
  sentAt: string; // ISO string
  issuedAt?: string; // ISO string - original PCN issue date
  currentAmount?: number; // pence
  imageUrl?: string;
  tempImagePath?: string;
  extractedText?: string;
  createdAt: string; // ISO string
  paymentCompleted?: boolean;
  issuer?: string;
  issuerType?: string;
  location?: any;
  initialAmount?: number;
  contraventionCode?: string;
};

export const saveGuestLetterData = (data: GuestLetterData): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_LETTER_KEY, JSON.stringify(data));
};

export const getGuestLetterData = (): GuestLetterData | null => {
  if (typeof window === 'undefined') return null;

  const data = localStorage.getItem(GUEST_LETTER_KEY);
  if (!data) return null;

  try {
    return JSON.parse(data) as GuestLetterData;
  } catch {
    return null;
  }
};

export const updateGuestLetterData = (
  updates: Partial<GuestLetterData>,
): GuestLetterData | null => {
  const existing = getGuestLetterData();
  if (!existing) return null;

  const updated = { ...existing, ...updates };
  saveGuestLetterData(updated);
  return updated;
};

export const clearGuestLetterData = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_LETTER_KEY);
};

export const hasGuestLetterData = (): boolean => getGuestLetterData() !== null;

export const isGuestLetterExpired = (data: GuestLetterData): boolean => {
  const createdAt = new Date(data.createdAt);
  const now = new Date();
  const hoursSinceCreation =
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  // Expire after 24 hours
  return hoursSinceCreation > 24;
};
