import { test as base, expect } from '@playwright/test';

export { expect };

export const test = base.extend({
  page: async ({ page }, use) => {
    // Navigate to baseURL to ensure we are on the correct origin for storage access
    const baseURL = base.info().project.use.baseURL || 'http://localhost:3000';
    await page.goto(baseURL);

    // Clear all state before each test to ensure absolute isolation
    await page.evaluate(async () => {
      try {
        localStorage.clear();
        sessionStorage.clear();

        // Delete all IndexedDB databases used by the app
        const databases = ['d-o-gist-hub-db', 'gist-cache'];
        for (const dbName of databases) {
          await new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(dbName);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          });
        }
      } catch (err) {
        // skipcq: JS-0002
        console.error('State isolation failed:', err);
      }
    });

    await use(page);
  },
});
