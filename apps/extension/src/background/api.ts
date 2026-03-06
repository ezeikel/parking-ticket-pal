import { API_BASE_URL } from '@/shared/constants';
import { getAuth } from '@/shared/storage';
import type { ScrapedData } from '@/shared/types';

async function authHeaders(): Promise<Record<string, string>> {
  const auth = await getAuth();
  if (!auth) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    'x-user-id': auth.userId,
  };
}

export async function createTicket(data: ScrapedData): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  try {
    const headers = await authHeaders();
    const { ticket } = data;

    const body: Record<string, unknown> = {
      pcnNumber: ticket.pcnNumber,
      vehicleReg: ticket.vehicleReg?.toUpperCase(),
      issuer: ticket.issuer,
    };

    if (ticket.issuedAt) body.issuedAt = ticket.issuedAt;
    if (ticket.contraventionCode) body.contraventionCode = ticket.contraventionCode;
    if (ticket.initialAmount) body.initialAmount = ticket.initialAmount;
    // location in the API expects an AddressSchema object, not a string.
    // Store the scraped location string as extractedText for now.
    if (ticket.location) body.extractedText = `Location: ${ticket.location}`;
    // Extension-imported tickets are scraped directly from the council portal,
    // so they are automatically verified.
    body.verified = true;

    const response = await fetch(`${API_BASE_URL}/api/tickets/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to create ticket' };
    }

    return { success: true, ticketId: result.ticket.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function uploadEvidence(
  ticketId: string,
  imageUrl: string,
  description: string,
  evidenceType: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await authHeaders();

    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    const blob = await imageResponse.blob();
    const base64 = await blobToBase64(blob);

    const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/evidence`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        image: base64,
        description,
        evidenceType,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to upload evidence' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
