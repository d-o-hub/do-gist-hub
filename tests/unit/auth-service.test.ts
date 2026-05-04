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

// ── Imports (after mocks) ─────────────────────────────

import { getToken, saveToken, removeToken } from '../../src/services/github/auth';
import { encrypt, decrypt } from '../../src/services/security/crypto';
import { getMetadata, setMetadata } from '../../src/services/db';
import { safeLog, safeError } from '../../src/services/security/logger';

// ── Tests ─────────────────────────────────────

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        .mockResolvedValueOnce('legacy-token')  // github-pat
        .mockResolvedValueOnce(undefined);  // github-pat-enc

      const token = await getToken();
      expect(token).toBeNull();
    });

    it('decrypts token from new format', async () => {
      vi.mocked(getMetadata)
        .mockResolvedValueOnce(undefined)  // github-pat (legacy)
        .mockResolvedValueOnce({ data: 'enc-data', iv: 'iv' });  // github-pat-enc

      vi.mocked(decrypt).mockResolvedValue('decrypted-token');

      const token = await getToken();
      expect(token).toBe('decrypted-token');
      expect(decrypt).toHaveBeenCalledWith({ data: 'enc-data', iv: 'iv' });
    });

    it('handles decryption failure gracefully', async () => {
      vi.mocked(getMetadata)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ data: 'enc-data', iv: 'iv' });

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
      expect(setMetadata).toHaveBeenCalledWith('github-pat', null);  // Remove legacy
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
  describe('isAuthenticated', () => {
    it('returns true when token exists', async () => {
      vi.mocked(getMetadata)
        .mockResolvedValueOnce(undefined)  // github-pat check
        .mockResolvedValueOnce({ data: 'enc-data', iv: 'iv' });  // github-pat-enc

      const result = await isAuthenticated();
      expect(result).toBe(true);
    });

    it('returns false when no token stored', async () => {
      vi.mocked(getMetadata)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const result = await isAuthenticated();
      expect(result).toBe(false);
    });
  });
});
});
