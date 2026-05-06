import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (hoisted) ───────────────────────────────────

vi.mock('../../src/services/security/crypto', () => ({
  encrypt: vi.fn().mockResolvedValue({ data: 'encrypted-data', iv: 'iv-string' }),
  decrypt: vi.fn().mockResolvedValue('decrypted-token'),
}));

vi.mock('../../src/services/db', () => ({
  getMetadata: vi.fn(),
  setMetadata: vi.fn(),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

vi.mock('../../src/services/github/client', () => ({
  validateToken: vi.fn().mockResolvedValue({ isValid: true, username: 'testuser' }),
  resetRateLimit: vi.fn(),
}));

// ── Imports (after mocks) ─────────────────────────────

import {
  getToken,
  saveToken,
  removeToken,
  isAuthenticated,
  getUsername,
  clearUsernameCache,
} from '../../src/services/github/auth';
import { encrypt, decrypt } from '../../src/services/security/crypto';
import { getMetadata, setMetadata } from '../../src/services/db';
import { safeLog, safeError } from '../../src/services/security/logger';

// ── Tests ─────────────────────────────────────

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear module-level cache by resetting the mock implementation
    vi.mocked(getMetadata).mockReset();
    vi.mocked(setMetadata).mockReset();
  });

  // ── getToken ────────────────────────────────────

  describe('getToken', () => {
    it('returns null when no token stored', async () => {
      vi.mocked(getMetadata).mockResolvedValue(undefined);

      const token = await getToken();
      expect(token).toBeNull();
    });

    it('returns null when legacy token exists but no new format', async () => {
      vi.mocked(getMetadata)
        .mockResolvedValueOnce({ data: 'enc-data', iv: 'iv' }) // github-pat-enc first call
        .mockResolvedValueOnce(undefined); // github-pat fallback (shouldn't reach here in this test)

      const token = await getToken();
      expect(token).toBeNull();
    });

    it('decrypts token from new format', async () => {
      vi.mocked(getMetadata).mockResolvedValue({ data: 'enc-data', iv: 'iv' });
      vi.mocked(decrypt).mockResolvedValue('decrypted-token');

      const token = await getToken();
      expect(token).toBe('decrypted-token');
      expect(decrypt).toHaveBeenCalledWith({ data: 'enc-data', iv: 'iv' });
    });

    it('handles decryption failure gracefully', async () => {
      vi.mocked(getMetadata).mockResolvedValue({ data: 'enc-data', iv: 'iv' });
      vi.mocked(decrypt).mockRejectedValue(new Error('Decryption failed'));

      const token = await getToken();
      expect(token).toBeNull();
    });
  });

  // ── saveToken ──────────────────────────────────

  describe('saveToken', () => {
    it('encrypts and saves token', async () => {
      vi.mocked(encrypt).mockResolvedValue({ data: 'enc-data', iv: 'iv' });

      const result = await saveToken('test-token');

      expect(result.success).toBe(true);
      expect(encrypt).toHaveBeenCalledWith('test-token');
      expect(setMetadata).toHaveBeenCalledWith('github-pat-enc', { data: 'enc-data', iv: 'iv' });
      expect(setMetadata).toHaveBeenCalledWith('github-pat', null); // Remove legacy
    });

    it('handles encryption failure', async () => {
      vi.mocked(encrypt).mockRejectedValue(new Error('Encryption failed'));

      const result = await saveToken('test-token');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Encryption failed');
    });
  });

  // ── removeToken ─────────────────────────────────

  describe('removeToken', () => {
    it('removes token from storage', async () => {
      await removeToken();

      expect(setMetadata).toHaveBeenCalledWith('github-pat', null);
      expect(setMetadata).toHaveBeenCalledWith('github-pat-enc', null);
      expect(setMetadata).toHaveBeenCalledWith('github-username', null);
    });
  });

  // ── isAuthenticated ─────────────────────────────

  describe('isAuthenticated', () => {
    it('returns true when token exists', async () => {
      vi.mocked(getMetadata).mockResolvedValue({ data: 'enc-data', iv: 'iv' });

      const result = await isAuthenticated();
      expect(result).toBe(true);
    });

    it('returns false when no token stored', async () => {
      vi.mocked(getMetadata).mockResolvedValue(undefined);

      const result = await isAuthenticated();
      expect(result).toBe(false);
    });
  });

  // ── getUsername ────────────────────────────────

  describe('getUsername', () => {
    it('returns cached username if available', async () => {
      vi.mocked(getMetadata).mockResolvedValue('cached-user');

      const first = await getUsername();
      expect(first).toBe('cached-user');
    });

    it('returns null when no username stored', async () => {
      vi.mocked(getMetadata).mockResolvedValue(undefined);
      const username = await getUsername();
      expect(username).toBeNull();
    });
  });
});
