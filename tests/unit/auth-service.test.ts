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
  validateToken: vi.fn().mockResolvedValue({ isValid: true, username: 'test-user' }),
  clearUsernameCache: vi.fn(),
  getCurrentUsername: vi.fn(),
}));

vi.mock('../../src/services/github/rate-limiter', () => ({
  resetRateLimit: vi.fn(),
}));

// ── Imports (after mocks) ─────────────────────────────

import { getToken, saveToken, removeToken, isAuthenticated } from '../../src/services/github/auth';
import { encrypt, decrypt } from '../../src/services/security/crypto';
import { getMetadata, setMetadata } from '../../src/services/db';

// ── Tests ─────────────────────────────────────

describe('Auth Service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await removeToken();
    vi.clearAllMocks();
  });

  describe('getToken', () => {
    it('returns null when no token stored', async () => {
      vi.mocked(getMetadata).mockResolvedValue(null);
      const token = await getToken();
      expect(token).toBeNull();
    });

    it('decrypts token from new format', async () => {
      vi.mocked(getMetadata).mockResolvedValueOnce({ data: 'enc-data', iv: 'iv' });
      vi.mocked(decrypt).mockResolvedValue('decrypted-token');

      const token = await getToken();
      expect(token).toBe('decrypted-token');
    });
  });

  describe('saveToken', () => {
    it('encrypts and saves token', async () => {
      vi.mocked(encrypt).mockResolvedValue({ data: 'enc-data', iv: 'iv' });
      const result = await saveToken('test-token');
      expect(result.success).toBe(true);
      expect(setMetadata).toHaveBeenCalledWith('github-pat-enc', { data: 'enc-data', iv: 'iv' });
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when token exists', async () => {
      vi.mocked(getMetadata).mockResolvedValue({ data: 'enc-data', iv: 'iv' });
      vi.mocked(decrypt).mockResolvedValue('test-token');
      const result = await isAuthenticated();
      expect(result).toBe(true);
    });

    it('returns false when no token stored', async () => {
      vi.mocked(getMetadata).mockResolvedValue(null);
      const result = await isAuthenticated();
      expect(result).toBe(false);
    });
  });
});
