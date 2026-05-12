/**
 * GitHub API Mocking Helper
 *
 * Uses Playwright's page.route() to intercept GitHub API calls and return
 * mock data matching seeded IndexedDB records. This eliminates the need for
 * GitHub authentication in Playwright tests and fixes the 4 skipped detail
 * navigation tests in container-queries.spec.ts and parallax-verification.spec.ts.
 *
 * The key insight: hydrateGist() calls GitHub.getGist(id) when online, which
 * times out without auth. By mocking the API response, we ensure the detail
 * view renders correctly from IndexedDB-seeded data.
 */
import type { Page } from '@playwright/test';
import type { GitHubGist, GistFile, PaginatedResult } from '../../src/types/api';
import type { GistRecord } from '../../src/services/db';

/**
 * Convert an IndexedDB GistRecord back to the GitHubGist API response shape.
 * This is the inverse of GistStore.githubGistToRecord().
 */
export function gistRecordToGitHubGist(record: GistRecord): GitHubGist {
  return {
    id: record.id,
    node_id: `node-${record.id}`,
    git_pull_url: record.gitPullUrl,
    git_push_url: record.gitPushUrl,
    html_url: record.htmlUrl,
    files: Object.fromEntries(
      Object.entries(record.files).map(
        ([key, f]): [string, GistFile] => [
          key,
          {
            filename: f.filename,
            content: f.content ?? '',
            raw_url: f.rawUrl,
            language: f.language,
            type: 'text/plain',
            size: f.content?.length ?? 0,
          },
        ],
      ),
    ),
    public: record.public,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    description: record.description ?? null,
    comments: 0,
    user: null,
    comments_url: `https://api.github.com/gists/${record.id}/comments`,
    owner: record.owner
      ? {
          login: record.owner.login,
          id: record.owner.id,
          avatar_url: record.owner.avatarUrl,
          html_url: record.owner.htmlUrl,
        }
      : undefined,
  };
}

const EMPTY_PAGINATED: PaginatedResult<never> = {
  data: [],
  pagination: {
    nextPage: null,
    prevPage: null,
    firstPage: null,
    lastPage: null,
    totalPages: null,
  },
};

/**
 * Install GitHub API route interceptors on a Playwright page.
 *
 * Intercepts:
 * - GET /gists/{id}         → returns mock GitHubGist for the seeded gist
 * - GET /gists/starred?...  → returns empty PaginatedResult
 * - GET /gists/{id}/revisions → returns empty array
 * - All other requests       → pass through unchanged
 *
 * Call this in beforeEach after page.goto('/') but before any
 * interactions that trigger GitHub API calls.
 */
export async function mockGitHubApi(
  page: Page,
  gists: GistRecord[],
): Promise<void> {
  const gistMap = new Map(gists.map((g) => [g.id, gistRecordToGitHubGist(g)]));

  await page.route('**/api.github.com/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    // GET /gists/starred?... — listStarredGists() in loadGists()
    // MUST come before the /gists/{id} regex below, since that also matches /gists/starred
    if (path === '/gists/starred' && method === 'GET') {
      await route.fulfill({
        status: 200,
        json: EMPTY_PAGINATED,
        headers: { link: '' },
      });
      return;
    }

    // GET /gists/{id}/revisions — listGistRevisions()
    const revMatch = path.match(/^\/gists\/([^/]+)\/revisions$/);
    if (revMatch && method === 'GET') {
      await route.fulfill({ status: 200, json: [] });
      return;
    }

    // GET /gists/{id} — hydrateGist() detail load
    const getGistMatch = path.match(/^\/gists\/([^/]+)$/);
    if (getGistMatch && method === 'GET') {
      const id = getGistMatch[1]!;
      const gist = gistMap.get(id);
      if (gist) {
        await route.fulfill({ status: 200, json: gist });
        return;
      }
      // Unknown gist ID — return 404
      await route.fulfill({ status: 404, json: { message: 'Not Found' } });
      return;
    }

    // Pass through all other API calls (e.g. /user for validateToken)
    await route.continue();
  });
}
