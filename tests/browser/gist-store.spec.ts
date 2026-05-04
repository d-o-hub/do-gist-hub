import { test, expect } from '../base';

test.describe('GistStore Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.evaluate(async () => {
      const { setMetadata } = await import('/src/services/db.ts');
      await setMetadata('github-pat-enc', { data: 'dummy', iv: 'dummy' });
      await setMetadata('github-username', 'testuser');

      const { default: nm } = await import('/src/services/network/offline-monitor.ts');
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
    const result = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      const { default: nm } = await import('/src/services/network/offline-monitor.ts');
      nm.isOnline = () => true;

      // Mock GitHub client directly to avoid auth/network issues in store test
      const GitHub = await import('/src/services/github/client.ts');
      GitHub.createGist = async () => ({
        id: 'new-id',
        description: 'D',
        files: { 'f.ts': { filename: 'f.ts', content: 'c' } },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        html_url: '',
        git_pull_url: '',
        git_push_url: '',
        public: true,
        owner: { login: 'u', id: 1, avatar_url: '', html_url: '' }
      });

      return await gistStore.createGist('New Gist', true, { 'test.txt': 'hello' });
    });
    expect(result).not.toBeNull();
    // @ts-ignore
    expect(result.id).toBe('new-id');
  });

  test('should handle gist updates', async ({ page }) => {
    const success = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      const { default: nm } = await import('/src/services/network/offline-monitor.ts');
      nm.isOnline = () => true;

      const GitHub = await import('/src/services/github/client.ts');
      GitHub.updateGist = async () => ({
        id: '1',
        description: 'Up',
        files: {},
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        html_url: '',
        git_pull_url: '',
        git_push_url: '',
        public: true
      });

      const gs = gistStore as unknown as { gists: Array<Record<string, unknown>> };
      gs.gists = [{ id: '1', description: 'Old', files: {}, htmlUrl: '', gitPullUrl: '', gitPushUrl: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), starred: false, public: false, syncStatus: 'synced' }];
      return await gistStore.updateGist('1', { description: 'Updated' });
    });
    expect(success).toBe(true);
  });

  test('should handle gist deletion', async ({ page }) => {
    const success = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      const { default: nm } = await import('/src/services/network/offline-monitor.ts');
      nm.isOnline = () => true;

      const GitHub = await import('/src/services/github/client.ts');
      GitHub.deleteGist = async () => {};

      const gs = gistStore as unknown as { gists: Array<Record<string, unknown>> };
      gs.gists = [{ id: '1', description: 'D', files: {}, htmlUrl: '', gitPullUrl: '', gitPushUrl: '', createdAt: '', updatedAt: '', starred: false, public: false, syncStatus: 'synced' }];
      return await gistStore.deleteGist('1');
    });
    expect(success).toBe(true);
  });

  test('should toggle star status', async ({ page }) => {
    const starred = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      const { default: nm } = await import('/src/services/network/offline-monitor.ts');
      nm.isOnline = () => true;

      const GitHub = await import('/src/services/github/client.ts');
      GitHub.starGist = async () => {};
      GitHub.unstarGist = async () => {};

      const gs = gistStore as unknown as { gists: Array<Record<string, unknown>> };
      gs.gists = [{ id: '1', starred: false, description: 'G', files: {}, htmlUrl: '', gitPullUrl: '', gitPushUrl: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), public: false, syncStatus: 'synced' }];
      await gistStore.toggleStar('1');
      return gistStore.getGist('1')?.starred;
    });
    expect(starred).toBe(true);
  });
});
