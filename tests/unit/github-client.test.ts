import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/services/github/rate-limiter', () => ({
  trackRateLimit: vi.fn(),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

vi.mock('../../src/services/github/error-handler', () => ({
  handleGitHubError: vi.fn((error: unknown, _context: string) => {
    if (error instanceof Error) return error;
    return new Error('GitHub API error');
  }),
}));

vi.mock('../../src/services/github/auth', () => ({
  getToken: vi.fn().mockResolvedValue('test-token-123'),
}));

vi.mock('../../src/services/db', () => ({
  getEtag: vi.fn().mockResolvedValue(null),
  setEtag: vi.fn().mockResolvedValue(null),
  getMetadata: vi.fn().mockResolvedValue(undefined),
  setMetadata: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/telemetry/auth-telemetry', () => ({
  recordFirstApiCall: vi.fn().mockResolvedValue(undefined),
  recordAuthCompleted: vi.fn().mockResolvedValue(undefined),
  recordAuthMethod: vi.fn().mockResolvedValue(undefined),
  logAuthTelemetry: vi.fn().mockResolvedValue(undefined),
  readTelemetry: vi.fn().mockResolvedValue({
    patCount: 0,
    deviceFlowCount: 0,
    authCompletedAt: null,
    timeToFirstApiCallDeltas: [],
  }),
}));

// ─── Imports (after mocks) ───────────────────────────────────────────

import {
  type CreateGistRequest,
  cancelAllRequests,
  checkIfStarred,
  clearUsernameCache,
  createGist,
  deleteGist,
  forkGist,
  type GitHubGist,
  getGist,
  listGistRevisions,
  listGists,
  listStarredGists,
  starGist,
  unstarGist,
  updateGist,
  validateToken,
} from '../../src/services/github/client';
import { recordFirstApiCall } from '../../src/services/telemetry/auth-telemetry';

