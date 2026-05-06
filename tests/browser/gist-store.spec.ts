import { test, expect } from '../base';

test.describe('GistStore Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.evaluate(async () => {
      const { setMetadata } = await import('/src/services/db.ts');
      await setMetadata('github-username', 'testuser');
      // Set a dummy token so buildHeaders doesn't fail
      await setMetadata('github-pat-enc', { data: 'd', iv: 'i' });
    });
    await page.reload();

    // Re-apply mock after reload
    await page.evaluate(async () => {
      const { default: networkMonitor } = await import('/src/services/network/offline-monitor.ts');
      networkMonitor.isOnline = () => true;
      (networkMonitor as unknown as Record<string, unknown>).status = 'online';
    });
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
      const gs = gistStore as unknown as { gists: Array<Record<string, unknown>> };
      gs.gists = [
        {
          id: '1',
          starred: true,
          description: 'S',
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
          description: 'M',
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
    expect(results.starred.length).toBe(1);
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

  test('should handle gist creation (online)', async ({ page }) => {
    // Initialize the store first
    await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      await gistStore.init();
    });

    await page.route('**/gists', async (route) => {
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
      return await gistStore.createGist('New Gist', true, { 'test.txt': 'hello' });
    });

    expect(result).toBeTruthy();
    expect((result as Record<string, unknown>)?.description).toBe('New Gist');
  });

  test('should handle gist updates', async ({ page }) => {
    // Initialize the store first
    await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      await gistStore.init();
    });

    await page.route('**/gists/*', async (route) => {
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

    const result = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
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

    expect(result).toBeTruthy();
  });

  test('should handle gist deletion', async ({ page }) => {
    // Initialize the store first
    await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      await gistStore.init();
    });

    await page.route('**/gists/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204 });
      }
    });

    const success = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
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

  test('should toggle star status', async ({ page }) => {
    // Initialize the store first
    await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      await gistStore.init();
    });

    await page.route('**/gists/*/star', async (route) => {
      await route.fulfill({ status: 204 });
    });

    const starred = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
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
