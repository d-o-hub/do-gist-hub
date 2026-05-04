import { test as base, expect } from '@playwright/test';

export { expect };

export const test = base.extend({
  page: async ({ page }, use) => {
    // Clear state before the test starts
    // Use the baseURL from config if available, otherwise localhost:3000
    const baseURL = base.info().project.use.baseURL || 'http://localhost:3000';

    // We navigate to the base URL to clear state for that origin
    await page.goto(baseURL);

    await page.evaluate(async () => {
      try {
        localStorage.clear();
        sessionStorage.clear();

        const databases = ['d-o-gist-hub-db', 'gist-cache'];
        for (const dbName of databases) {
          await new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(dbName);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          });
        }
      } catch (e) {
        console.error('Failed to clear state:', e);
      }
    });

    // NOTE: We do NOT stay on the page. The test will call page.goto() itself.
    // However, some tests assume they start on the page if they don't call goto().
    // Most tests in this repo DO call page.goto() in beforeEach.

    await use(page);
  },
});