describe('GitHub API Client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    clearUsernameCache();
    cancelAllRequests();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── validateToken ──────────────────────────────────────────────────

  describe('validateToken', () => {
    it('returns valid=true with username for valid token', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ login: 'testuser' }), { status: 200 })
      );

      const result = await validateToken('ghp_valid');
      expect(result.isValid).toBe(true);
      expect(result.username).toBe('testuser');
    });

    it('returns valid=false for invalid token', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Bad credentials' }), { status: 401 })
      );

      const result = await validateToken('ghp_invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Bad credentials');
    });

    it('handles network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network fail'));

      const result = await validateToken('ghp_any');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Network fail');
    });
  });

  // ── Helper to make a mock gist ──
  const makeGitHubGist = (id: string): GitHubGist =>
    ({
      id,
      description: 'Test Gist',
      public: true,
      files: {
        'test.js': {
          filename: 'test.js',
          type: 'application/javascript',
          language: 'JavaScript',
          raw_url: '...',
          size: 100,
        },
      },
      html_url: '...',
      git_pull_url: '...',
      git_push_url: '...',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      owner: { login: 'testuser', id: 1, avatar_url: '...', html_url: '...' },
    }) as unknown as GitHubGist;

  // ── listGists ───────────────────────────────────────────────────

  describe('listGists', () => {
    it('fetches gists with default pagination', async () => {
      fetchMock
        .mockResolvedValueOnce(
          // /user endpoint for getCurrentUsername
          new Response(JSON.stringify({ login: 'testuser' }), { status: 200 })
        )
        .mockResolvedValueOnce(
          // /users/testuser/gists endpoint
          new Response(JSON.stringify([makeGitHubGist('gist-1'), makeGitHubGist('gist-2')]), {
            status: 200,
            headers: {
              Link: '<https://api.github.com/user/gists?page=2>; rel="next", <https://api.github.com/user/gists?page=1>; rel="first", <https://api.github.com/user/gists?page=5>; rel="last"',
            },
          })
        );

      const result = await listGists();

      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.id).toBe('gist-1');
      expect(result.pagination?.nextPage).toBe(2);
      expect(result.pagination?.lastPage).toBe(5);
    });

    it('fetches with custom pagination options', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({ login: 'testuser' }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      await listGists({ page: 2, perPage: 50 });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('page=2&per_page=50'),
        expect.any(Object)
      );
    });
  });

  // ── listStarredGists ────────────────────────────────────────────────

  describe('listStarredGists', () => {
    it('fetches starred gists', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify([makeGitHubGist('starred-1')]), { status: 200 })
      );

      const result = await listStarredGists();
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe('starred-1');
    });
  });

  // ── getGist ────────────────────────────────────────────────────────

  describe('getGist', () => {
    it('fetches a single gist by id', async () => {
      const gist = makeGitHubGist('gist-1');
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(gist), { status: 200 }));

      const result = await getGist('gist-1');
      expect(result.id).toBe('gist-1');
    });
  });

  // ── createGist ────────────────────────────────────────────────────────

  describe('createGist', () => {
    it('creates a new gist', async () => {
      const gist = makeGitHubGist('new-gist');
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(gist), { status: 201 }));

      const payload: CreateGistRequest = {
        description: 'New',
        public: true,
        files: { 'a.js': { content: 'hello' } },
      };

      const result = await createGist(payload);
      expect(result.id).toBe('new-gist');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/gists'),
        expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) })
      );
    });
  });

  // ── updateGist ────────────────────────────────────────────────────────

  describe('updateGist', () => {
    it('updates an existing gist', async () => {
      const gist = makeGitHubGist('gist-1');
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(gist), { status: 200 }));

      const payload = { description: 'Updated' };
      const result = await updateGist('gist-1', payload);

      expect(result.id).toBe('gist-1');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/gists/gist-1'),
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify(payload) })
      );
    });
  });

  // ── deleteGist ────────────────────────────────────────────────────────

  describe('deleteGist', () => {
    it('deletes a gist', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

      await deleteGist('gist-1');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/gists/gist-1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // ── starGist / unstarGist ─────────────────────────────────────────────

  describe('starring', () => {
    it('stars a gist', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

      await starGist('gist-1');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/gists/gist-1/star',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('unstars a gist', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

      await unstarGist('gist-1');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/gists/gist-1/star',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // ── checkIfStarred ────────────────────────────────────────────────────

  describe('checkIfStarred', () => {
    it('returns true when gist is starred (204)', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

      const result = await checkIfStarred('gist-1');
      expect(result).toBe(true);
    });

    it('returns false when gist is not starred (404)', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));

      const result = await checkIfStarred('gist-1');
      expect(result).toBe(false);
    });
  });

  // ── forkGist ──────────────────────────────────────────────────────────

  describe('forkGist', () => {
    it('forks a gist', async () => {
      const gist = makeGitHubGist('forked-gist');
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(gist), { status: 201 }));

      const result = await forkGist('gist-1');
      expect(result.id).toBe('forked-gist');
    });
  });

  // ── listGistRevisions ──────────────────────────────────────────────────

  describe('listGistRevisions', () => {
    it('lists gist revisions', async () => {
      const revisions = [{ version: 'abc123', committed_at: '2024-01-01T00:00:00Z' }];
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(revisions), { status: 200 }));

      const result = await listGistRevisions('gist-1');
      expect(result).toHaveLength(1);
    });
  });

  // ── Request deduplication ──────────────────────────────────────────────

  describe('request deduplication', () => {
    it('deduplicates concurrent identical requests', async () => {
      const gist = makeGitHubGist('gist-1');

      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(gist), { status: 200 }));

      const [result1, result2] = await Promise.all([getGist('gist-1'), getGist('gist-1')]);

      expect(result1.id).toBe('gist-1');
      expect(result2.id).toBe('gist-1');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent identical requests for starred gists', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      await Promise.all([listStarredGists(), listStarredGists()]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  // ── Pagination parsing ────────────────────────────────────────────────

  describe('pagination parsing', () => {
    it('parses Link header correctly', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({ login: 'testuser' }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify([]), {
            status: 200,
            headers: {
              Link: '<https://api.github.com/user/gists?page=2>; rel="next", <https://api.github.com/user/gists?page=1>; rel="first", <https://api.github.com/user/gists?page=5>; rel="last"',
            },
          })
        );

      const result = await listGists();
      expect(result.pagination?.nextPage).toBe(2);
      expect(result.pagination?.firstPage).toBe(1);
      expect(result.pagination?.lastPage).toBe(5);
    });
  });

  // ── cancelAllRequests ────────────────────────────────────────────────

  describe('cancelAllRequests', () => {
    it('aborts in-flight requests', () => {
      // cancelAllRequests is called in beforeEach, so a new AbortController
      // should be active. Calling it again should not throw.
      expect(() => cancelAllRequests()).not.toThrow();
    });

    it('allows new requests after cancellation', async () => {
      // cancelAllRequests creates a fresh AbortController.
      // getGist doesn't need /user, so only one fetch mock is needed.
      const gist = makeGitHubGist('gist-after-cancel');
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(gist), { status: 200 }));

      cancelAllRequests();
      const result = await getGist('gist-after-cancel');
      expect(result.id).toBe('gist-after-cancel');
    });
  });

  // ── clearUsernameCache ───────────────────────────────────────────────

  describe('clearUsernameCache', () => {
    it('clears cached username so next call re-fetches', async () => {
      // First call caches the username
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({ login: 'testuser' }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify([makeGitHubGist('gist-1')]), { status: 200 })
        );

      await listGists();

      // Clear cache and make another call
      clearUsernameCache();

      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({ login: 'testuser' }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify([makeGitHubGist('gist-2')]), { status: 200 })
        );

      await listGists();

      // Should have made 4 fetch calls (2 per listGists call: /user + /gists)
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
  });

  // ── API Error Handling ─────────────────────────────────────────────

  describe('API error handling', () => {
    it('throws on createGist network error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network failure'));

      await expect(
        createGist({ description: 'Test', public: true, files: { 'a.txt': { content: 'x' } } })
      ).rejects.toThrow();
    });

    it('throws on updateGist error response', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 })
      );

      await expect(updateGist('non-existent', { description: 'Updated' })).rejects.toThrow();
    });

    it('throws on deleteGist error response', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 })
      );

      await expect(deleteGist('restricted')).rejects.toThrow();
    });

    it('throws on starGist error response', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 })
      );

      await expect(starGist('non-existent')).rejects.toThrow();
    });

    it('throws on unstarGist error response', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 })
      );

      await expect(unstarGist('non-existent')).rejects.toThrow();
    });

    it('throws on forkGist error response', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 })
      );

      await expect(forkGist('non-existent')).rejects.toThrow();
    });
  });

  // ── ETag 304 Handling ──────────────────────────────────────────────

  describe('ETag 304 handling', () => {
    it('returns cached data on 304 response', async () => {
      // Mock getEtag to return cached data
      const cachedData = makeGitHubGist('cached-gist');

      // We need to re-mock getEtag directly for this test
      const { getEtag } = await import('../../src/services/db');
      vi.mocked(getEtag).mockResolvedValue({
        etag: '"abc123"',
        data: cachedData,
      });

      // Only one fetch call needed (for getGist, which doesn't call /user)
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 304 }));

      const result = await getGist('cached-gist');

      // Should return the cached data
      expect(result.id).toBe('cached-gist');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/gists/cached-gist'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'If-None-Match': '"abc123"',
          }),
        })
      );
    });
  });

  // ── handleApiError ─────────────────────────────────────────────────

  describe('handleApiError', () => {
    it('re-throws AbortError with cancelled message', async () => {
      // Aborting and then making a request should fail
      cancelAllRequests();

      fetchMock.mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'));

      await expect(getGist('any')).rejects.toThrow(/Request cancelled/);
    });
  });

  // ── listGistRevisions Error Handling ─────────────────────────────────-

  describe('listGistRevisions error handling', () => {
    it('throws on API error response', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 })
      );

      await expect(listGistRevisions('non-existent')).rejects.toThrow();
    });

    it('throws on network error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network failure'));

      await expect(listGistRevisions('gist-1')).rejects.toThrow();
    });
  });

  // ── forkGist Network Error ────────────────────────────────────────────

  describe('forkGist network error', () => {
    it('throws on network failure', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network failure'));

      await expect(forkGist('gist-1')).rejects.toThrow();
    });
  });

  // ── parseLinkHeader Edge Cases ────────────────────────────────────────

  describe('parseLinkHeader edge cases', () => {
    it('returns null pagination when no Link header present', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({ login: 'testuser' }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify([makeGitHubGist('gist-1')]), { status: 200 })
        );

      const result = await listGists();

      expect(result.pagination?.nextPage).toBeNull();
      expect(result.pagination?.lastPage).toBeNull();
      expect(result.data).toHaveLength(1);
    });
  });

  // ── recordFirstApiCall Wiring (regression for #215) ──────────────────

  describe('recordFirstApiCall wiring (issue #215)', () => {
    it('calls recordFirstApiCall on the first API call (listGists)', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({ login: 'testuser' }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify([makeGitHubGist('gist-1')]), { status: 200 })
        );

      await listGists();

      expect(recordFirstApiCall).toHaveBeenCalled();
    });

    it('calls recordFirstApiCall on getGist', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(makeGitHubGist('gist-1')), { status: 200 })
      );

      await getGist('gist-1');

      expect(recordFirstApiCall).toHaveBeenCalled();
    });

    it('calls recordFirstApiCall on createGist', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(makeGitHubGist('gist-new')), { status: 201 })
      );

      const payload: CreateGistRequest = {
        description: 'New',
        public: true,
        files: { 'test.js': { content: 'console.log("hi")' } },
      };
      await createGist(payload);

      expect(recordFirstApiCall).toHaveBeenCalled();
    });

    it('calls recordFirstApiCall on updateGist', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(makeGitHubGist('gist-1')), { status: 200 })
      );

      const payload: UpdateGistRequest = {
        description: 'Updated',
        files: { 'test.js': { content: 'console.log("updated")' } },
      };
      await updateGist('gist-1', payload);

      expect(recordFirstApiCall).toHaveBeenCalled();
    });

    it('calls recordFirstApiCall on deleteGist', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

      await deleteGist('gist-1');

      expect(recordFirstApiCall).toHaveBeenCalled();
    });

    it('calls recordFirstApiCall on starGist', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

      await starGist('gist-1');

      expect(recordFirstApiCall).toHaveBeenCalled();
    });

    it('calls recordFirstApiCall on unstarGist', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

      await unstarGist('gist-1');

      expect(recordFirstApiCall).toHaveBeenCalled();
    });

    it('calls recordFirstApiCall on checkIfStarred', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

      await checkIfStarred('gist-1');

      expect(recordFirstApiCall).toHaveBeenCalled();
    });

    it('calls recordFirstApiCall on forkGist', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(makeGitHubGist('gist-fork')), { status: 201 })
      );

      await forkGist('gist-1');

      expect(recordFirstApiCall).toHaveBeenCalled();
    });

    it('calls recordFirstApiCall on listGistRevisions', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      await listGistRevisions('gist-1');

      expect(recordFirstApiCall).toHaveBeenCalled();
    });
  });

  // ── ADR-016: lazy content hydration (files=false) ────────────────

  describe('ADR-016: lazy content hydration (files=false)', () => {
    it('listGists includes files=false in the request URL', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({ login: 'testuser' }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify([makeGitHubGist('gist-1')]), {
            status: 200,
            headers: {
              Link: '<https://api.github.com/user/gists?page=2>; rel="next", <https://api.github.com/user/gists?page=5>; rel="last"',
            },
          })
        );

      await listGists();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('files=false'),
        expect.any(Object)
      );
    });

    it('listStarredGists includes files=false in the request URL', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify([makeGitHubGist('starred-1')]), { status: 200 })
      );

      await listStarredGists();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('files=false'),
        expect.any(Object)
      );
    });

    it('getGist does NOT include files=false (full content)', async () => {
      const gist = makeGitHubGist('gist-1');
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(gist), { status: 200 }));

      await getGist('gist-1');

      const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
      expect(calledUrl).not.toContain('files=false');
    });

    it('listGists custom pagination still includes files=false', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({ login: 'testuser' }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      await listGists({ page: 2, perPage: 50 });

      const calledUrl = fetchMock.mock.calls[1]?.[0] as string;
      expect(calledUrl).toContain('files=false');
      expect(calledUrl).toContain('page=2&per_page=50');
    });

    it('listGists preserves pagination metadata', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({ login: 'testuser' }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify([makeGitHubGist('gist-1')]), {
            status: 200,
            headers: {
              Link: '<https://api.github.com/user/gists?page=2>; rel="next", <https://api.github.com/user/gists?page=5>; rel="last"',
            },
          })
        );

      const result = await listGists();

      expect(result.pagination?.nextPage).toBe(2);
      expect(result.pagination?.lastPage).toBe(5);
    });

    it('listGists handles empty response', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({ login: 'testuser' }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      const result = await listGists();

      expect(result.data).toHaveLength(0);
      expect(result.pagination?.nextPage).toBeNull();
    });

    it('304 cached response returns cached payload', async () => {
      const cachedData = {
        data: [makeGitHubGist('gist-1')],
        pagination: { nextPage: 2, prevPage: null, firstPage: 1, lastPage: 5, totalPages: 5 },
      };

      const { getEtag } = await import('../../src/services/db');
      vi.mocked(getEtag).mockResolvedValue({
        etag: '"cached-etag"',
        data: cachedData,
      });

      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify({ login: 'testuser' }), { status: 200 }))
        .mockResolvedValueOnce(new Response(null, { status: 304 }));

      const result = await listGists();

      expect(result.data).toHaveLength(1);
      expect(result.pagination?.nextPage).toBe(2);
    });
  });
});
