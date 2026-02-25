const GUEST_TICKET_KEY = 'guestTicketData';

export type GuestTicketData = {
  pcnNumber: string;
  vehicleReg: string;
  issuerType: 'council' | 'private' | null;
  ticketStage: 'initial' | 'nto' | 'rejection' | 'charge_cert' | null;
  // User intent: track (free signup) or challenge (paid)
  intent?: 'track' | 'challenge';
  challengeReason: string | null;
  // Tier is null for track flow (free)
  tier: 'premium' | null;
  imageUrl?: string;
  tempImagePath?: string;
  initialAmount?: number;
  issuer?: string;
  createdAt: string;
  // Optional email for pre-filling claim page
  email?: string;
  // Added after payment (or for track flow, marked true to allow create-ticket)
  paymentCompleted?: boolean;
  stripeSessionId?: string;
};

export const saveGuestTicketData = (data: GuestTicketData): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_TICKET_KEY, JSON.stringify(data));
};

export const getGuestTicketData = (): GuestTicketData | null => {
  if (typeof window === 'undefined') return null;

  const data = localStorage.getItem(GUEST_TICKET_KEY);
  if (!data) return null;

  try {
    return JSON.parse(data) as GuestTicketData;
  } catch {
    return null;
  }
};

export const updateGuestTicketData = (
  updates: Partial<GuestTicketData>,
): GuestTicketData | null => {
  const existing = getGuestTicketData();
  if (!existing) return null;

  const updated = { ...existing, ...updates };
  saveGuestTicketData(updated);
  return updated;
};

export const clearGuestTicketData = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_TICKET_KEY);
};

export const hasGuestTicketData = (): boolean => getGuestTicketData() !== null;

export const isGuestTicketExpired = (data: GuestTicketData): boolean => {
  const createdAt = new Date(data.createdAt);
  const now = new Date();
  const hoursSinceCreation =
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  // Expire after 24 hours
  return hoursSinceCreation > 24;
};
