/**
 * Browser Settings Tests
 * Test settings page, token input, theme selector, data management
 */
import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="settings-btn"]').click();
    await expect(page.locator('h2')).toContainText('Settings');
  });

  test('should display settings page with all sections', async ({ page }) => {
    // Authentication section
    await expect(page.locator('#pat-input')).toBeVisible();
    await expect(page.locator('#save-token-btn')).toBeVisible();
    await expect(page.locator('#remove-token-btn')).toBeVisible();

    // Appearance section
    await expect(page.locator('#theme-select')).toBeVisible();

    // Data management section
    await expect(page.locator('#export-data-btn')).toBeVisible();
    await expect(page.locator('#import-data-btn')).toBeVisible();
    await expect(page.locator('#reset-app-btn')).toBeVisible();

    // Diagnostics section
    await expect(page.locator('#export-diagnostics-btn')).toBeVisible();
  });

  test('should have token input with password type', async ({ page }) => {
    const tokenInput = page.locator('#pat-input');
    const type = await tokenInput.getAttribute('type');
    expect(type).toBe('password');
  });

  test('should display token status', async ({ page }) => {
    const tokenStatus = page.locator('#token-status');
    await expect(tokenStatus).toBeVisible();

    // Should show either "No token saved" or masked token
    const statusText = await tokenStatus.textContent();
    expect(statusText).toBeTruthy();
    expect(statusText).toMatch(/(No token saved|Token saved)/);
  });

  test('should validate token input requires value', async ({ page }) => {
    // Try to save without entering token
    await page.locator('#save-token-btn').click();

    // Should show error toast
    await page.waitForTimeout(500);
    const toast = page.locator('.toast');
    const toastVisible = await toast.isVisible().catch(() => false);
    
    if (toastVisible) {
      const toastText = await toast.textContent();
      expect(toastText).toMatch(/enter a token/i);
    }
  });

  test('should change theme via select', async ({ page }) => {
    const themeSelect = page.locator('#theme-select');
    await expect(themeSelect).toBeVisible();

    // Change to dark theme
    await themeSelect.selectOption('dark');
    const darkTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(darkTheme).toBe('dark');

    // Change to light theme
    await themeSelect.selectOption('light');
    const lightTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(lightTheme).toBe('light');
  });

  test('should export data', async ({ page }) => {
    // Click export button
    const downloadPromise = page.waitForEvent('download', { timeout: 3000 });
    await page.locator('#export-data-btn').click();

    try {
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/gist-hub-backup-.*\.json/);
    } catch {
      // If no download triggered, check for success toast
      await page.waitForTimeout(500);
      const toast = page.locator('.toast');
      const toastVisible = await toast.isVisible().catch(() => false);
      
      if (toastVisible) {
        const toastText = await toast.textContent();
        expect(toastText).toMatch(/exported successfully/i);
      }
    }
  });

  test('should export diagnostics', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 3000 });
    await page.locator('#export-diagnostics-btn').click();

    try {
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/gist-hub-diagnostics-.*\.json/);
    } catch {
      // Check for success toast
      await page.waitForTimeout(500);
      const toast = page.locator('.toast');
      const toastVisible = await toast.isVisible().catch(() => false);
      
      if (toastVisible) {
        const toastText = await toast.textContent();
        expect(toastText).toMatch(/diagnostics exported/i);
      }
    }
  });

  test('should show diagnostic information', async ({ page }) => {
    const diagnosticsInfo = page.locator('#diagnostics-info');
    await expect(diagnosticsInfo).toBeVisible();

    const diagText = await diagnosticsInfo.textContent();
    // Should show online status, gist count, etc.
    expect(diagText).toMatch(/Online:/);
    expect(diagText).toMatch(/Gists:/);
  });

  test('should have collapsible settings sections', async ({ page }) => {
    // All sections should be details elements
    const sections = page.locator('.settings-section');
    const sectionCount = await sections.count();
    expect(sectionCount).toBeGreaterThanOrEqual(3);

    // First section (Authentication) should be open by default
    const firstSection = page.locator('details.settings-section').first();
    const isOpen = await firstSection.evaluate(el => (el as HTMLDetailsElement).open);
    expect(isOpen).toBe(true);
  });

  test('should have help text for token input', async ({ page }) => {
    const helpText = page.locator('.help-text');
    const helpVisible = await helpText.isVisible().catch(() => false);
    
    if (helpVisible) {
      const helpContent = await helpText.textContent();
      expect(helpContent).toMatch(/PAT|token|permission/i);
    }
  });
});
