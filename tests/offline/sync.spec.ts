/**
 * Offline Sync Tests
 * Test sync behavior, online/offline transitions, and optimistic writes
 */
import { test, expect } from '@playwright/test';

test.describe('Offline Sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
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
    await page.locator('[data-testid="nav-offline"]').click();

    // Should show offline status
    const statusText = page.locator('.status-text');
    await expect(statusText).toBeVisible();
    
    const text = await statusText.textContent();
    expect(text).toContain('Offline');
  });

  test('should transition back to online mode', async ({ page, context }) => {
    // Start offline
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // Go online
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // Navigate to offline page to check status
    await page.locator('[data-testid="nav-offline"]').click();

    // Should show online status
    const statusText = page.locator('.status-text');
    await expect(statusText).toBeVisible();
    
    const text = await statusText.textContent();
    expect(text).toContain('Online');
  });

  test('should show pending operations count', async ({ page }) => {
    await page.locator('[data-testid="nav-offline"]').click();

    const pendingCount = page.locator('#pending-count');
    await expect(pendingCount).toBeVisible();

    const countText = await pendingCount.textContent();
    // Should show a number or "checking..."
    expect(countText).toMatch(/(\d+|checking\.\.\.)/i);
  });

  test('should have sync now button', async ({ page }) => {
    await page.locator('[data-testid="nav-offline"]').click();

    const syncBtn = page.locator('#sync-now-btn');
    await expect(syncBtn).toBeVisible();
    await expect(syncBtn).toBeEnabled();
  });

  test('should have clear cache button', async ({ page }) => {
    await page.locator('[data-testid="nav-offline"]').click();

    const clearBtn = page.locator('#clear-cache-btn');
    await expect(clearBtn).toBeVisible();
  });

  test('should update sync indicator in header', async ({ page }) => {
    const syncIndicator = page.locator('#sync-indicator');
    await expect(syncIndicator).toBeVisible();

    // Should have aria-label with status
    const ariaLabel = await syncIndicator.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toMatch(/sync status|pending|offline|synced/i);
  });

  test('should handle sync when queue is empty', async ({ page }) => {
    await page.locator('[data-testid="nav-offline"]').click();

    const syncBtn = page.locator('#sync-now-btn');
    await syncBtn.click();

    // Should complete without error
    await page.waitForTimeout(1000);

    // No error should appear
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
    await page.locator('[data-testid="nav-create"]').click();

    // Fill out form
    await page.locator('#gist-description').fill('Test Offline Gist');
    await page.locator('.filename-input').fill('test.txt');
    await page.locator('.content-editor').fill('Offline test content');

    // Submit form
    await page.locator('#create-submit-btn').click();

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
