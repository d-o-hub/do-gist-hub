import { test as base, expect } from '@playwright/test';

export { expect };

export const test = base.extend({
  page: async ({ page }, use) => {
    // Force online status for all tests to ensure consistent behavior
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'onLine', { get: () => true });
      window.dispatchEvent(new Event('online'));
    });

    // Clear state BEFORE the test starts
    const baseURL = base.info().project.use.baseURL || 'http://localhost:3000';

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
        // skipcq: JS-0002
        console.error('Failed to clear state:', e);
      }
    });

    await use(page);
  },
});
