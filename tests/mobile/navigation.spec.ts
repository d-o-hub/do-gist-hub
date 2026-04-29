import { test, expect } from '@playwright/test';

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000');
    await page.waitForSelector('.app-shell');
  });

  test('should show bottom nav on mobile', async ({ page }) => {
    await expect(page.locator('.bottom-nav').first()).toBeVisible();
  });

  test('should open mobile menu via burger button', async ({ page }) => {
    await page.locator('[data-testid="mobile-menu-btn"]').click();
    await expect(page.locator('.bottom-sheet')).toBeVisible();
    await expect(page.locator('.bottom-sheet')).toContainText('Home');
  });

  test('should navigate via mobile menu', async ({ page }) => {
    await page.locator('[data-testid="mobile-menu-btn"]').click();
    // Click the exact data-route button to trigger navigation
    await page.locator('.mobile-menu [data-route="offline"]').click();

    // Verify the offline route rendered in main content area
    await expect(page.locator('main .route-offline')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('main .detail-title')).toContainText('Offline Status');
  });
});
