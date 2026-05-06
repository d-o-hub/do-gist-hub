import { test, expect } from '@playwright/test';

test.describe('GistStore Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Ensure we are authenticated and DB is initialized for GistStore to work
    await page.evaluate(async () => {
      const { setMetadata, initIndexedDB } = await import('/src/services/db.ts');
      await initIndexedDB();
      await setMetadata('github-pat-enc', { data: 'dummy', iv: 'dummy' });
      await setMetadata('github-username', 'testuser');
    });
    await page.reload();
  });

  test('should initialize and load gists from IndexedDB', async ({ page }) => {
    const gists = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      await gistStore.init();
      return gistStore.getGists();
    });
    expect(Array.isArray(gists)).toBe(true);
  });

  test('should filter gists correctly', async ({ page }) => {
    const results = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      // Mock some gists in the store via internal access
      const gs = gistStore as unknown as { gists: Array<Record<string, unknown>> };
      gs.gists = [
        {
          id: '1',
          starred: true,
          description: 'Starred Gist',
          files: {},
          htmlUrl: '',
          gitPullUrl: '',
          gitPushUrl: '',
          createdAt: '',
          updatedAt: '',
          public: false,
          syncStatus: 'synced',
        },
        {
          id: '2',
          starred: false,
          description: 'My Gist',
          files: {},
          htmlUrl: '',
          gitPullUrl: '',
          gitPushUrl: '',
          createdAt: '',
          updatedAt: '',
          public: false,
          syncStatus: 'synced',
        },
      ];
      return {
        all: gistStore.filterGists('all'),
        mine: gistStore.filterGists('mine'),
        starred: gistStore.filterGists('starred'),
      };
    });

    expect(results.all.length).toBe(2);
    expect(results.mine.length).toBe(1);
    expect(results.mine[0].id).toBe('2');
    expect(results.starred.length).toBe(1);
    expect(results.starred[0].id).toBe('1');
  });

  test('should search gists correctly', async ({ page }) => {
    const searchResults = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      const gs = gistStore as unknown as { gists: Array<Record<string, unknown>> };
      gs.gists = [
        {
          id: '1',
          description: 'React Hooks',
          files: { 'hooks.js': { filename: 'hooks.js' } },
          htmlUrl: '',
          gitPullUrl: '',
          gitPushUrl: '',
          createdAt: '',
          updatedAt: '',
          starred: false,
          public: false,
          syncStatus: 'synced',
        },
        {
          id: '2',
          description: 'TypeScript Tips',
          files: { 'tips.ts': { filename: 'tips.ts' } },
          htmlUrl: '',
          gitPullUrl: '',
          gitPushUrl: '',
          createdAt: '',
          updatedAt: '',
          starred: false,
          public: false,
          syncStatus: 'synced',
        },
      ];
      return {
        react: gistStore.searchGists('react'),
        tips: gistStore.searchGists('tips'),
        none: gistStore.searchGists('vue'),
      };
    });

    expect(searchResults.react.length).toBe(1);
    expect(searchResults.tips.length).toBe(1);
    expect(searchResults.none.length).toBe(0);
  });

  test('should handle gist creation (online)', async ({ page, context }) => {
    // Log all requests to debug routing
    page.on('request', (req) => console.log('[REQUEST]', req.method(), req.url()));
    page.on('response', (res) => console.log('[RESPONSE]', res.status(), res.url()));

    // Use context.route() to intercept all requests in the context
    await context.route('**/gists', async (route) => {
      console.log('[MOCK] Intercepted request to:', route.request().url());
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-gist-id',
          description: 'New Gist',
          files: { 'test.txt': { filename: 'test.txt', content: 'hello' } },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          html_url: 'https://gist.github.com/new-gist-id',
        }),
      });
    });

    const result = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      const { initIndexedDB } = await import('/src/services/db.ts');
      await initIndexedDB();
      const record = await gistStore.createGist('New Gist', true, { 'test.txt': 'hello' });
      return { success: Boolean(record), record };
    });

    console.log('[TEST] Result:', result);
    expect(result.success).toBe(true);
  });

  test('should handle gist updates', async ({ page, context }) => {
    await context.route('**/gists/*', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '1',
            description: 'Updated Gist',
            files: { 'test.txt': { filename: 'test.txt', content: 'updated' } },
            updated_at: new Date().toISOString(),
          }),
        });
      }
    });

    const success = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      const { initIndexedDB } = await import('/src/services/db.ts');
      await initIndexedDB();
      const gs = gistStore as unknown as { gists: Array<Record<string, unknown>> };
      gs.gists = [
        {
          id: '1',
          description: 'Old',
          files: {},
          htmlUrl: '',
          gitPullUrl: '',
          gitPushUrl: '',
          createdAt: '',
          updatedAt: '',
          starred: false,
          public: false,
          syncStatus: 'synced',
        },
      ];
      return await gistStore.updateGist('1', { description: 'Updated Gist' });
    });

    expect(success).toBe(true);
  });

  test('should handle gist deletion', async ({ page, context }) => {
    await context.route('**/gists/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204 });
      }
    });

    const success = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      const { initIndexedDB } = await import('/src/services/db.ts');
      await initIndexedDB();
      const gs = gistStore as unknown as { gists: Array<Record<string, unknown>> };
      gs.gists = [
        {
          id: '1',
          description: 'To Delete',
          files: {},
          htmlUrl: '',
          gitPullUrl: '',
          gitPushUrl: '',
          createdAt: '',
          updatedAt: '',
          starred: false,
          public: false,
          syncStatus: 'synced',
        },
      ];
      return await gistStore.deleteGist('1');
    });

    expect(success).toBe(true);
  });

  test('should toggle star status', async ({ page, context }) => {
    await context.route('**/gists/*/star', async (route) => {
      await route.fulfill({ status: 204 });
    });

    const starred = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      const { initIndexedDB } = await import('/src/services/db.ts');
      await initIndexedDB();
      const gs = gistStore as unknown as { gists: Array<Record<string, unknown>> };
      gs.gists = [
        {
          id: '1',
          starred: false,
          description: 'Gist',
          files: {},
          htmlUrl: '',
          gitPullUrl: '',
          gitPushUrl: '',
          createdAt: '',
          updatedAt: '',
          public: false,
          syncStatus: 'synced',
        },
      ];
      await gistStore.toggleStar('1');
      return gistStore.getGist('1')?.starred;
    });

    expect(starred).toBe(true);
  });
});
