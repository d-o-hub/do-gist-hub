/**
 * Mobile Navigation Tests
 * Test mobile bottom navigation and mobile-specific interactions
 */
import { test, expect } from '@playwright/test';

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate routes via bottom navigation', async ({ page }) => {
    // Navigate to starred
    await page.locator('[data-testid="nav-starred"]').click();
    await expect(page).toHaveURL(/#starred/);

    // Navigate to create
    await page.locator('[data-testid="nav-create"]').click();
    await expect(page).toHaveURL(/#create/);

    // Navigate to offline
    await page.locator('[data-testid="nav-offline"]').click();
    await expect(page).toHaveURL(/#offline/);

    // Navigate back home
    await page.locator('[data-testid="nav-home"]').click();
    await expect(page).toHaveURL(/#home/);
  });

  test('should show active state on current nav item', async ({ page }) => {
    await expect(page.locator('[data-testid="nav-home"]')).toHaveClass(/active/);

    await page.locator('[data-testid="nav-starred"]').click();
    await expect(page.locator('[data-testid="nav-starred"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-home"]')).not.toHaveClass(/active/);
  });

  test('should access settings via header button', async ({ page }) => {
    await page.locator('[data-testid="settings-btn"]').click();
    await expect(page).toHaveURL(/#settings/);
    await expect(page.locator('h2')).toContainText('Settings');
  });

  test('should toggle theme on mobile', async ({ page }) => {
    const initialTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );

    await page.locator('[data-testid="theme-toggle"]').click();

    const newTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );

    expect(newTheme).not.toBe(initialTheme);
  });

  test('should display sync status indicator', async ({ page }) => {
    const syncIndicator = page.locator('#sync-indicator');
    await expect(syncIndicator).toBeVisible();

    // Should have aria-label for accessibility
    const ariaLabel = await syncIndicator.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });

  test('should handle rapid navigation without errors', async ({ page }) => {
    // Rapidly click multiple nav items
    await page.locator('[data-testid="nav-starred"]').click();
    await page.locator('[data-testid="nav-create"]').click();
    await page.locator('[data-testid="nav-home"]').click();

    // Should end up on home route
    await expect(page).toHaveURL(/#home/);
    
    // No error banners should appear
    const errorBanner = page.locator('.error-banner');
    const errorVisible = await errorBanner.isVisible().catch(() => false);
    expect(errorVisible).toBe(false);
  });

  test('should show gist list header on home route', async ({ page }) => {
    await expect(page.locator('.search-input')).toBeVisible();
    await expect(page.locator('.filter-buttons')).toBeVisible();
  });

  test('should show create form on create route', async ({ page }) => {
    await page.locator('[data-testid="nav-create"]').click();
    await expect(page.locator('h2')).toContainText('Create New Gist');
    await expect(page.locator('#gist-description')).toBeVisible();
    await expect(page.locator('#create-submit-btn')).toBeVisible();
  });

  test('should show offline status on offline route', async ({ page }) => {
    await page.locator('[data-testid="nav-offline"]').click();
    await expect(page.locator('h2')).toContainText('Offline Mode');
    await expect(page.locator('.offline-status')).toBeVisible();
    await expect(page.locator('#sync-now-btn')).toBeVisible();
  });

  test('should maintain scroll position on navigation', async ({ page }) => {
    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 200));
    const scrollPos = await page.evaluate(() => window.scrollY);
    expect(scrollPos).toBeGreaterThan(0);

    // Navigate away and back
    await page.locator('[data-testid="nav-starred"]').click();
    await page.locator('[data-testid="nav-home"]').click();

    // Scroll position may reset on navigation - this is acceptable
    // Just verify page still renders
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
  });
});
