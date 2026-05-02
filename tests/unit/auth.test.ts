import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory metadata store for mocking IndexedDB
const metadataStore = new Map<string, unknown>();

vi.mock('../../src/services/db', () => ({
  getMetadata: vi.fn(async <T>(key: string): Promise<T | undefined> => {
    return metadataStore.get(key) as T | undefined;
  }),
  setMetadata: vi.fn(async (key: string, value: unknown): Promise<void> => {
    if (value === null || value === undefined) {
      metadataStore.delete(key);
    } else {
      metadataStore.set(key, value);
    }
  }),
}));

vi.mock('../../src/services/security/crypto', () => ({
  encrypt: vi.fn(async (token: string) => ({ data: `enc-${token}`, iv: 'test-iv' })),
  decrypt: vi.fn(async (data: string, _iv: string) => data.replace(/^enc-/, '')),
}));

vi.mock('../../src/services/github/client', () => ({
  validateToken: vi.fn(),
  clearUsernameCache: vi.fn(),
}));

vi.mock('../../src/services/github/rate-limiter', () => ({
  resetRateLimit: vi.fn(),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
  redactToken: vi.fn(() => '[REDACTED]'),
}));

import {
  saveToken,
  getToken,
  isAuthenticated,
  getUsername,
  removeToken,
  getTokenInfo,
  revalidateToken,
} from '../../src/services/github/auth';
import { validateToken } from '../../src/services/github/client';
import { encrypt, decrypt } from '../../src/services/security/crypto';
import { setMetadata } from '../../src/services/db';
import { safeLog } from '../../src/services/security/logger';

describe('auth', () => {
  beforeEach(async () => {
    metadataStore.clear();
    vi.clearAllMocks();
    await removeToken(); // Reset session-level token cache
  });

  // ── saveToken ─────────────────────────────────────────────────────────────

  describe('saveToken', () => {
    it('succeeds with valid token', async () => {
      vi.mocked(validateToken).mockResolvedValue({ isValid: true, username: 'testuser' });

      const result = await saveToken('ghp_validtoken');

      expect(result.success).toBe(true);
    });

    it('fails with invalid token (validateToken returns false)', async () => {
      vi.mocked(validateToken).mockResolvedValue({ isValid: false, error: 'Bad credentials' });

      const result = await saveToken('ghp_invalidtoken');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bad credentials');
    });

    it('encrypts and stores token + username + timestamp', async () => {
      vi.mocked(validateToken).mockResolvedValue({ isValid: true, username: 'testuser' });

      await saveToken('ghp_validtoken');

      expect(encrypt).toHaveBeenCalledWith('ghp_validtoken');
      expect(setMetadata).toHaveBeenCalledWith('github-pat-enc', {
        data: 'enc-ghp_validtoken',
        iv: 'test-iv',
      });
      expect(setMetadata).toHaveBeenCalledWith('github-username', 'testuser');
      expect(setMetadata).toHaveBeenCalledWith('token-saved-at', expect.any(Number));
    });
  });

  // ── getToken ──────────────────────────────────────────────────────────────

  describe('getToken', () => {
    it('returns cached token without re-decrypting', async () => {
      metadataStore.set('github-pat-enc', { data: 'enc-cachedtoken', iv: 'test-iv' });

      const first = await getToken();
      expect(first).toBe('cachedtoken');
      expect(decrypt).toHaveBeenCalledTimes(1);

      const second = await getToken();
      expect(second).toBe('cachedtoken');
      expect(decrypt).toHaveBeenCalledTimes(1);
    });

    it('decrypts from storage when cache miss', async () => {
      metadataStore.set('github-pat-enc', { data: 'enc-storagetoken', iv: 'test-iv' });

      const token = await getToken();

      expect(token).toBe('storagetoken');
      expect(decrypt).toHaveBeenCalledWith('enc-storagetoken', 'test-iv');
    });

    it('handles legacy token migration', async () => {
      vi.mocked(validateToken).mockResolvedValue({ isValid: true, username: 'legacyuser' });
      metadataStore.set('github-pat', 'legacy-token-value');

      const token = await getToken();

      expect(token).toBe('legacy-token-value');
      expect(validateToken).toHaveBeenCalledWith('legacy-token-value');
      expect(encrypt).toHaveBeenCalledWith('legacy-token-value');
      expect(setMetadata).toHaveBeenCalledWith('github-pat', null);
    });

    it('returns null when no token exists', async () => {
      const token = await getToken();
      expect(token).toBeNull();
    });
  });

  // ── isAuthenticated ───────────────────────────────────────────────────────

  describe('isAuthenticated', () => {
    it('returns true when token exists', async () => {
      metadataStore.set('github-pat-enc', { data: 'enc-token', iv: 'test-iv' });

      const result = await isAuthenticated();

      expect(result).toBe(true);
    });

    it('returns false when no token', async () => {
      const result = await isAuthenticated();

      expect(result).toBe(false);
    });
  });

  // ── removeToken ───────────────────────────────────────────────────────────

  describe('removeToken', () => {
    it('clears all metadata and cache', async () => {
      metadataStore.set('github-pat-enc', { data: 'enc-token', iv: 'test-iv' });
      metadataStore.set('github-username', 'testuser');
      metadataStore.set('token-saved-at', 1234567890);

      await removeToken();

      expect(setMetadata).toHaveBeenCalledWith('github-pat', null);
      expect(setMetadata).toHaveBeenCalledWith('github-pat-enc', null);
      expect(setMetadata).toHaveBeenCalledWith('github-username', null);
      expect(setMetadata).toHaveBeenCalledWith('token-saved-at', null);
      expect(safeLog).toHaveBeenCalledWith('[Auth] Token removed');

      const after = await getToken();
      expect(after).toBeNull();
    });
  });

  // ── getTokenInfo ──────────────────────────────────────────────────────────

  describe('getTokenInfo', () => {
    it('returns null when not authenticated', async () => {
      const info = await getTokenInfo();
      expect(info).toBeNull();
    });

    it('returns info object when authenticated', async () => {
      metadataStore.set('github-pat-enc', { data: 'enc-token', iv: 'test-iv' });
      metadataStore.set('github-username', 'alice');
      metadataStore.set('token-saved-at', 1700000000000);

      const info = await getTokenInfo();

      expect(info).toEqual({
        hasToken: true,
        username: 'alice',
        savedAt: 1700000000000,
      });
    });
  });

  // ── revalidateToken ───────────────────────────────────────────────────────

  describe('revalidateToken', () => {
    it('returns valid=true for good token', async () => {
      metadataStore.set('github-pat-enc', { data: 'enc-goodtoken', iv: 'test-iv' });
      vi.mocked(validateToken).mockResolvedValue({ isValid: true, username: 'gooduser' });

      const result = await revalidateToken();

      expect(result.valid).toBe(true);
    });

    it('auto-removes and returns valid=false for bad token', async () => {
      metadataStore.set('github-pat-enc', { data: 'enc-badtoken', iv: 'test-iv' });
      vi.mocked(validateToken).mockResolvedValue({ isValid: false, error: 'Expired token' });

      const result = await revalidateToken();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Expired token');

      const after = await getToken();
      expect(after).toBeNull();
    });
  });

  // ── getUsername ───────────────────────────────────────────────────────────

  describe('getUsername', () => {
    it('returns stored username', async () => {
      metadataStore.set('github-username', 'bob');

      const username = await getUsername();

      expect(username).toBe('bob');
    });

    it('returns null when no username', async () => {
      const username = await getUsername();

      expect(username).toBeNull();
    });
  });
});
