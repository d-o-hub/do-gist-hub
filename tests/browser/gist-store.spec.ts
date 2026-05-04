import { test, expect } from '../base';

test.describe('GistStore Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.evaluate(async () => {
      const { setMetadata, flushGistWrites } = await import('/src/services/db.ts');
      const { encrypt } = await import('/src/services/security/crypto.ts');
      const encrypted = await encrypt('dummy-token');
      await setMetadata('github-pat-enc', encrypted);
      await setMetadata('github-username', 'testuser');
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
      const gs = gistStore as any;
      gs.gists = [
        { id: '1', starred: true, updatedAt: new Date().toISOString(), files: {}, syncStatus: 'synced' },
        { id: '2', starred: false, updatedAt: new Date().toISOString(), files: {}, syncStatus: 'synced' }
      ];
      return {
        all: gistStore.filterGists('all'),
        starred: gistStore.filterGists('starred')
      };
    });
    expect(results.all.length).toBe(2);
    expect(results.starred.length).toBe(1);
  });

  test('should search gists correctly', async ({ page }) => {
    const searchResults = await page.evaluate(async () => {
      const { default: gistStore } = await import('/src/stores/gist-store.ts');
      const gs = gistStore as any;
      gs.gists = [
        { id: '1', description: 'React Hooks', files: { 'hooks.js': { filename: 'hooks.js' } }, updatedAt: new Date().toISOString(), starred: false, syncStatus: 'synced' },
        { id: '2', description: 'TypeScript Tips', files: { 'tips.ts': { filename: 'tips.ts' } }, updatedAt: new Date().toISOString(), starred: false, syncStatus: 'synced' }
      ];
      return {
        react: gistStore.searchGists('react'),
        tips: gistStore.searchGists('tips'),
        none: gistStore.searchGists('vue')
      };
    });

    expect(searchResults.react.length).toBe(1);
    expect(searchResults.tips.length).toBe(1);
    expect(searchResults.none.length).toBe(0);
  });
});
