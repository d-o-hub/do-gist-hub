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
  redactToken: vi.fn((t) => t),
}));

vi.mock('../../src/services/github/client', () => ({
  validateToken: vi.fn().mockResolvedValue({ isValid: true, username: 'testuser' }),
  clearUsernameCache: vi.fn(),
}));

vi.mock('../../src/services/github/rate-limiter', () => ({
  resetRateLimit: vi.fn(),
}));

// ── Imports (after mocks) ─────────────────────────────

import {
  getToken,
  saveToken,
  removeToken,
  isAuthenticated,
  getUsername,
} from '../../src/services/github/auth';
import { encrypt, decrypt } from '../../src/services/security/crypto';
import { getMetadata, setMetadata } from '../../src/services/db';

// ── Tests ─────────────────────────────────────

describe('Auth Service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear session cache by calling removeToken
    await removeToken();
    vi.clearAllMocks();
  });

  // ── getToken ────────────────────────────────────

  describe('getToken', () => {
    it('returns null when no token stored', async () => {
      vi.mocked(getMetadata).mockResolvedValue(undefined);
      const token = await getToken();
      expect(token).toBeNull();
    });

    it('returns legacy token and migrates it', async () => {
      vi.mocked(getMetadata).mockImplementation(async (key) => {
        if (key === 'github-pat') return 'legacy-token';
        return undefined;
      });

      const token = await getToken();
      expect(token).toBe('legacy-token');
    });

    it('decrypts token from new format', async () => {
      vi.mocked(getMetadata).mockImplementation(async (key) => {
        if (key === 'github-pat-enc') return { data: 'enc-data', iv: 'iv' };
        return undefined;
      });

      vi.mocked(decrypt).mockResolvedValue('decrypted-token');

      const token = await getToken();
      expect(token).toBe('decrypted-token');
      expect(decrypt).toHaveBeenCalledWith('enc-data', 'iv');
    });

    it('handles decryption failure gracefully', async () => {
      vi.mocked(getMetadata).mockImplementation(async (key) => {
        if (key === 'github-pat-enc') return { data: 'enc-data', iv: 'iv' };
        return undefined;
      });

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
      vi.mocked(getMetadata).mockImplementation(async (key) => {
        if (key === 'github-pat-enc') return { data: 'enc-data', iv: 'iv' };
        return undefined;
      });
      vi.mocked(decrypt).mockResolvedValue('some-token');

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
    it('returns stored username', async () => {
      vi.mocked(getMetadata).mockImplementation(async (key) => {
        if (key === 'github-username') return 'testuser';
        return undefined;
      });
      const username = await getUsername();
      expect(username).toBe('testuser');
    });

    it('returns null when no username stored', async () => {
      vi.mocked(getMetadata).mockResolvedValue(undefined);
      const username = await getUsername();
      expect(username).toBeNull();
    });
  });
});
