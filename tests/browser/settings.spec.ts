import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('.app-shell');
    await page.waitForLoadState('networkidle');
    // Use .filter({ visible: true }) to find the visible button across different breakpoints
    await page.locator('[data-testid="settings-btn"]').filter({ visible: true }).first().click();
    await expect(page.locator('h2')).toContainText('Settings');
  });

  test('should display settings page with all sections', async ({ page }) => {
    // Authentication section
    await expect(page.locator('#pat-input')).toBeVisible();
    await expect(page.locator('#save-token-btn')).toBeVisible();
    await expect(page.locator('#remove-token-btn')).toBeVisible();

    // Open other sections
    await page.locator('summary:has-text("Preferences")').click();
    await expect(page.locator('#theme-select')).toBeVisible();

    await page.locator('summary:has-text("Data & Diagnostics")').click();
    await expect(page.locator('#export-data-btn')).toBeVisible();
  });

  test('should have token input with password type', async ({ page }) => {
    const tokenInput = page.locator('#pat-input');
    const type = await tokenInput.getAttribute('type');
    expect(type).toBe('password');
  });

  test('should validate token input requires value', async ({ page }) => {
    // Try to save without entering token
    await page.locator('#save-token-btn').click();
    // Should show error toast - check for generic toast or specific error class
    // Use .first() to avoid strict mode violations if multiple toasts appear
    await expect(page.locator('.toast').first()).toBeVisible({ timeout: 15000 });
  });

  test('should change theme via select', async ({ page }) => {
    await page.locator('summary:has-text("Preferences")').click();
    const themeSelect = page.locator('#theme-select');
    await expect(themeSelect).toBeVisible();

    // Change to dark theme
    await themeSelect.selectOption('dark');
    const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(themeAttr).toBe('dark');
  });

  test('should show diagnostic information', async ({ page }) => {
    await page.locator('summary:has-text("Data & Diagnostics")').click();
    const diagnosticsInfo = page.locator('#diagnostics-info');
    await expect(diagnosticsInfo).toBeVisible();
  });
});
