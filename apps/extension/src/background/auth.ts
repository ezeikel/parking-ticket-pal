import { API_BASE_URL } from '@/shared/constants';
import { setAuth, clearAuth, getAuth } from '@/shared/storage';
import type { AuthData } from '@/shared/types';

export async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/extension/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send magic link' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

export async function handleAuthReceived(data: AuthData): Promise<void> {
  await setAuth(data);
}

export async function logout(): Promise<void> {
  await clearAuth();
}

export { getAuth };
