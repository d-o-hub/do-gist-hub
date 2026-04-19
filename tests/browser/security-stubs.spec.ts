import { test, expect } from '@playwright/test';

test.describe('Security - Coverage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should verify strict CSP meta tag is present', async ({ page }) => {
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
  });

  test.fixme('should verify that PAT is encrypted in IndexedDB storage', async () => {});
  test.fixme('should verify that PAT is never logged in console', async () => {});
});
