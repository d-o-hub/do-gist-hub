import { test, expect } from '../base';

test.describe('GistStore Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Ensure we are authenticated for GistStore to work
    await page.evaluate(async () => {
      const { setMetadata } = await import('/src/services/db.ts');
      await setMetadata('github-pat-enc', { data: 'dummy', iv: 'dummy' });
      await setMetadata('github-username', 'testuser');

      const { default: nm } = await import('/src/services/network/offline-monitor.ts');
      // @ts-ignore
      nm.status = 'online';
      nm.isOnline = () => true;
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
      const gs = gistStore as unknown as { gists: Array<Record<string, unknown>> };
      gs.gists = [
        { id: '1', starred: true, description: 'S', files: {}, htmlUrl: '', gitPullUrl: '', gitPushUrl: '', createdAt: '', updatedAt: '', public: false, syncStatus: 'synced' },
        { id: '2', starred: false, description: 'M', files: {}, htmlUrl: '', gitPullUrl: '', gitPushUrl: '', createdAt: '', updatedAt: '', public: false, syncStatus: 'synced' }
      ];
      return {
        all: gistStore.filterGists('all'),
        mine: gistStore.filterGists('mine'),
        starred: gistStore.filterGists('starred')
      };
    });
    expect(results.all.length).toBe(2);
  });

  test('should handle gist creation (online)', async ({ page }) => {
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
          git_pull_url: 'https://gist.github.com/new-gist-id.git',
          git_push_url: 'https://gist.github.com/new-gist-id.git',
          public: true,
          owner: { login: 'testuser', id: 1, avatar_url: '', html_url: '' }
        }),
      });
    });

    const result = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      const { default: nm } = await import('/src/services/network/offline-monitor.ts');
      // @ts-ignore
      nm.status = 'online';
      nm.isOnline = () => true;
      return await gistStore.createGist('New Gist', true, { 'test.txt': 'hello' });
    });

    expect(result).not.toBeNull();
    // @ts-ignore
    expect(result.id).toBe('new-gist-id');
  });

  test('should handle gist updates', async ({ page }) => {
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
            created_at: new Date().toISOString(),
            html_url: '',
            git_pull_url: '',
            git_push_url: '',
            public: false,
            owner: { login: 'testuser', id: 1, avatar_url: '', html_url: '' }
          }),
        });
      }
    });

    const success = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      const { default: nm } = await import('/src/services/network/offline-monitor.ts');
      // @ts-ignore
      nm.status = 'online';
      nm.isOnline = () => true;
      const gs = gistStore as unknown as { gists: Array<Record<string, unknown>> };
      gs.gists = [{ id: '1', description: 'Old', files: {}, htmlUrl: '', gitPullUrl: '', gitPushUrl: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), starred: false, public: false, syncStatus: 'synced' }];
      return await gistStore.updateGist('1', { description: 'Updated Gist' });
    });

    expect(success).toBe(true);
  });

  test('should handle gist deletion', async ({ page }) => {
    await page.route('**/gists/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204 });
      }
    });

    const success = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      const { default: nm } = await import('/src/services/network/offline-monitor.ts');
      // @ts-ignore
      nm.status = 'online';
      nm.isOnline = () => true;
      const gs = gistStore as unknown as { gists: Array<Record<string, unknown>> };
      gs.gists = [{ id: '1', description: 'To Delete', files: {}, htmlUrl: '', gitPullUrl: '', gitPushUrl: '', createdAt: '', updatedAt: '', starred: false, public: false, syncStatus: 'synced' }];
      return await gistStore.deleteGist('1');
    });

    expect(success).toBe(true);
  });

  test('should toggle star status', async ({ page }) => {
    await page.route('**/gists/*/star', async (route) => {
      await route.fulfill({ status: 204 });
    });

    const starred = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      const { default: nm } = await import('/src/services/network/offline-monitor.ts');
      // @ts-ignore
      nm.status = 'online';
      nm.isOnline = () => true;
      const gs = gistStore as unknown as { gists: Array<Record<string, unknown>> };
      gs.gists = [{ id: '1', starred: false, description: 'Gist', files: {}, htmlUrl: '', gitPullUrl: '', gitPushUrl: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), public: false, syncStatus: 'synced' }];
      await gistStore.toggleStar('1');
      return gistStore.getGist('1')?.starred;
    });

    expect(starred).toBe(true);
  });
});
