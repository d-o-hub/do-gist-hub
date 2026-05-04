import { test as base, expect } from '@playwright/test';

export { expect };

export const test = base.extend({
  page: async ({ page }, use) => {
    const baseURL = base.info().project.use.baseURL || 'http://localhost:3000';

    // Navigate to the origin to have access to its storage
    await page.goto(baseURL);

    // Absolute isolation: clear all client-side state
    await page.evaluate(async () => {
      try {
        // 1. Unregister Service Workers
        if (navigator.serviceWorker) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.unregister();
          }
        }

        // 2. Clear Cache Storage
        if (window.caches) {
          const keys = await caches.keys();
          for (const key of keys) {
            await caches.delete(key);
          }
        }

        // 3. Clear Web Storage
        localStorage.clear();
        sessionStorage.clear();

        // 4. Delete IndexedDB Databases
        const databases = ['d-o-gist-hub-db', 'gist-cache'];
        for (const dbName of databases) {
          await new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(dbName);
            // We resolve even on error/block to avoid hanging the test
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          });
        }
      } catch (err) {
        // skipcq: JS-0002
        console.error('Isolation cleanup failed:', err);
      }
    });

    // Move away from the page so the test can start with its own page.goto
    await page.goto('about:blank');

    await use(page);
  },
});
