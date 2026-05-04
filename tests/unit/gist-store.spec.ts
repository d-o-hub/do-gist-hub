import { test, expect } from '@playwright/test';

test.describe('GistStore logic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should search gists correctly', async ({ page }) => {
    const results = await page.evaluate(async () => {
      const { default: gistStore } = await import('./src/stores/gist-store');
      gistStore.gists = [
        {
          id: '1',
          description: 'test gist',
          files: { 'a.txt': { filename: 'a.txt' } },
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          description: 'other',
          files: { 'other.js': { filename: 'other.js' } },
          updatedAt: new Date().toISOString(),
        },
      ];
      return {
        descSearch: gistStore.searchGists('test'),
        fileSearch: gistStore.searchGists('other.js'),
      };
    });
    expect(results.descSearch.length).toBe(1);
    expect(results.fileSearch.length).toBe(1);
  });
});
