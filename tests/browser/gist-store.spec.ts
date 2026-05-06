import { test, expect } from '../base';

test.describe('GistStore Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock navigator.onLine before page loads
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'onLine', { get: () => true });
      // skipcq: JS-0308
      (window as any).__MOCK_ONLINE__ = true;
    });

    // Setup basic routing for init calls
    await page.route('**/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ login: 'testuser', id: 1, avatar_url: '', html_url: '' }),
      });
    });
    await page.route('**/users/testuser/gists*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
        headers: { link: '' },
      });
    });
    await page.route('**/gists/starred*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
        headers: { link: '' },
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.evaluate(async () => {
      const { setMetadata, flushGistWrites } = await import('/src/services/db.ts');
      const { encrypt } = await import('/src/services/security/crypto.ts');
      const { default: networkMonitor } = await import('/src/services/network/offline-monitor.ts');

      const encrypted = await encrypt('dummy-token');
      await setMetadata('github-pat-enc', encrypted);
      await setMetadata('github-username', 'testuser');

      // Ensure singleton is forced
      networkMonitor.isOnline = () => true;
      // skipcq: JS-0308
      (networkMonitor as any).status = 'online';

      await flushGistWrites();
    });

    await page.reload();
    await page.waitForSelector('.app-shell', { state: 'visible' });
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
      // skipcq: JS-0308
      const gs = gistStore as any;
      gs.gists = [
        {
          id: '1',
          starred: true,
          description: 'Starred Gist',
          files: {},
          htmlUrl: '',
          gitPullUrl: '',
          gitPushUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
      // skipcq: JS-0308
      const gs = gistStore as any;
      gs.gists = [
        {
          id: '1',
          description: 'React Hooks',
          files: { 'hooks.js': { filename: 'hooks.js' } },
          htmlUrl: '',
          gitPullUrl: '',
          gitPushUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
});
