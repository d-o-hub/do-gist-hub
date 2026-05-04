import { test, expect } from '@playwright/test';

/**
 * Capacitor Android Smoke Test
 *
 * Lightweight smoke test for the Capacitor-packaged web app.
 * Validates that the app shell renders, the title is present,
 * and no JavaScript errors occur on initial load.
 *
 * To run:
 *   npx playwright test tests/android/capacitor-smoke.spec.ts --project=chromium
 */

test.describe('Capacitor Android Smoke', () => {
  test('should load without JS errors and render app shell', async ({ page }) => {
    const jsErrors: Error[] = [];

    page.on('pageerror', (error) => {
      jsErrors.push(error);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify app shell renders
    const appShell = page.locator('.app-shell').first();
    await expect(appShell).toBeVisible();

    // Verify title is present
    await expect(page).toHaveTitle(/d\.o\. Gist Hub/);

    // Verify no JavaScript errors occurred on load
    expect(
      jsErrors,
      `JS errors on load: ${jsErrors.map((e) => e.message).join('; ')}`
    ).toHaveLength(0);
  });
});
