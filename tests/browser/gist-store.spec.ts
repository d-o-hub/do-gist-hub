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
      const gs = gistStore as any;
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
});
