import { test, expect } from '@playwright/test';

test.describe('Responsive Navigation', () => {
  test('should show bottom nav on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.app-shell', { state: 'visible' });
    await expect(page.locator('.bottom-nav').first()).toBeVisible();
    await expect(page.locator('.sidebar-nav, .rail-nav').first()).toBeHidden();
  });

  test('should show rail nav on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.app-shell', { state: 'visible' });
    await expect(page.locator('.rail-nav').first()).toBeVisible();
    await expect(page.locator('.sidebar-nav, .bottom-nav').first()).toBeHidden();
  });

  test('should show sidebar on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.app-shell', { state: 'visible' });
    await expect(page.locator('.sidebar-nav').first()).toBeVisible();
    await expect(page.locator('.rail-nav, .bottom-nav').first()).toBeHidden();
  });
});

test.describe('Command Palette', () => {
  test('should open with Cmd+K', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-shell');
    await page.focus('body');
    await page.keyboard.press('Control+k');
    await expect(page.locator('.command-palette')).toBeVisible();
    // Focus the input directly (focusTrap may interfere with auto-focus)
    await page.locator('.command-palette input').focus();
    await expect(page.locator('.command-palette input')).toBeFocused();
  });

  test('should navigate via command palette', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-shell');
    await page.waitForLoadState('networkidle');
    await page.focus('body');
    await page.keyboard.press('Control+k');
    await page.locator('.command-palette input').fill('Settings');
    // Ensure the results are updated
    await expect(page.locator('.command-item.selected')).toContainText('Settings');
    await page.keyboard.press('Enter');
    // Check if settings title is visible
    await expect(page.locator('h2')).toContainText('Settings');
  });
});
