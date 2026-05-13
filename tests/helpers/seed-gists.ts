/**
 * Test Data Seeding Helper
 * Seeds IndexedDB with mock gist records so Playwright tests
 * can verify card rendering, container queries, navigation, etc.
 * without requiring GitHub authentication.
 */
import type { Page } from '@playwright/test';
import type { GistRecord } from '../../src/services/db';

/**
 * Create a mock gist record with sensible defaults.
 * Override any field for test-specific scenarios.
 */
export function makeGistRecord(
  id: string,
  overrides: Partial<GistRecord> = {},
): GistRecord {
  return {
    id,
    description: `Test Gist ${id}`,
    files: {
      'test.txt': { filename: 'test.txt', content: 'hello world' },
    },
    htmlUrl: `https://gist.github.com/${id}`,
    gitPullUrl: `https://api.github.com/gists/${id}/git/pull`,
    gitPushUrl: `https://api.github.com/gists/${id}/git/push`,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-15T00:00:00Z',
    starred: false,
    public: true,
    syncStatus: 'synced',
    ...overrides,
  };
}

/** Default set of test gists for standard rendering tests. */
export const DEFAULT_TEST_GISTS: GistRecord[] = [
  makeGistRecord('test-gist-1', { description: 'First Test Gist' }),
  makeGistRecord('test-gist-2', { description: 'Second Test Gist', starred: true }),
  makeGistRecord('test-gist-3', { description: 'Third Test Gist' }),
  makeGistRecord('test-gist-4', {
    description: 'Multi-file Gist',
    files: {
      'index.ts': { filename: 'index.ts', content: 'export const x = 1;' },
      'utils.ts': { filename: 'utils.ts', content: 'export const y = 2;' },
    },
  }),
  makeGistRecord('test-gist-5', {
    description: 'Starred Private Gist',
    starred: true,
    public: false,
  }),
];

/**
 * Seed mock gist records into IndexedDB.
 *
 * Call this in a test's beforeEach after page.goto('/') and
 * page.waitForLoadState('networkidle'). Then reload the page
 * so gistStore.init() picks up the seeded records.
 *
 * The dynamic import of /src/services/db reuses the already-loaded
 * module from the app bundle, so initIndexedDB() returns the
 * existing connection and saveGists() writes test data.
 */
export async function seedGists(
  page: Page,
  gists: GistRecord[] = DEFAULT_TEST_GISTS,
): Promise<void> {
  await page.evaluate(async (gistData) => {
    const { initIndexedDB, saveGists } = await import('/src/services/db');
    await initIndexedDB();
    await saveGists(gistData);
  }, gists);
}
