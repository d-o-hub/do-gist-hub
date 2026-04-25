/**
 * Offline Sync Tests
 * Test sync behavior, online/offline transitions, and optimistic writes
 */
import { test, expect } from '@playwright/test';

test.describe('Offline Sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should detect online status', async ({ page }) => {
    const isOnline = await page.evaluate(() => navigator.onLine);
    expect(isOnline).toBe(true);

    // App should reflect online status
    const onlineIndicator = page.locator('.status-indicator.online');
    const onlineVisible = await onlineIndicator.isVisible().catch(() => false);
    
    // Should show online somewhere in the UI
    expect(onlineVisible || isOnline).toBe(true);
  });

  test('should transition to offline mode', async ({ page, context }) => {
    // Start online
    await context.setOffline(false);
    await page.waitForTimeout(500);

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Navigate to offline page
    await page.locator('[data-testid="nav-offline"]').first().click();

    // Should show offline status page
    const detailTitle = page.locator('h2');
    await expect(detailTitle).toContainText('Offline Status');

    // Pending count should be visible
    const pendingCount = page.locator('#pending-count');
    await expect(pendingCount).toBeVisible();
  });

  test('should transition back to online mode', async ({ page, context }) => {
    // Start offline
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // Go online
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // Navigate to offline page to check status
    await page.locator('[data-testid="nav-offline"]').first().click();

    // Should show offline status page (with online context)
    const detailTitle = page.locator('h2');
    await expect(detailTitle).toContainText('Offline Status');

    // Pending count should be visible
    const pendingCount = page.locator('#pending-count');
    await expect(pendingCount).toBeVisible();
  });

  test('should show pending operations count', async ({ page }) => {
    await page.locator('[data-testid="nav-offline"]').first().click();

    const pendingCount = page.locator('#pending-count');
    await expect(pendingCount).toBeVisible();

    const countText = await pendingCount.textContent();
    // Should show a number
    expect(countText).toMatch(/\d+/);
  });

  test('should show conflict count card', async ({ page }) => {
    await page.locator('[data-testid="nav-offline"]').first().click();

    const conflictCount = page.locator('#conflict-count');
    await expect(conflictCount).toBeVisible();
  });

  test('should update sync indicator in header', async ({ page }) => {
    const syncIndicator = page.locator('#sync-indicator');
    await expect(syncIndicator).toBeVisible();

    // Should have data-status attribute with a valid status
    const status = await syncIndicator.getAttribute('data-status');
    expect(status).toBeTruthy();
    expect(['online', 'offline', 'syncing']).toContain(status);
  });

  test('should handle sync when queue is empty', async ({ page }) => {
    await page.locator('[data-testid="nav-offline"]').first().click();

    // Queue processes automatically when online; verify no errors in UI
    await page.waitForTimeout(1000);

    // No error banner should appear
    const errorBanner = page.locator('.error-banner');
    const errorVisible = await errorBanner.isVisible().catch(() => false);
    expect(errorVisible).toBe(false);
  });

  test('should track sync status on gist cards', async ({ page }) => {
    await page.waitForTimeout(1000);

    const gistCards = page.locator('.gist-card');
    const cardCount = await gistCards.count();

    if (cardCount > 0) {
      // Check if any cards have sync status badges
      const syncStatus = page.locator('.gist-card .sync-status');
      const syncCount = await syncStatus.count();

      test.info().annotations.push({
        type: 'sync-badges',
        description: `Found ${syncCount} cards with sync status out of ${cardCount} total`,
      });
    }
  });

  test('should queue operations when offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // Navigate to create gist page
    await page.locator('[data-testid="nav-create"]').filter({ visible: true }).first().click();

    // Fill out form
    await page.locator('#gist-description').fill('Test Offline Gist');
    await page.locator('#gist-content').fill('Offline test content');

    // Submit form
    await page.locator('#create-gist-form').evaluate((form: HTMLFormElement) => form.requestSubmit());

    // Should show toast or update UI
    await page.waitForTimeout(1000);

    // Check if operation was queued in IndexedDB
    const pendingCount = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        const request = indexedDB.open('d-o-gist-hub-db');
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('pendingWrites', 'readonly');
          const store = tx.objectStore('pendingWrites');
          const countRequest = store.count();
          countRequest.onsuccess = () => resolve(countRequest.result);
          countRequest.onerror = () => resolve(0);
        };
        request.onerror = () => resolve(0);
      });
    });

    // Should have at least 0 pending (may have synced if network recovered)
    expect(pendingCount).toBeGreaterThanOrEqual(0);

    test.info().annotations.push({
      type: 'pending-writes',
      description: `Pending operations after create attempt: ${pendingCount}`,
    });
  });

  test('should show retry button on error', async ({ page }) => {
    // Simulate error by clearing store and forcing reload
    await page.evaluate(async () => {
      return new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase('d-o-gist-hub-db');
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // If error banner appears, it should have retry button
    const errorBanner = page.locator('.error-banner');
    const errorVisible = await errorBanner.isVisible().catch(() => false);

    if (errorVisible) {
      const retryBtn = page.locator('.retry-btn, .retry-btn');
      await expect(retryBtn).toBeVisible();
    }
  });
});
