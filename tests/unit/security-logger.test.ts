import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Build token-like strings at runtime so secret-scanners
 * (gitleaks, truffleHog, Codacy) don't flag this file.
 */
function gh(prefix: string, body: string): string {
  return `${prefix}_${body}`;
}
const PAT_BODY = `1234567890abcdefghijklmnopqrstuvwxyz`;
const PAT = gh('ghp', PAT_BODY);
const FINE_PAT = `github_pat_${'11AAAAAAA0'}${'9876543210987654321'}${'0987654321098765432109876543210987654321098765432109876543210987'}`;
const REFRESH = gh('ghr', `${PAT_BODY}valid`);
const USER_TOK = gh('ghu', `${PAT_BODY}valid`);
const INSTALL = gh('ghs', `${PAT_BODY}valid`);
const OAUTH = gh('gho', `${PAT_BODY}valid`);
const JWT_SEG1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
const JWT_SEG2 = 'eyJzdWIiOiIxMjM0NTY3ODkwIn0';
const JWT = `${JWT_SEG1}.${JWT_SEG2}`;

// ─── Mocks ─────────────────────────────────────────────────────────

const mockDb = {
  add: vi.fn().mockResolvedValue(undefined),
  count: vi.fn().mockResolvedValue(0),
  getAllKeysFromIndex: vi.fn().mockResolvedValue([]),
  getAllFromIndex: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
  transaction: vi.fn(() => ({
    objectStore: vi.fn(() => ({
      delete: vi.fn().mockResolvedValue(undefined),
    })),
    done: Promise.resolve(),
  })),
};

vi.mock('../../src/services/db', () => ({
  getDB: vi.fn(() => mockDb),
  isDBReady: vi.fn(() => true),
}));

import { getDB, isDBReady } from '../../src/services/db';
import {
  clearOfflineLogs,
  getOfflineLogs,
  persistLog,
  redactAny,
  redactSecrets,
  redactToken,
  safeError,
  safeLog,
  safeWarn,
} from '../../src/services/security/logger.ts';

