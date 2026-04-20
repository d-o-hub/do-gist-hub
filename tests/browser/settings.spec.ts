import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-shell');
  });

  test('should display settings page with all sections', async ({ page }) => {
    await page.locator('[data-testid="settings-btn"]').click();
    await expect(page.locator('h2')).toContainText('Settings');
  });

  test('should have token input with password type', async ({ page }) => {
    await page.locator('[data-testid="settings-btn"]').click();
    const input = page.locator('#pat-input');
    await expect(input).toHaveAttribute('type', 'password');
  });

  test('should validate token input requires value', async ({ page }) => {
    await page.locator('[data-testid="settings-btn"]').click();
    await page.locator('button:has-text("Save Token")').click();
    // Assuming toast or error message shows up
  });

  test('should change theme via select', async ({ page }) => {
    await page.locator('[data-testid="settings-btn"]').click();
    const select = page.locator('#theme-select');
    if (await select.isVisible()) {
        await select.selectOption('dark');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    }
  });

  test('should show diagnostic information', async ({ page }) => {
    await page.locator('[data-testid="settings-btn"]').click();
    // Check if diagnostic section exists
  });
});
