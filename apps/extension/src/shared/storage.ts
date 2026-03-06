import { STORAGE_KEYS } from './constants';
import type { AuthData, RecentImport } from './types';

export async function getAuth(): Promise<AuthData | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH);
  return result[STORAGE_KEYS.AUTH] ?? null;
}

export async function setAuth(data: AuthData): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.AUTH]: data });
}

export async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.AUTH);
}

export async function getRecentImports(): Promise<RecentImport[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.RECENT_IMPORTS);
  return result[STORAGE_KEYS.RECENT_IMPORTS] ?? [];
}

export async function addRecentImport(entry: RecentImport): Promise<void> {
  const imports = await getRecentImports();
  imports.unshift(entry);
  // Keep only last 20
  await chrome.storage.local.set({
    [STORAGE_KEYS.RECENT_IMPORTS]: imports.slice(0, 20),
  });
}
