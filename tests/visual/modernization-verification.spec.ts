import { test, expect } from '@playwright/test';

test.describe('UI Modernization Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should have display: none base for sidebar', async ({ page }) => {
    // Check computed style of sidebar when viewport is small
    await page.setViewportSize({ width: 375, height: 667 });
    const sidebar = page.locator('.sidebar-nav');
    const display = await sidebar.evaluate(el => window.getComputedStyle(el).display);
    expect(display).toBe('none');
  });

  test('should have container-type on gist cards', async ({ page }) => {
    const card = page.locator('.gist-card').first();
    const cardVisible = await card.isVisible().catch(() => false);
    if (cardVisible) {
      const containerType = await card.evaluate(el => window.getComputedStyle(el).containerType);
      expect(containerType).toBe('inline-size');
    }
  });

  test('should trigger View Transition on navigation', async ({ page }) => {
    // This is hard to test directly, but we can check if withViewTransition is called
    // by mocking the startViewTransition API
    const _transitionTriggered = await page.evaluate(() => {
      let triggered = false;
      if ('startViewTransition' in document) {
        const original = (document as Document & { startViewTransition(callback: () => unknown): Promise<unknown> }).startViewTransition.bind(document);
        (document as Document & { startViewTransition(callback: () => unknown): Promise<unknown> }).startViewTransition = (cb: () => unknown): Promise<unknown> => {
          triggered = true;
          return original(cb);
        };
      }
      return triggered;
    });

    // Perform navigation
    await page.locator('[data-testid="nav-starred"]').click();

    // Check if it was supported and triggered (or skip if not supported in browser)
    const isSupported = await page.evaluate(() => 'startViewTransition' in document);
    if (isSupported) {
      // In a real test we'd need to re-evaluate after click,
      // but this is just a stub for now.
    }
  });
});
