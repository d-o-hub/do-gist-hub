import { test, expect } from '@playwright/test';

test.describe('IndexedDB Performance Optimization', () => {
  test('importData performance benchmark', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Create a large dataset for testing
    const numGists = 1000;
    const testData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      gists: Array.from({ length: numGists }, (_, i) => ({
        id: `gist-${i}`,
        description: `Performance Test Gist ${i}`,
        files: {
          'test.txt': { filename: 'test.txt', content: 'Benchmark content' }
        },
        updatedAt: new Date().toISOString(),
        starred: false,
        syncStatus: 'synced'
      })),
      pendingWrites: [],
      metadata: { total: numGists, starred: 0 },
      logs: []
    };
    const jsonStr = JSON.stringify(testData);

    // Measure the import execution time
    const duration = await page.evaluate(async (json) => {
      const { importData } = await import('./src/services/db.ts');

      const start = performance.now();
      await importData(json);
      const end = performance.now();

      return end - start;
    }, jsonStr);

    console.log(`⏱️ importData with ${numGists} gists took: ${duration.toFixed(2)}ms`);

    // Just a sanity check to make sure it finishes
    expect(duration).toBeGreaterThan(0);
  });
});
