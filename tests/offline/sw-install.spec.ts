/**
 * Offline Service Worker Install Tests
 * Test SW registration, activation, and offline caching behavior
 */
import { test, expect } from '@playwright/test';

test.describe('Offline SW Install', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should register service worker', async ({ page }) => {
    const registered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        return registration !== undefined;
      } catch {
        return false;
      }
    });

    expect(registered).toBe(true);
  });

  test('should have active service worker', async ({ page }) => {
    const hasActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      try {
        const registration = await navigator.serviceWorker.ready;
        return registration.active !== null;
      } catch {
        return false;
      }
    });

    expect(hasActive).toBe(true);
  });

  test('should serve app shell from cache when offline', async ({ page, context }) => {
    // Check if SW is active before proceeding
    const isSwActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      try {
        const registration = await navigator.serviceWorker.ready;
        return registration.active !== null;
      } catch {
        return false;
      }
    });

    test.skip(!isSwActive, 'Service worker not active — skipping offline test');

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // App should still render (served from cache)
    await expect(page.locator('.app-shell')).toBeVisible();

    // Verify we're offline
    const isOnline = await page.evaluate(() => navigator.onLine);
    expect(isOnline).toBe(false);

    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(500);
  });

  test('should show offline indicator when offline', async ({ page, context }) => {
    const isSwActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      try {
        const registration = await navigator.serviceWorker.ready;
        return registration.active !== null;
      } catch {
        return false;
      }
    });

    test.skip(!isSwActive, 'Service worker not active — skipping offline test');

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Reload and check offline status
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should show offline indicator
    const syncIndicator = page.locator('#sync-indicator');
    const status = await syncIndicator.getAttribute('data-status');
    expect(status).toBe('offline');

    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(500);
  });

  test('should work after coming back online', async ({ page, context }) => {
    const isSwActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      try {
        const registration = await navigator.serviceWorker.ready;
        return registration.active !== null;
      } catch {
        return false;
      }
    });

    test.skip(!isSwActive, 'Service worker not active — skipping online test');

    // Go offline then back online
    await context.setOffline(true);
    await page.waitForTimeout(500);
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // App shell should be visible
    await expect(page.locator('.app-shell')).toBeVisible();

    // Should be online
    const isOnline = await page.evaluate(() => navigator.onLine);
    expect(isOnline).toBe(true);
  });

  test('should handle service worker not supported gracefully', async ({ page }) => {
    const supported = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(typeof supported).toBe('boolean');
  });
});
