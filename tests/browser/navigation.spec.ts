/**
 * Browser Navigation Tests
 * Test routing, navigation, and theme toggle
 */
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should display app shell with navigation', async ({ page }) => {
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    await expect(page.locator('[data-testid="app-title"]')).toBeVisible();
  });

  test('should have bottom navigation on mobile', async ({ page }) => {
    const bottomNav = page.locator('[data-testid="bottom-nav"]');
    await expect(bottomNav).toBeVisible();

    const navItems = bottomNav.locator('.nav-item');
    await expect(navItems).toHaveCount(4);

    await expect(page.locator('[data-testid="nav-home"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-starred"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-create"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-offline"]')).toBeVisible();
  });

  test('should have sidebar navigation on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const sidebar = page.locator('[data-testid="sidebar-nav"]');
    await expect(sidebar).toBeVisible();

    await expect(page.locator('[data-testid="sidebar-home"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-starred"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-create"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-offline"]')).toBeVisible();
  });

  test('should navigate to different routes via bottom nav', async ({ page }) => {
    // Navigate to starred
    await page.locator('[data-testid="nav-starred"]').click();
    await expect(page.locator('h2')).toContainText('Starred Gists');

    // Navigate to create
    await page.locator('[data-testid="nav-create"]').click();
    await expect(page.locator('h2')).toContainText('Create New Gist');

    // Navigate to offline
    await page.locator('[data-testid="nav-offline"]').click();
    await expect(page.locator('h2')).toContainText('Offline Mode');

    // Navigate back home
    await page.locator('[data-testid="nav-home"]').click();
    await expect(page.locator('[data-testid="app-title"]')).toBeVisible();
  });

  test('should navigate to settings', async ({ page }) => {
    await page.locator('[data-testid="settings-btn"]').click();
    await expect(page.locator('h2')).toContainText('Settings');

    // Settings should have authentication section
    await expect(page.locator('#pat-input')).toBeVisible();
    await expect(page.locator('#save-token-btn')).toBeVisible();
  });

  test('should toggle theme', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();

    const initialTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );

    await themeToggle.click();

    const newTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );

    expect(newTheme).not.toBe(initialTheme);
  });

  test('should update URL hash on navigation', async ({ page }) => {
    await page.locator('[data-testid="nav-starred"]').click();
    await expect(page).toHaveURL(/#starred/);

    await page.locator('[data-testid="nav-create"]').click();
    await expect(page).toHaveURL(/#create/);
  });

  test('should show active state on current route', async ({ page }) => {
    // Home should be active by default
    await expect(page.locator('[data-testid="nav-home"]')).toHaveClass(/active/);

    // Click starred
    await page.locator('[data-testid="nav-starred"]').click();
    await expect(page.locator('[data-testid="nav-starred"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-home"]')).not.toHaveClass(/active/);
  });
});
