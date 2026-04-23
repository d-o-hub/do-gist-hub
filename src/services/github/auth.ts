/**
 * Authentication Service
 * Manages GitHub PAT storage and validation
 * 2026: Encrypted at rest using Web Cryptography API
 */

import { validateToken, clearUsernameCache } from './client';
import { resetRateLimit } from './rate-limiter';
import { setMetadata, getMetadata } from '../db';
import { safeLog, safeError, redactToken } from '../security/logger';
import { encrypt, decrypt } from '../security/crypto';

/**
 * Save GitHub PAT to secure storage
 */
export async function saveToken(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate token before saving
    const result = await validateToken(token);

    if (!result.isValid) {
      return {
        success: false,
        error: result.error || 'Invalid token',
      };
    }

    // 2026: Encrypt token before storing
    const encrypted = await encrypt(token);
    await setMetadata('github-pat-enc', encrypted);

    await setMetadata('github-username', result.username || '');
    await setMetadata('token-saved-at', Date.now());

    safeLog(`[Auth] Token saved and encrypted: ${redactToken(token)}`);
    return { success: true };
  } catch (error) {
    safeError('[Auth] Failed to save token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get stored token (returns null if not found)
 */
export async function getToken(): Promise<string | null> {
  const enc = await getMetadata<{ data: string; iv: string }>('github-pat-enc');
  if (!enc) {
    // Fallback for legacy tokens (migration)
    const legacy = await getMetadata<string>('github-pat');
    if (legacy) {
      safeLog('[Auth] Migrating legacy token to encrypted storage');
      await saveToken(legacy);
      await setMetadata('github-pat', null); // Clear legacy
      return legacy;
    }
    return null;
  }

  try {
    return await decrypt(enc.data, enc.iv);
  } catch (err) {
    safeError('[Auth] Failed to decrypt token:', err);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token && token.length > 0;
}

/**
 * Get stored username
 */
export async function getUsername(): Promise<string | null> {
  return (await getMetadata<string>('github-username')) || null;
}

/**
 * Remove token (logout)
 */
export async function removeToken(): Promise<void> {
  await setMetadata('github-pat', null);
  await setMetadata('github-pat-enc', null);
  await setMetadata('github-username', null);
  await setMetadata('token-saved-at', null);
  clearUsernameCache();
  resetRateLimit();
  safeLog('[Auth] Token removed');
}

/**
 * Get token metadata (for diagnostics)
 */
export async function getTokenInfo(): Promise<{
  hasToken: boolean;
  username: string | null;
  savedAt: number | null;
} | null> {
  const [hasToken, username, savedAt] = await Promise.all([
    isAuthenticated(),
    getUsername(),
    getMetadata<number>('token-saved-at'),
  ]);

  if (!hasToken) {
    return null;
  }

  return {
    hasToken: true,
    username,
    savedAt: savedAt || null,
  };
}

/**
 * Re-validate stored token
 */
export async function revalidateToken(): Promise<{ valid: boolean; error?: string }> {
  const token = await getToken();

  if (!token) {
    return { valid: false, error: 'No token found' };
  }

  const result = await validateToken(token);

  if (!result.isValid) {
    // Auto-remove invalid token
    await removeToken();
    return { valid: false, error: result.error };
  }

  return { valid: true };
}
