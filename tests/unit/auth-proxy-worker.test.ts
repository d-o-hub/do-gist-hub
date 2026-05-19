/**
 * Tests for auth-proxy/worker.ts
 *
 * Covers:
 *  - getCorsHeaders: allowed/disallowed origins, regex localhost, null origin
 *  - handleRequest: missing GITHUB_CLIENT_ID → 500
 *  - POST /login/device/code: success, GitHub error body, GitHub non-2xx status
 *  - POST /login/oauth/access_token: success, missing device_code, GitHub error, GitHub non-2xx
 *  - Unknown routes and methods → 404
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import the worker default export (fetch handler)
import worker from '../../auth-proxy/worker';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(
  pathname: string,
  method = 'GET',
  body?: Record<string, unknown>,
  origin?: string
): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (origin) headers['Origin'] = origin;

  return new Request(`https://proxy.example.com${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeEnv(clientId?: string): { GITHUB_CLIENT_ID?: string } {
  return clientId ? { GITHUB_CLIENT_ID: clientId } : {};
}

function mockGitHubSuccess(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockGitHubError(status: number, body = 'GitHub error'): Response {
  return new Response(body, { status });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('auth-proxy worker', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // ── getCorsHeaders (tested indirectly via response headers) ───────────────

  describe('CORS headers', () => {
    it('echoes an allowed string origin back in the Access-Control-Allow-Origin header', async () => {
      fetchSpy.mockResolvedValue(mockGitHubSuccess({ device_code: 'dc1', user_code: 'AB-12', verification_uri: 'https://github.com/login/device', interval: 5, expires_in: 900 }));

      const req = makeRequest('/login/device/code', 'POST', {}, 'https://d-o-gist-hub.pages.dev');
      const resp = await worker.fetch(req, makeEnv('test-client-id'));

      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('https://d-o-gist-hub.pages.dev');
    });

    it('echoes the vercel origin when allowed', async () => {
      fetchSpy.mockResolvedValue(mockGitHubSuccess({ device_code: 'dc1', user_code: 'AB-12', verification_uri: 'https://github.com/login/device', interval: 5, expires_in: 900 }));

      const req = makeRequest('/login/device/code', 'POST', {}, 'https://do-gist-hub.vercel.app');
      const resp = await worker.fetch(req, makeEnv('test-client-id'));

      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('https://do-gist-hub.vercel.app');
    });

    it('echoes localhost origin matching the regex pattern', async () => {
      fetchSpy.mockResolvedValue(mockGitHubSuccess({ device_code: 'dc1', user_code: 'AB-12', verification_uri: 'https://github.com/login/device', interval: 5, expires_in: 900 }));

      const req = makeRequest('/login/device/code', 'POST', {}, 'http://localhost:5173');
      const resp = await worker.fetch(req, makeEnv('test-client-id'));

      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    });

    it('falls back to the first allowed origin for a disallowed origin', async () => {
      fetchSpy.mockResolvedValue(mockGitHubSuccess({ device_code: 'dc1', user_code: 'AB-12', verification_uri: 'https://github.com/login/device', interval: 5, expires_in: 900 }));

      const req = makeRequest('/login/device/code', 'POST', {}, 'https://evil.example.com');
      const resp = await worker.fetch(req, makeEnv('test-client-id'));

      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('https://d-o-gist-hub.pages.dev');
    });

    it('falls back to the first allowed origin when no Origin header is present', async () => {
      fetchSpy.mockResolvedValue(mockGitHubSuccess({ device_code: 'dc1', user_code: 'AB-12', verification_uri: 'https://github.com/login/device', interval: 5, expires_in: 900 }));

      // No origin header
      const req = new Request('https://proxy.example.com/login/device/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const resp = await worker.fetch(req, makeEnv('test-client-id'));

      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('https://d-o-gist-hub.pages.dev');
    });

    it('includes required CORS method and header declarations', async () => {
      // 404 path is cheapest to trigger — CORS headers are always set
      const req = makeRequest('/unknown', 'GET', undefined, 'https://d-o-gist-hub.pages.dev');
      const resp = await worker.fetch(req, makeEnv('test-client-id'));

      expect(resp.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(resp.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Accept');
      expect(resp.headers.get('Access-Control-Max-Age')).toBe('86400');
    });

    it('does not echo localhost:99999 — port must be digits only (regex boundary)', async () => {
      // The regex is /^https?:\/\/localhost:\d+$/ so 'localhost:abc' should not match
      fetchSpy.mockResolvedValue(mockGitHubSuccess({ device_code: 'dc1', user_code: 'AB-12', verification_uri: 'https://github.com/login/device', interval: 5, expires_in: 900 }));

      const req = makeRequest('/login/device/code', 'POST', {}, 'http://localhost:abc');
      const resp = await worker.fetch(req, makeEnv('test-client-id'));

      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('https://d-o-gist-hub.pages.dev');
    });
  });

  // ── Missing GITHUB_CLIENT_ID ───────────────────────────────────────────────

  describe('missing GITHUB_CLIENT_ID', () => {
    it('returns 500 with error message when GITHUB_CLIENT_ID is not configured', async () => {
      const req = makeRequest('/login/device/code', 'POST');
      const resp = await worker.fetch(req, makeEnv());

      expect(resp.status).toBe(500);
      const body = await resp.json() as { error: string };
      expect(body.error).toBe('GITHUB_CLIENT_ID not configured');
    });

    it('still includes CORS headers on the 500 error response', async () => {
      const req = makeRequest('/login/device/code', 'POST', undefined, 'https://d-o-gist-hub.pages.dev');
      const resp = await worker.fetch(req, makeEnv());

      expect(resp.headers.get('Content-Type')).toBe('application/json');
      expect(resp.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    });
  });

  // ── POST /login/device/code ────────────────────────────────────────────────

  describe('POST /login/device/code', () => {
    it('returns 200 with device code data on success', async () => {
      const githubData = {
        device_code: 'gdc_abc123',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        interval: 5,
        expires_in: 900,
      };
      fetchSpy.mockResolvedValue(mockGitHubSuccess(githubData));

      const req = makeRequest('/login/device/code', 'POST', {}, 'https://d-o-gist-hub.pages.dev');
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(200);
      const body = await resp.json();
      expect(body).toEqual(githubData);
    });

    it('forwards client_id and gist scope to GitHub', async () => {
      fetchSpy.mockResolvedValue(mockGitHubSuccess({
        device_code: 'dc1', user_code: 'AB-12', verification_uri: 'https://github.com/login/device', interval: 5, expires_in: 900,
      }));

      const req = makeRequest('/login/device/code', 'POST');
      await worker.fetch(req, makeEnv('my-client-id'));

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://github.com/login/device/code',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ client_id: 'my-client-id', scope: 'gist' }),
        })
      );
    });

    it('uses Accept: application/json header when calling GitHub', async () => {
      fetchSpy.mockResolvedValue(mockGitHubSuccess({
        device_code: 'dc1', user_code: 'AB-12', verification_uri: 'https://github.com/login/device', interval: 5, expires_in: 900,
      }));

      const req = makeRequest('/login/device/code', 'POST');
      await worker.fetch(req, makeEnv('my-client-id'));

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://github.com/login/device/code',
        expect.objectContaining({
          headers: expect.objectContaining({ Accept: 'application/json' }),
        })
      );
    });

    it('returns GitHub error status and body when GitHub responds with non-ok status', async () => {
      fetchSpy.mockResolvedValue(mockGitHubError(422, 'Unprocessable Entity'));

      const req = makeRequest('/login/device/code', 'POST');
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(422);
      const text = await resp.text();
      expect(text).toBe('Unprocessable Entity');
    });

    it('propagates GitHub 503 status without modification', async () => {
      fetchSpy.mockResolvedValue(mockGitHubError(503, 'Service Unavailable'));

      const req = makeRequest('/login/device/code', 'POST');
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(503);
    });

    it('does not trigger on GET /login/device/code — falls through to 404', async () => {
      const req = makeRequest('/login/device/code', 'GET');
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(404);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ── POST /login/oauth/access_token ────────────────────────────────────────

  describe('POST /login/oauth/access_token', () => {
    it('returns 200 with access token on successful poll', async () => {
      const githubData = {
        access_token: 'gho_test_token_xyz',
        token_type: 'bearer',
        scope: 'gist',
      };
      fetchSpy.mockResolvedValue(mockGitHubSuccess(githubData));

      const req = makeRequest('/login/oauth/access_token', 'POST', { device_code: 'gdc_abc123' });
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(200);
      const body = await resp.json();
      expect(body).toEqual(githubData);
    });

    it('forwards client_id, device_code and correct grant_type to GitHub', async () => {
      fetchSpy.mockResolvedValue(mockGitHubSuccess({ access_token: 'gho_token' }));

      const req = makeRequest('/login/oauth/access_token', 'POST', { device_code: 'dc-test' });
      await worker.fetch(req, makeEnv('my-client-id'));

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            client_id: 'my-client-id',
            device_code: 'dc-test',
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          }),
        })
      );
    });

    it('returns 400 when device_code is absent from request body', async () => {
      const req = makeRequest('/login/oauth/access_token', 'POST', {});
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(400);
      const body = await resp.json() as { error: string };
      expect(body.error).toBe('device_code is required');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns GitHub error status when GitHub responds with non-ok status', async () => {
      fetchSpy.mockResolvedValue(mockGitHubError(400, 'bad_verification_code'));

      const req = makeRequest('/login/oauth/access_token', 'POST', { device_code: 'expired-code' });
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(400);
      const text = await resp.text();
      expect(text).toBe('bad_verification_code');
    });

    it('passes through authorization_pending error from GitHub body', async () => {
      fetchSpy.mockResolvedValue(mockGitHubSuccess({ error: 'authorization_pending' }));

      const req = makeRequest('/login/oauth/access_token', 'POST', { device_code: 'dc-pending' });
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(200);
      const body = await resp.json() as { error: string };
      expect(body.error).toBe('authorization_pending');
    });

    it('passes through slow_down error from GitHub body', async () => {
      fetchSpy.mockResolvedValue(mockGitHubSuccess({ error: 'slow_down' }));

      const req = makeRequest('/login/oauth/access_token', 'POST', { device_code: 'dc-slow' });
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(200);
      const body = await resp.json() as { error: string };
      expect(body.error).toBe('slow_down');
    });

    it('passes through expired_token error from GitHub body', async () => {
      fetchSpy.mockResolvedValue(mockGitHubSuccess({ error: 'expired_token' }));

      const req = makeRequest('/login/oauth/access_token', 'POST', { device_code: 'dc-expired' });
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(200);
      const body = await resp.json() as { error: string };
      expect(body.error).toBe('expired_token');
    });

    it('does not trigger on GET /login/oauth/access_token — falls through to 404', async () => {
      const req = makeRequest('/login/oauth/access_token', 'GET');
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(404);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ── Unmatched routes ────────────────────────────────────────────────────────

  describe('unmatched routes', () => {
    it('returns 404 for an unknown pathname', async () => {
      const req = makeRequest('/unknown/path', 'POST');
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(404);
      const body = await resp.json() as { error: string };
      expect(body.error).toBe('Not found');
    });

    it('returns 404 for root path', async () => {
      const req = makeRequest('/', 'GET');
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(404);
    });

    it('returns 404 for OPTIONS request (no preflight handling defined)', async () => {
      const req = makeRequest('/login/device/code', 'OPTIONS');
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(404);
    });

    it('still includes CORS headers on 404 responses', async () => {
      const req = makeRequest('/nope', 'POST', undefined, 'https://d-o-gist-hub.pages.dev');
      const resp = await worker.fetch(req, makeEnv('my-client-id'));

      expect(resp.status).toBe(404);
      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('https://d-o-gist-hub.pages.dev');
      expect(resp.headers.get('Content-Type')).toBe('application/json');
    });
  });

  // ── Response content-type ──────────────────────────────────────────────────

  describe('response Content-Type', () => {
    it('sets Content-Type: application/json on 200 device code response', async () => {
      fetchSpy.mockResolvedValue(mockGitHubSuccess({ device_code: 'dc', user_code: 'AB', verification_uri: 'https://github.com/login/device', interval: 5, expires_in: 900 }));

      const req = makeRequest('/login/device/code', 'POST');
      const resp = await worker.fetch(req, makeEnv('test-id'));

      expect(resp.headers.get('Content-Type')).toBe('application/json');
    });

    it('sets Content-Type: application/json on 200 access token response', async () => {
      fetchSpy.mockResolvedValue(mockGitHubSuccess({ access_token: 'gho_token' }));

      const req = makeRequest('/login/oauth/access_token', 'POST', { device_code: 'dc' });
      const resp = await worker.fetch(req, makeEnv('test-id'));

      expect(resp.headers.get('Content-Type')).toBe('application/json');
    });

    it('sets Content-Type: application/json on 400 error response', async () => {
      const req = makeRequest('/login/oauth/access_token', 'POST', {});
      const resp = await worker.fetch(req, makeEnv('test-id'));

      expect(resp.status).toBe(400);
      expect(resp.headers.get('Content-Type')).toBe('application/json');
    });
  });
});