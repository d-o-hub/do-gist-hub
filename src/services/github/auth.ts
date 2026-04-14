/**
 * Authentication Service
 * Manages GitHub PAT storage and validation
 */

import { validateToken, clearUsernameCache } from './client';
import { resetRateLimit } from './rate-limiter';
import { setMetadata, getMetadata } from '../db';
import { safeLog, safeError, redactToken } from '../security/logger';

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

    // Store token in IndexedDB (encrypted at rest would be ideal, but browser limitations)
    await setMetadata('github-pat', token);
    await setMetadata('github-username', result.username || '');
    await setMetadata('token-saved-at', Date.now());

    safeLog(`[Auth] Token saved successfully: ${redactToken(token)}`);
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
  return (await getMetadata<string>('github-pat')) || null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  if (!token) {
    return false;
  }

  // Quick validation without full API call
  return token.length > 0;
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
