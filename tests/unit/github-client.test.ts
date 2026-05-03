import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

// ─── Imports (after mocks) ───────────────────────────────────────────

import {
  validateToken,
  listGists,
  listStarredGists,
  getGist,
  createGist,
  updateGist,
  deleteGist,
  starGist,
  unstarGist,
  checkIfStarred,
  forkGist,
  listGistRevisions,
  cancelAllRequests,
  clearUsernameCache,
  type GitHubGist,
  type CreateGistRequest,
  type UpdateGistRequest,
} from '../../src/services/github/client';

import { trackRateLimit } from '../../src/services/github/rate-limiter';

// ─── Helpers ─────────────────────────────────────────────────────────

function makeGitHubGist(id: string, overrides: Partial<GitHubGist> = {}): GitHubGist {
  return {
    id,
    node_id: `node_${id}`,
    git_pull_url: `https://api.github.com/gists/${id}/git/pull`,
    git_push_url: `https://api.github.com/gists/${id}/git/push`,
    html_url: `https://gist.github.com/${id}`,
    files: { 'test.txt': { filename: 'test.txt', content: 'hello', type: 'text/plain' } },
    public: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    description: `Gist ${id}`,
    comments: 0,
    user: null,
    comments_url: `https://api.github.com/gists/${id}/comments`,
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────

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

      const result = await validateToken('valid-token');
      expect(result.isValid).toBe(true);
      expect(result.username).toBe('testuser');
    });

    it('returns valid=false for invalid token', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Bad credentials' }), { status: 401 })
      );

      const result = await validateToken('invalid-token');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Bad credentials');
    });

    it('handles network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));
      const result = await validateToken('any-token');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

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
          new Response(
            JSON.stringify([makeGitHubGist('gist-1'), makeGitHubGist('gist-2')]),
            {
              status: 200,
              headers: {
                Link: '<https://api.github.com/user/gists?page=2>; rel="next", <https://api.github.com/user/gists?page=5>; rel="last"',
              },
            }
          )
        );

      const result = await listGists();

      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.id).toBe('gist-1');
      expect(result.pagination?.nextPage).toBe(2);
      expect(result.pagination?.lastPage).toBe(5);
    });

    it('fetches with custom pagination options', async () => {
      fetchMock
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ login: 'testuser' }), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([]), { status: 200 })
        );

      await listGists({ page: 2, perPage: 50 });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
    });
  });

  // ── listStarredGists ──────────────────────────────────────────────────

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
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(gist), { status: 200 })
      );

      const result = await getGist('gist-1');
      expect(result.id).toBe('gist-1');
    });
  });

  // ── createGist ──────────────────────────────────────────────────────

  describe('createGist', () => {
    it('creates a new gist', async () => {
      const gist = makeGitHubGist('new-gist');
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(gist), { status: 201 })
      );

      const payload: CreateGistRequest = {
        description: 'Test Gist',
        public: true,
        files: { 'test.txt': { content: 'hello' } },
      };

      const result = await createGist(payload);
      expect(result.id).toBe('new-gist');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/gists',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  // ── updateGist ──────────────────────────────────────────────────────

  describe('updateGist', () => {
    it('updates an existing gist', async () => {
      const gist = makeGitHubGist('gist-1', { description: 'Updated' });
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(gist), { status: 200 })
      );

      const payload: UpdateGistRequest = { description: 'Updated' };
      const result = await updateGist('gist-1', payload);
      expect(result.description).toBe('Updated');
    });
  });

  // ── deleteGist ────────────────────────────────────────────────────

  describe('deleteGist', () => {
    it('deletes a gist', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );

      await deleteGist('gist-1');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/gists/gist-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // ── starGist / unstarGist ─────────────────────────────────────────────

  describe('starGist / unstarGist', () => {
    it('stars a gist', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );

      await starGist('gist-1');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/gists/gist-1/star',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('unstars a gist', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );

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
      fetchMock.mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );

      const result = await checkIfStarred('gist-1');
      expect(result).toBe(true);
    });

    it('returns false when gist is not starred (404)', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(null, { status: 404 })
      );

      const result = await checkIfStarred('gist-1');
      expect(result).toBe(false);
    });
  });

  // ── forkGist ──────────────────────────────────────────────────────────

  describe('forkGist', () => {
    it('forks a gist', async () => {
      const gist = makeGitHubGist('forked-gist');
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(gist), { status: 201 })
      );

      const result = await forkGist('gist-1');
      expect(result.id).toBe('forked-gist');
    });
  });

  // ── listGistRevisions ──────────────────────────────────────────────────

  describe('listGistRevisions', () => {
    it('lists gist revisions', async () => {
      const revisions = [{ version: 'abc123', committed_at: '2024-01-01T00:00:00Z' }];
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(revisions), { status: 200 })
      );

      const result = await listGistRevisions('gist-1');
      expect(result).toHaveLength(1);
    });
  });

  // ── Request deduplication ──────────────────────────────────────────────

  describe('request deduplication', () => {
    it('deduplicates concurrent identical requests', async () => {
      const gist = makeGitHubGist('gist-1');

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(gist), { status: 200 })
      );

      const [result1, result2] = await Promise.all([
        getGist('gist-1'),
        getGist('gist-1'),
      ]);

      expect(result1.id).toBe('gist-1');
      expect(result2.id).toBe('gist-1');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  // ── Pagination parsing ────────────────────────────────────────────────

  describe('pagination parsing', () => {
    it('parses Link header correctly', async () => {
      fetchMock
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ login: 'testuser' }), { status: 200 })
        )
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
});
