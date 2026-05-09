import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (hoisted) ───────────────────────────────────

vi.mock('../../src/services/security/crypto', () => ({
  encrypt: vi.fn().mockResolvedValue({ data: 'encrypted-data', iv: 'iv-string' }),
  decrypt: vi.fn().mockResolvedValue('decrypted-token'),
}));

vi.mock('../../src/services/db', () => {
  const getMetadata = vi.fn();
  const setMetadata = vi.fn();
  return { getMetadata, setMetadata };
});

vi.mock('../../src/services/security/logger', () => ({
  redactToken: vi.fn().mockImplementation((t) => 'REDACTED'),
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

vi.mock('../../src/services/github/client', () => ({
  validateToken: vi.fn().mockResolvedValue({ isValid: true, username: 'test-user' }),
  clearUsernameCache: vi.fn(),
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
import { safeLog, safeError } from '../../src/services/security/logger';
import { validateToken } from '../../src/services/github/client';

// ── Tests ─────────────────────────────────────

describe('Auth Service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear token cache by calling removeToken
    await removeToken();
    // Mock getMetadata to return undefined by default
    vi.mocked(getMetadata).mockImplementation((key: string) => {
      return Promise.resolve(undefined);
    });
    // Mock validateToken to return valid by default
    vi.mocked(validateToken).mockResolvedValue({ isValid: true, username: 'test-user' });
  });

  // ── getToken ────────────────────────────────────

  describe('getToken', () => {
    it('returns null when no token stored', async () => {
      vi.mocked(getMetadata).mockImplementation((key: string) => {
        if (key === 'github-pat') return Promise.resolve(undefined);
        if (key === 'github-pat-enc') return Promise.resolve(undefined);
        return Promise.resolve(undefined);
      });

      const token = await getToken();
      expect(token).toBeNull();
    });

    it('migrates and returns legacy token when it exists but no new format', async () => {
      vi.mocked(getMetadata).mockImplementation((key: string) => {
        if (key === 'github-pat') return Promise.resolve('legacy-token');
        if (key === 'github-pat-enc') return Promise.resolve(undefined);
        return Promise.resolve(undefined);
      });

      const token = await getToken();
      expect(token).toBe('legacy-token');
    });

    it('decrypts token from new format', async () => {
      vi.mocked(getMetadata).mockImplementation((key: string) => {
        if (key === 'github-pat') return Promise.resolve(undefined);
        if (key === 'github-pat-enc') return Promise.resolve({ data: 'enc-data', iv: 'iv' });
        return Promise.resolve(undefined);
      });

      vi.mocked(decrypt).mockResolvedValue('decrypted-token');

      const token = await getToken();
      expect(token).toBe('decrypted-token');
      expect(decrypt).toHaveBeenCalledWith('enc-data', 'iv');
    });

    it('handles decryption failure gracefully', async () => {
      vi.mocked(getMetadata).mockImplementation((key: string) => {
        if (key === 'github-pat') return Promise.resolve(undefined);
        if (key === 'github-pat-enc') return Promise.resolve({ data: 'enc-data', iv: 'iv' });
        return Promise.resolve(undefined);
      });

      vi.mocked(decrypt).mockRejectedValue(new Error('Decryption failed'));

      const token = await getToken();
      expect(token).toBeNull();
    });
  });

  // ── saveToken ──────────────────────────────────

  describe('saveToken', () => {
    it('encrypts and saves token', async () => {
      vi.mocked(validateToken).mockResolvedValue({ isValid: true, username: 'test-user' });
      vi.mocked(encrypt).mockResolvedValue({ data: 'enc-data', iv: 'iv' });

      const result = await saveToken('test-token');

      expect(validateToken).toHaveBeenCalledWith('test-token');
      expect(result.success).toBe(true);
      expect(encrypt).toHaveBeenCalledWith('test-token');
      expect(setMetadata).toHaveBeenCalledWith('github-pat-enc', { data: 'enc-data', iv: 'iv' });
      expect(setMetadata).toHaveBeenCalledWith('github-pat', null); // Remove legacy
    });

    it('handles encryption failure', async () => {
      vi.mocked(validateToken).mockResolvedValue({ isValid: true, username: 'test-user' });
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
      vi.mocked(getMetadata).mockImplementation((key: string) => {
        if (key === 'github-pat') return Promise.resolve(undefined);
        if (key === 'github-pat-enc') return Promise.resolve({ data: 'enc-data', iv: 'iv' });
        return Promise.resolve(undefined);
      });

      vi.mocked(decrypt).mockResolvedValue('decrypted-token');

      const result = await isAuthenticated();
      expect(result).toBe(true);
    });

    it('returns false when no token stored', async () => {
      vi.mocked(getMetadata).mockImplementation((key: string) => {
        if (key === 'github-pat') return Promise.resolve(undefined);
        if (key === 'github-pat-enc') return Promise.resolve(undefined);
        return Promise.resolve(undefined);
      });

      const result = await isAuthenticated();
      expect(result).toBe(false);
    });
  });

  // ── getUsername ─────────────────────────────

  describe('getUsername', () => {
    it('returns cached username if available', async () => {
      vi.mocked(getMetadata).mockImplementation((key: string) => {
        if (key === 'github-username') return Promise.resolve('cached-user');
        return Promise.resolve(undefined);
      });

      const first = await getUsername();
      expect(first).toBe('cached-user');

      vi.clearAllMocks();
      vi.mocked(getMetadata).mockImplementation((key: string) => {
        if (key === 'github-username') return Promise.resolve('cached-user');
        return Promise.resolve(undefined);
      });

      const second = await getUsername();
      expect(second).toBe('cached-user');
      expect(getMetadata).toHaveBeenCalledWith('github-username');
    });

    it('returns null when no username stored', async () => {
      vi.mocked(getMetadata).mockImplementation((key: string) => {
        if (key === 'github-username') return Promise.resolve(undefined);
        return Promise.resolve(undefined);
      });

      const username = await getUsername();
      expect(username).toBeNull();
    });
  });
});
