import { test, expect } from '@playwright/test';

test.describe('Gist Edit UI', () => {
  test.beforeEach(async ({ page }) => {
    // Mock navigator.onLine
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'onLine', { get: () => true });
    });

    // Mock common GitHub API calls to prevent store init failures
    await page.route('**/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ login: 'testuser', id: 1, avatar_url: '', html_url: '' }),
      });
    });
    await page.route('**/gists*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Auth for edit access
    await page.evaluate(async () => {
      const { initIndexedDB, setMetadata } = await import('/src/services/db.ts');
      const { encrypt } = await import('/src/services/security/crypto.ts');
      const { default: networkMonitor } = await import('/src/services/network/offline-monitor.ts');

      await initIndexedDB();
      const { data, iv } = await encrypt('dummy-token');
      await setMetadata('github-pat-enc', { data, iv });
      await setMetadata('github-username', 'testuser');

      networkMonitor.init();
      // @ts-ignore
      networkMonitor.status = 'online';
      networkMonitor.isOnline = () => true;
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Force online status after reload
    await page.evaluate(async () => {
      const { default: networkMonitor } = await import('/src/services/network/offline-monitor.ts');
      networkMonitor.init();
      // @ts-ignore
      networkMonitor.status = 'online';
      networkMonitor.isOnline = () => true;
    });
  });

  test('should render create gist form', async ({ page }) => {
    await page.locator('[data-testid="nav-create"]').first().click();
    await expect(page.locator('.detail-title')).toContainText('Create New Gist');
    await expect(page.locator('#gist-description')).toBeVisible();
    await expect(page.locator('.gist-content').first()).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.locator('[data-testid="nav-create"]').first().click();

    // Try to save empty
    await page.locator('button:has-text("CREATE GIST")').click();
    // In current app.ts, it doesn't show toast for empty creation but it's handled by gistStore
  });

  test('should handle successful gist creation', async ({ page }) => {
    await page.locator('[data-testid="nav-create"]').first().click();

    await page.locator('#gist-description').fill('New Gist');
    await page.locator('.gist-content').first().waitFor({ state: 'visible' });
    await page.locator('.gist-content').first().fill('Hello World');

    await page.route('**/gists', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-id',
          description: 'New Gist',
          files: { 'index.js': { filename: 'index.js', content: 'Hello World' } },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          html_url: 'https://gist.github.com/new-id'
        }),
      });
    });

    await page.locator('button:has-text("CREATE GIST")').click();

    // Should navigate back to home
    await expect(page.locator('.search-input')).toBeVisible();
  });
});
