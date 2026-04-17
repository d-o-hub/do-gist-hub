import { test, expect } from '@playwright/test';

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000');
  });

  test('should show bottom nav on mobile', async ({ page }) => {
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });

  test('should open mobile menu via burger button', async ({ page }) => {
    await page.locator('[data-testid="mobile-menu-btn"]').click();
    await expect(page.locator('.bottom-sheet')).toBeVisible();
    await expect(page.locator('.bottom-sheet')).toContainText('Home');
  });

  test('should navigate via mobile menu', async ({ page }) => {
    await page.locator('[data-testid="mobile-menu-btn"]').click();
    await page.locator('.mobile-menu .menu-item:has-text("Offline Status")').click();
    
    // The sheet might still be in DOM but hidden or animating
    // Just verify the target content is visible in main
    await expect(page.locator('main h2')).toContainText('Offline Status');
  });
});
