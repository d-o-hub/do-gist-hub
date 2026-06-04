import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { recordAuthMethod } from '../../src/services/telemetry/auth-telemetry';

vi.mock('../../src/services/telemetry/auth-telemetry', () => ({
  recordAuthMethod: vi.fn(async () => {}),
  recordAuthCompleted: vi.fn(async () => {}),
}));

const metadataStore = new Map<string, unknown>();

vi.mock('../../src/services/db', () => ({
  // biome-ignore lint/suspicious/useAwait: mock factory must be async to return Promise
  getMetadata: vi.fn(async <T>(key: string): Promise<T | undefined> => {
    return metadataStore.get(key) as T | undefined;
  }),
  // biome-ignore lint/suspicious/useAwait: mock factory must be async to return Promise
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

import { validateToken } from '../../src/services/github/client';
import {
  authenticateWithDeviceFlow,
  pollForToken,
  requestDeviceCode,
} from '../../src/services/github/device-flow';

const PROXY_URL = 'https://auth-proxy.d-o-gist-hub.workers.dev';

function mockJsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('device-flow', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    fetchSpy.mockRestore();
  });

  describe('requestDeviceCode', () => {
    it('sends POST to proxy device code endpoint with JSON headers', async () => {
      fetchSpy.mockResolvedValue(
        mockJsonResponse({
          device_code: 'dc1',
          user_code: 'ABC-123',
          verification_uri: 'https://github.com/login/device',
          interval: 5,
          expires_in: 900,
        })
      );

      await requestDeviceCode();

      expect(fetchSpy).toHaveBeenCalledWith(
        `${PROXY_URL}/login/device/code`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('parses response into DeviceCode with correct fields', async () => {
      fetchSpy.mockResolvedValue(
        mockJsonResponse({
          device_code: 'dc1',
          user_code: 'ABC-123',
          verification_uri: 'https://github.com/login/device',
          interval: 5,
          expires_in: 900,
        })
      );

      const code = await requestDeviceCode();

      expect(code.deviceCode).toBe('dc1');
      expect(code.userCode).toBe('ABC-123');
      expect(code.verificationUri).toBe('https://github.com/login/device');
      expect(code.interval).toBe(5);
      expect(code.expiresIn).toBe(900);
    });

    it('uses default interval (5) and expiresIn (900) when omitted', async () => {
      fetchSpy.mockResolvedValue(
        mockJsonResponse({
          device_code: 'dc1',
          user_code: 'ABC-123',
          verification_uri: 'https://github.com/login/device',
        })
      );

      const code = await requestDeviceCode();

      expect(code.interval).toBe(5);
      expect(code.expiresIn).toBe(900);
    });

    it('throws on HTTP error response', async () => {
      fetchSpy.mockResolvedValue(mockJsonResponse({}, 500));

      await expect(requestDeviceCode()).rejects.toThrow(/Failed to request device code/);
    });

    it('throws on error field in response body', async () => {
      fetchSpy.mockResolvedValue(
        mockJsonResponse({
          error: 'unauthorized_client',
          error_description: 'Client not registered',
        })
      );

      await expect(requestDeviceCode()).rejects.toThrow('Client not registered');
    });

    it('falls back to error code when description is missing', async () => {
      fetchSpy.mockResolvedValue(mockJsonResponse({ error: 'unauthorized_client' }));

      await expect(requestDeviceCode()).rejects.toThrow('unauthorized_client');
    });

    it('defaults interval to 5 when response interval is 0', async () => {
      fetchSpy.mockResolvedValue(
        mockJsonResponse({
          device_code: 'dc1',
          user_code: 'ABC-123',
          verification_uri: 'https://github.com/login/device',
          interval: 0,
          expires_in: 900,
        })
      );

      const code = await requestDeviceCode();

      expect(code.interval).toBe(5);
    });

    it('defaults expiresIn to 900 when response expires_in is 0', async () => {
      fetchSpy.mockResolvedValue(
        mockJsonResponse({
          device_code: 'dc1',
          user_code: 'ABC-123',
          verification_uri: 'https://github.com/login/device',
          interval: 5,
          expires_in: 0,
        })
      );

      const code = await requestDeviceCode();

      expect(code.expiresIn).toBe(900);
    });
  });

  describe('pollForToken', () => {
    it('returns access token on successful poll', async () => {
      vi.useFakeTimers();
      fetchSpy.mockResolvedValue(mockJsonResponse({ access_token: 'gho_test_token' }));

      const promise = pollForToken('device-123', 1, 1);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('gho_test_token');
      expect(fetchSpy).toHaveBeenCalledWith(
        `${PROXY_URL}/login/oauth/access_token`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_code: 'device-123' }),
        })
      );
    });

    it('calls onProgress with waiting message', async () => {
      vi.useFakeTimers();
      const onProgress = vi.fn();
      fetchSpy.mockResolvedValue(mockJsonResponse({ access_token: 'gho_test_token' }));

      const promise = pollForToken('device-123', 1, 1, onProgress);
      vi.advanceTimersByTime(1000);
      await promise;

      expect(onProgress).toHaveBeenCalledWith('Waiting for authentication...');
    });

    it('handles expired_token error', async () => {
      vi.useFakeTimers();
      fetchSpy.mockResolvedValue(mockJsonResponse({ error: 'expired_token' }));

      const promise = pollForToken('device-123', 1, 1);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('expired_token');
      expect(result.errorDescription).toBe('The device code expired. Please try again.');
    });

    it('handles access_denied error', async () => {
      vi.useFakeTimers();
      fetchSpy.mockResolvedValue(mockJsonResponse({ error: 'access_denied' }));

      const promise = pollForToken('device-123', 1, 1);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('access_denied');
      expect(result.errorDescription).toBe('You denied the authorization request.');
    });

    it('handles slow_down by applying extra delay then continuing to poll', async () => {
      vi.useFakeTimers();
      const onProgress = vi.fn();

      fetchSpy
        .mockResolvedValueOnce(mockJsonResponse({ error: 'slow_down' }))
        .mockResolvedValueOnce(mockJsonResponse({ access_token: 'gho_slow_token' }));

      const promise = pollForToken('device-123', 10, 1, onProgress);

      await vi.advanceTimersByTimeAsync(1000);

      await vi.advanceTimersByTimeAsync(2000);

      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('gho_slow_token');
      expect(onProgress).toHaveBeenCalledWith('Slowing down polling...');
    });

    it('slow_down doubles the poll interval (pollIntervalMs * 2)', async () => {
      vi.useFakeTimers();
      const onProgress = vi.fn();

      fetchSpy
        .mockResolvedValueOnce(mockJsonResponse({ error: 'slow_down' }))
        .mockResolvedValueOnce(mockJsonResponse({ access_token: 'gho_token' }));

      const promise = pollForToken('dc-slow', 30, 3, onProgress);

      // First poll after 3s interval → slow_down
      await vi.advanceTimersByTimeAsync(3000);
      // slow_down adds delay(pollIntervalMs * 2) = delay(6000)
      // Advance 6s → extra delay fires
      await vi.advanceTimersByTimeAsync(6000);
      // Next poll fires after 3s interval
      await vi.advanceTimersByTimeAsync(3000);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('tolerates authorization_pending then succeeds on next poll', async () => {
      vi.useFakeTimers();
      const onProgress = vi.fn();

      fetchSpy
        .mockResolvedValueOnce(mockJsonResponse({ error: 'authorization_pending' }))
        .mockResolvedValueOnce(mockJsonResponse({ access_token: 'gho_pending_token' }));

      const promise = pollForToken('device-123', 10, 1, onProgress);

      await vi.advanceTimersByTimeAsync(1000);

      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('gho_pending_token');
    });

    it('returns timeout when authentication not completed in time', async () => {
      vi.useFakeTimers();
      fetchSpy.mockResolvedValue(mockJsonResponse({ error: 'authorization_pending' }));

      const promise = pollForToken('device-123', 1, 1);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('timeout');
      expect(result.errorDescription).toBe('Authentication timed out. Please try again.');
    });

    it('handles proxy HTTP error as network_error', async () => {
      vi.useFakeTimers();
      fetchSpy.mockResolvedValue(mockJsonResponse({}, 502));

      const promise = pollForToken('device-123', 1, 1);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('network_error');
      expect(result.errorDescription).toContain('502');
    });

    it('handles fetch rejection as network_error', async () => {
      vi.useFakeTimers();
      fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));

      const promise = pollForToken('device-123', 1, 1);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('network_error');
      expect(result.errorDescription).toBe('Failed to fetch');
    });

    it('handles unknown error from API', async () => {
      vi.useFakeTimers();
      fetchSpy.mockResolvedValue(
        mockJsonResponse({
          error: 'unexpected_api_err',
          error_description: 'Something broke',
        })
      );

      const promise = pollForToken('device-123', 1, 1);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('unexpected_api_err');
      expect(result.errorDescription).toBe('Something broke');
    });
  });

  describe('authenticateWithDeviceFlow', () => {
    beforeEach(() => {
      metadataStore.clear();
    });

    it('completes full flow and saves token', async () => {
      vi.useFakeTimers();
      const onProgress = vi.fn();

      vi.mocked(validateToken).mockResolvedValue({ isValid: true, username: 'testuser' });

      fetchSpy
        .mockResolvedValueOnce(
          mockJsonResponse({
            device_code: 'dc-full',
            user_code: 'XYZ-789',
            verification_uri: 'https://github.com/login/device',
            interval: 5,
            expires_in: 900,
          })
        )
        .mockResolvedValueOnce(mockJsonResponse({ access_token: 'gho_full_token' }));

      const flowPromise = authenticateWithDeviceFlow(onProgress);

      await vi.advanceTimersByTimeAsync(5000);

      const result = await flowPromise;

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('gho_full_token');
      expect(onProgress).toHaveBeenNthCalledWith(1, 'Connecting to GitHub...');
      expect(onProgress).toHaveBeenNthCalledWith(2, expect.stringContaining('XYZ-789'));
      expect(onProgress).toHaveBeenNthCalledWith(3, 'Waiting for authentication...');
      expect(onProgress).toHaveBeenNthCalledWith(4, 'Saving token...');
    });

    it('returns save_error when token storage fails', async () => {
      vi.useFakeTimers();

      vi.mocked(validateToken).mockResolvedValue({ isValid: false, error: 'Bad credentials' });

      fetchSpy
        .mockResolvedValueOnce(
          mockJsonResponse({
            device_code: 'dc-savefail',
            user_code: 'AAA-111',
            verification_uri: 'https://github.com/login/device',
            interval: 5,
            expires_in: 900,
          })
        )
        .mockResolvedValueOnce(mockJsonResponse({ access_token: 'gho_savefail_token' }));

      const flowPromise = authenticateWithDeviceFlow();

      await vi.advanceTimersByTimeAsync(5000);

      const result = await flowPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('save_error');
      expect(result.errorDescription).toBe('Bad credentials');
    });

    it('returns polling error when pollForToken fails', async () => {
      vi.useFakeTimers();

      fetchSpy
        .mockResolvedValueOnce(
          mockJsonResponse({
            device_code: 'dc-polfail',
            user_code: 'BBB-222',
            verification_uri: 'https://github.com/login/device',
            interval: 5,
            expires_in: 900,
          })
        )
        .mockResolvedValueOnce(mockJsonResponse({ error: 'expired_token' }));

      const flowPromise = authenticateWithDeviceFlow();

      await vi.advanceTimersByTimeAsync(5000);

      const result = await flowPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('expired_token');
    });

    it('returns unexpected_error when requestDeviceCode fails', async () => {
      fetchSpy.mockResolvedValue(mockJsonResponse({}, 500));

      const result = await authenticateWithDeviceFlow();

      expect(result.success).toBe(false);
      expect(result.error).toBe('unexpected_error');
      expect(result.errorDescription).toContain('Failed to request device code');
    });

    it('catches unexpected exceptions and returns unexpected_error', async () => {
      fetchSpy.mockRejectedValue(new Error('Network is down'));

      const result = await authenticateWithDeviceFlow();

      expect(result.success).toBe(false);
      expect(result.error).toBe('unexpected_error');
      expect(result.errorDescription).toBe('Network is down');
    });

    it('calls recordAuthMethod("device-flow") after successful auth', async () => {
      vi.useFakeTimers();
      vi.mocked(validateToken).mockResolvedValue({ isValid: true, username: 'testuser' });

      fetchSpy
        .mockResolvedValueOnce(
          mockJsonResponse({
            device_code: 'dc-telemetry',
            user_code: 'TEL-001',
            verification_uri: 'https://github.com/login/device',
            interval: 5,
            expires_in: 900,
          })
        )
        .mockResolvedValueOnce(mockJsonResponse({ access_token: 'gho_tel_token' }));

      const flowPromise = authenticateWithDeviceFlow();
      await vi.advanceTimersByTimeAsync(5000);
      await flowPromise;

      expect(recordAuthMethod).toHaveBeenCalledWith('device-flow');
    });

    it('stores refresh token when response includes refreshToken and expiresIn', async () => {
      vi.useFakeTimers();
      vi.mocked(validateToken).mockResolvedValue({ isValid: true, username: 'testuser' });

      const storeRefreshTokenMock = vi.fn(async () => {});

      fetchSpy
        .mockResolvedValueOnce(
          mockJsonResponse({
            device_code: 'dc-refresh',
            user_code: 'REF-001',
            verification_uri: 'https://github.com/login/device',
            interval: 5,
            expires_in: 900,
          })
        )
        .mockResolvedValueOnce(
          mockJsonResponse({
            access_token: 'gho_refresh_token',
            refresh_token: 'ghr_refresh123',
            expires_in: 1800,
          })
        );

      vi.doMock('../../src/services/github/auth', async () => {
        const actual = await vi.importActual<typeof import('../../src/services/github/auth')>(
          '../../src/services/github/auth'
        );
        return {
          ...actual,
          storeRefreshToken: storeRefreshTokenMock,
        };
      });

      const flowPromise = authenticateWithDeviceFlow();
      await vi.advanceTimersByTimeAsync(5000);
      const result = await flowPromise;

      expect(result.success).toBe(true);
      expect(storeRefreshTokenMock).toHaveBeenCalledWith('ghr_refresh123', 1800);

      vi.doUnmock('../../src/services/github/auth');
    });
  });

  describe('getProxyUrl', () => {
    it('uses window.__AUTH_PROXY_URL when set', async () => {
      const customUrl = 'https://my-custom-proxy.example.com';
      (window as { __AUTH_PROXY_URL?: string }).__AUTH_PROXY_URL = customUrl;

      fetchSpy.mockResolvedValue(
        mockJsonResponse({
          device_code: 'dc-proxy',
          user_code: 'PRO-001',
          verification_uri: 'https://github.com/login/device',
          interval: 5,
          expires_in: 900,
        })
      );

      await requestDeviceCode();

      expect(fetchSpy).toHaveBeenCalledWith(
        `${customUrl}/login/device/code`,
        expect.objectContaining({ method: 'POST' })
      );

      delete (window as { __AUTH_PROXY_URL?: string }).__AUTH_PROXY_URL;
    });
  });
});