describe('security logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isDBReady).mockReturnValue(true);
    vi.mocked(getDB).mockReturnValue(mockDb);
  });

  // ── redactToken ──────────────────────────────────────────────────

  describe('redactToken', () => {
    it('always returns [REDACTED] regardless of input', () => {
      expect(redactToken('any-token')).toBe('[REDACTED]');
      expect(redactToken('')).toBe('[REDACTED]');
      expect(redactToken(gh('ghp', 'superSecretToken'))).toBe('[REDACTED]');
    });
  });

  // ── redactSecrets ────────────────────────────────────────────────

  describe('redactSecrets', () => {
    it('should redact various PAT patterns', () => {
      const input = `My token is ${PAT} and fine-grained is ${FINE_PAT}`;
      const expected = 'My token is [REDACTED] and fine-grained is [REDACTED]';
      expect(redactSecrets(input)).toBe(expected);
    });

    it('should redact ghr, ghu, ghs token patterns', () => {
      expect(redactSecrets(`refresh: ${REFRESH}`)).toBe('refresh: [REDACTED]');
      expect(redactSecrets(`user: ${USER_TOK}`)).toBe('user: [REDACTED]');
      expect(redactSecrets(`install: ${INSTALL}`)).toBe('install: [REDACTED]');
    });

    it('should handle strings', () => {
      expect(redactAny(PAT)).toBe('[REDACTED]');
      expect(redactAny('safe string')).toBe('safe string');
    });

    it('should handle objects', () => {
      const obj = {
        token: PAT,
        nested: {
          secret: FINE_PAT,
        },
        safe: 123,
      };
      const redacted = redactAny(obj) as {
        token: string;
        nested: { secret: string };
        safe: number;
      };
      expect(redacted.token).toBe('[REDACTED]');
      expect(redacted.nested.secret).toBe('[REDACTED]');
      expect(redacted.safe).toBe(123);
    });

    it('should handle arrays', () => {
      const arr = [PAT, { key: PAT }];
      const redacted = redactAny(arr) as [string, { key: string }];
      expect(redacted[0]).toBe('[REDACTED]');
      expect(redacted[1].key).toBe('[REDACTED]');
    });

    it('should handle circular references', () => {
      const obj: Record<string, unknown> = { name: 'circular' };
      obj.self = obj;
      const redacted = redactAny(obj) as { name: string; self: string };
      expect(redacted.name).toBe('circular');
      expect(redacted.self).toBe('[CIRCULAR]');
    });

    it('should handle Errors', () => {
      const err = new Error(`Failed with ${PAT}`);
      const redacted = redactAny(err) as Error;
      expect(redacted.message).toBe('Failed with [REDACTED]');
      expect(redacted.stack?.includes('[REDACTED]')).toBe(true);
    });

    it('handles Error with circular reference', () => {
      const err = new Error('test error');
      const seen = new WeakSet();
      seen.add(err);
      // The Error branch returns string '[CIRCULAR]' directly, not an Error object
      const result = redactAny(err, 0, seen);
      expect(result).toBe('[CIRCULAR]');
    });

    it('handles null input', () => {
      expect(redactAny(null)).toBeNull();
    });

    it('handles undefined input', () => {
      expect(redactAny(undefined)).toBeUndefined();
    });

    it('does not trigger DEPTH_EXCEEDED at depth 10 boundary', () => {
      // depth 9 start, nested 1 level: outer at 9, inner at 10 (not >10), passes
      const obj = { a: 'secret' };
      const result = redactAny(obj, 9);
      expect(result).toEqual({ a: 'secret' });
    });

    it('triggers DEPTH_EXCEEDED at depth 11 (mutation >10 boundary)', () => {
      // depth 9 start, nested 2 levels: outer at 9, mid at 10, leaf at 11 (>10) → DEPTH_EXCEEDED
      const obj = { a: { b: 'secret' } };
      const result = redactAny(obj, 9);
      expect(result).toEqual({ a: { b: '[DEPTH_EXCEEDED]' } });
    });

    it('handles depth limit exceeded', () => {
      // Build a deeply nested object dynamically to avoid parser nesting limits.
      // At depth 10, the first level processes normally, then nested property hits depth 11
      // which exceeds the limit, returning { nested: '[DEPTH_EXCEEDED]' }.
      let deeplyNested: Record<string, unknown> = { k: 'secret' };
      for (let i = 0; i < 12; i++) {
        deeplyNested = { val: deeplyNested };
      }
      // Call with depth 10 so the top-level recursion succeeds but first
      // nested level hits the limit
      const result = redactAny(deeplyNested, 10);
      // The outer object is processed at depth 10 (not exceeding),
      // but the nested value at depth 11 triggers '[DEPTH_EXCEEDED]'
      expect(result).toEqual({ val: '[DEPTH_EXCEEDED]' });
    });

    it('handles object circular reference', () => {
      const obj: Record<string, unknown> = { name: 'test' };
      obj.itself = obj;
      const redacted = redactAny(obj) as { name: string; itself: string };
      expect(redacted.name).toBe('test');
      expect(redacted.itself).toBe('[CIRCULAR]');
    });

    it('redacts Bearer token pattern in strings', () => {
      const result = redactSecrets(`Authorization: Bearer ${JWT}`);
      expect(result).toBe('Authorization: [REDACTED]');
    });

    it('redacts Bearer tokens with Base64 characters and padding', () => {
      const result = redactSecrets('Bearer a+b/c1234567890abcdef1234567890def==');
      expect(result).toBe('[REDACTED]');
    });

    it('redacts gho_ OAuth token pattern', () => {
      const result = redactSecrets(`Token: ${OAUTH}`);
      expect(result).toBe('Token: [REDACTED]');
    });

    it('redacts token keyword header', () => {
      const result = redactSecrets('API call with token abcdefghijklmnopqrstuvwxyz');
      expect(result).toBe('API call with [REDACTED]');
    });

    it('returns input unchanged when no secrets present', () => {
      expect(redactSecrets('safe message')).toBe('safe message');
    });

    it('returns empty/falsy input unchanged', () => {
      expect(redactSecrets('')).toBe('');
      expect(redactSecrets(null as unknown as string)).toBeNull();
    });
  });

  // ── persistLog ────────────────────────────────────────────────────

  describe('persistLog', () => {
    it('skips persistence when DB is not ready', async () => {
      vi.mocked(isDBReady).mockReturnValue(false);
      await persistLog('info', 'test message');
      expect(getDB).not.toHaveBeenCalled();
    });

    it('persists log entry when DB is ready', async () => {
      await persistLog('info', 'test message', { key: 'value' });
      expect(mockDb.add).toHaveBeenCalledWith(
        'logs',
        expect.objectContaining({
          level: 'info',
          message: 'test message',
          data: { key: 'value' },
        })
      );
    });

    it('persists error level logs', async () => {
      await persistLog('error', 'error message', new Error('test'));
      expect(mockDb.add).toHaveBeenCalledWith(
        'logs',
        expect.objectContaining({
          level: 'error',
          message: 'error message',
        })
      );
    });

    it('does not rotate when count equals exactly MAX_LOGS (1000)', async () => {
      vi.mocked(mockDb.count).mockResolvedValue(1000);

      await persistLog('info', 'at limit');

      expect(mockDb.transaction).not.toHaveBeenCalled();
      expect(mockDb.getAllKeysFromIndex).not.toHaveBeenCalled();
    });

    it('rotates logs when exceeding MAX_LOGS (1000)', async () => {
      vi.mocked(mockDb.count).mockResolvedValue(1001);
      vi.mocked(mockDb.getAllKeysFromIndex).mockResolvedValue(['key1', 'key2']);

      await persistLog('info', 'trigger rotation');

      expect(mockDb.transaction).toHaveBeenCalledWith('logs', 'readwrite');
    });

    it('deletes exactly count - MAX_LOGS entries on rotation', async () => {
      vi.mocked(mockDb.count).mockResolvedValue(1005);
      const keys = Array.from({ length: 1005 }, (_, i) => `key${i}`);
      vi.mocked(mockDb.getAllKeysFromIndex).mockResolvedValue(keys);

      const storeDelete = vi.fn().mockResolvedValue(undefined);
      vi.mocked(mockDb.transaction).mockReturnValue({
        objectStore: vi.fn(() => ({ delete: storeDelete })),
        done: Promise.resolve(),
      } as never);

      await persistLog('info', 'rotation test');

      expect(storeDelete).toHaveBeenCalledTimes(5);
      expect(storeDelete).toHaveBeenCalledWith('key0');
      expect(storeDelete).toHaveBeenCalledWith('key4');
    });

    it('handles DB errors gracefully during persistence', async () => {
      vi.mocked(mockDb.add).mockRejectedValueOnce(new Error('DB write error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await persistLog('info', 'failing message');

      expect(consoleSpy).toHaveBeenCalledWith('[Logger] Failed to persist log', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  // ── safeLog ──────────────────────────────────────────────────────

  describe('safeLog', () => {
    it('calls persistLog with redacted args', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      safeLog(`User action: ${PAT}`);

      await vi.waitFor(() => {
        expect(mockDb.add).toHaveBeenCalled();
      });
      consoleSpy.mockRestore();
    });

    it('redacts secrets in log arguments', async () => {
      safeLog('Token used', { token: PAT });

      await vi.waitFor(() => {
        expect(mockDb.add).toHaveBeenCalledWith(
          'logs',
          expect.objectContaining({
            data: { token: '[REDACTED]' },
          })
        );
      });
    });

    it('packages multiple args as array in data field', async () => {
      safeLog('multi', 'msg1', 'msg2');

      await vi.waitFor(() => {
        expect(mockDb.add).toHaveBeenCalledWith(
          'logs',
          expect.objectContaining({
            data: ['msg1', 'msg2'],
          })
        );
      });
    });

    it('wraps single arg directly (not in array)', async () => {
      safeLog('single', { val: 42 });

      await vi.waitFor(() => {
        expect(mockDb.add).toHaveBeenCalledWith(
          'logs',
          expect.objectContaining({
            data: { val: 42 },
          })
        );
      });
    });
  });

  // ── safeError ─────────────────────────────────────────────────────

  describe('safeError', () => {
    it('calls console.error with redacted message', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      safeError(`Failed: ${PAT}`);

      expect(consoleSpy).toHaveBeenCalledWith('Failed: [REDACTED]');
      consoleSpy.mockRestore();
    });

    it('persists error log entry', async () => {
      safeError('Critical failure', { code: 500 });

      await vi.waitFor(() => {
        expect(mockDb.add).toHaveBeenCalledWith(
          'logs',
          expect.objectContaining({
            level: 'error',
            message: 'Critical failure',
          })
        );
      });
    });

    it('handles multiple arguments', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      safeError('Error:', 'details', { code: 404 });

      expect(consoleSpy).toHaveBeenCalledWith('Error:', 'details', { code: 404 });
      consoleSpy.mockRestore();
    });
  });

  // ── safeWarn ──────────────────────────────────────────────────────

  describe('safeWarn', () => {
    it('calls console.warn with redacted message', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      safeWarn(`Deprecated: token ${PAT_BODY.slice(10)}`);

      expect(consoleSpy).toHaveBeenCalledWith('Deprecated: [REDACTED]');
      consoleSpy.mockRestore();
    });

    it('persists warn log entry', async () => {
      safeWarn('Warning message');

      await vi.waitFor(() => {
        expect(mockDb.add).toHaveBeenCalledWith(
          'logs',
          expect.objectContaining({
            level: 'warn',
          })
        );
      });
    });
  });

  // ── getOfflineLogs ────────────────────────────────────────────────

  describe('getOfflineLogs', () => {
    it('retrieves logs from IndexedDB', async () => {
      const mockLogs = [{ id: 1, timestamp: Date.now(), level: 'info', message: 'test' }];
      vi.mocked(mockDb.getAllFromIndex).mockResolvedValue(mockLogs);

      const result = await getOfflineLogs();

      expect(mockDb.getAllFromIndex).toHaveBeenCalledWith('logs', 'by-timestamp');
      expect(result).toEqual(mockLogs);
    });

    it('returns empty array when no logs exist', async () => {
      vi.mocked(mockDb.getAllFromIndex).mockResolvedValue([]);

      const result = await getOfflineLogs();

      expect(result).toEqual([]);
    });
  });

  // ── clearOfflineLogs ──────────────────────────────────────────────

  describe('clearOfflineLogs', () => {
    it('clears all logs from IndexedDB', async () => {
      await clearOfflineLogs();

      expect(mockDb.clear).toHaveBeenCalledWith('logs');
    });
  });
});
