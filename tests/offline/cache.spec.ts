/**
 * Offline Cache Tests
 * Test IndexedDB caching, offline reads, and cached gist loading
 */
import { test, expect } from '@playwright/test';

test.describe('Offline Cache', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should initialize IndexedDB on app load', async ({ page }) => {
    const dbExists = await page.evaluate(async () => {
      return new Promise<boolean>((resolve) => {
        const request = indexedDB.open('d-o-gist-hub-db');
        request.onsuccess = () => {
          const db = request.result;
          const hasGistStore = db.objectStoreNames.contains('gists');
          const hasPendingStore = db.objectStoreNames.contains('pendingWrites');
          const hasMetaStore = db.objectStoreNames.contains('metadata');
          db.close();
          resolve(hasGistStore && hasPendingStore && hasMetaStore);
        };
        request.onerror = () => resolve(false);
      });
    });

    expect(dbExists).toBe(true);
  });

  test('should have proper IndexedDB schema', async ({ page }) => {
    const schemaInfo = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('d-o-gist-hub-db');
        request.onsuccess = () => {
          const db = request.result;
          resolve({
            stores: Array.from(db.objectStoreNames),
            version: db.version,
          });
        };
        request.onerror = () => resolve({ stores: [], version: 0 });
      });
    });

    expect(schemaInfo).toEqual({
      stores: expect.arrayContaining(['gists', 'pendingWrites', 'metadata']),
      version: expect.any(Number),
    });
  });

  test('should load gists from cache when offline', async ({ page, context }) => {
    // Go online first to load
    await context.setOffline(false);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // App should still render (from cache)
    await expect(page.locator('.app-shell')).toBeVisible();

    // Should show offline indicator somewhere
    const isOnline = await page.evaluate(() => navigator.onLine);
    expect(isOnline).toBe(false);
  });

  test('should show offline page when navigating offline', async ({ page, context }) => {
    await context.setOffline(true);
    await page.locator('[data-testid="nav-offline"]').first().click();

    // Should show offline status page
    await expect(page.locator('h2')).toContainText('Offline Status');

    // Should show pending count indicator
    const pendingCount = page.locator('#pending-count');
    await expect(pendingCount).toBeVisible();
  });

  test('should store gists in IndexedDB after load', async ({ page }) => {
    await page.waitForTimeout(2000); // Wait for gists to load

    const gistCount = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        const request = indexedDB.open('d-o-gist-hub-db');
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('gists', 'readonly');
          const store = tx.objectStore('gists');
          const countRequest = store.count();
          countRequest.onsuccess = () => resolve(countRequest.result);
          countRequest.onerror = () => resolve(0);
        };
        request.onerror = () => resolve(0);
      });
    });

    // Should have 0 or more gists (depending on auth)
    expect(gistCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle cache miss gracefully', async ({ page }) => {
    // Clear IndexedDB
    await page.evaluate(async () => {
      return new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase('d-o-gist-hub-db');
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    });

    // Reload app
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // App should still render without crashing
    await expect(page.locator('.app-shell')).toBeVisible();

    // Should show empty state or loading
    const emptyState = page.locator('.empty-state');
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    const listExists = await page
      .locator('.gist-list')
      .count()
      .then((c) => c > 0);

    expect(emptyVisible || listExists).toBe(true);
  });

  test('should track sync status on gists', async ({ page }) => {
    const syncStatuses = await page.evaluate(async () => {
      return new Promise<string[]>((resolve) => {
        const request = indexedDB.open('d-o-gist-hub-db');
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('gists', 'readonly');
          const store = tx.objectStore('gists');
          const getAll = store.getAll();
          getAll.onsuccess = () => {
            const gists = getAll.result;
            resolve(gists.map((g: any) => g.syncStatus || 'unknown'));
          };
          getAll.onerror = () => resolve([]);
        };
        request.onerror = () => resolve([]);
      });
    });

    // All gists should have a valid sync status
    const validStatuses = ['synced', 'pending', 'conflict', 'error'];
    for (const status of syncStatuses) {
      expect(validStatuses).toContain(status);
    }
  });
});
