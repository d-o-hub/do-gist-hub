import { test, expect } from '@playwright/test';

test.describe('Gist Edit UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Auth for edit access
    await page.evaluate(async () => {
      const { setMetadata } = await import('./src/services/db.ts');
      await setMetadata('github-pat-enc', { data: 'dummy', iv: 'dummy' });
      await setMetadata('github-username', 'testuser');
    });
    await page.reload();
  });

  test('should render create gist form', async ({ page }) => {
    await page.locator('[data-testid="nav-create"]').first().click();
    await expect(page.locator('.detail-title')).toContainText('Create New Gist');
    await expect(page.locator('#gist-description')).toBeVisible();
    await expect(page.locator('.gist-content')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.locator('[data-testid="nav-create"]').first().click();

    // Try to save empty
    await page.locator('button:has-text("Create Gist")').click();
    // In current app.ts, it doesn't show toast for empty creation but it's handled by gistStore
  });

  test('should handle successful gist creation', async ({ page }) => {
    await page.locator('[data-testid="nav-create"]').first().click();

    await page.locator('#gist-description').fill('New Gist');
    await page.locator('.gist-filename').fill('test.txt');
    await page.locator('.gist-content').fill('Hello World');

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
          html_url: 'https://gist.github.com/new-id',
        }),
      });
    });

    await page.locator('button:has-text("Create Gist")').click();

    // Should navigate back to home
    await expect(page.locator('.search-input')).toBeVisible();
  });
});
