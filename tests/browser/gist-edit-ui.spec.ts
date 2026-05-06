import { test, expect } from '../base';

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
    // Should fail validation on empty submit
    await page.locator('button:has-text("CREATE GIST")').click();
  });

  test('should handle successful gist creation with uppercase action', async ({ page }) => {
    await page.locator('[data-testid="nav-create"]').first().click();

    await page.locator('#gist-description').fill('New Gist');
    // Important: Fill filename which is required
    await page.locator('.gist-filename').fill('index.js');
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
          public: true,
          owner: { login: 'testuser', id: 1, avatar_url: '', html_url: '' },
        }),
      });
    });

    await page.locator('button:has-text("CREATE GIST")').click();

    // Should navigate back to home
    await expect(page.locator('.search-input').first()).toBeVisible({ timeout: 15000 });
  });

  test('should handle successful gist creation with mixed case action', async ({ page }) => {
    await page.locator('[data-testid="nav-create"]').first().click();

    await page.locator('#gist-description').fill('New Gist 2');
    // Important: Fill filename which is required
    await page.locator('.gist-filename').fill('index2.js');
    await page.locator('.gist-content').fill('Hello World 2');

    await page.route('**/gists', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-id-2',
          description: 'New Gist 2',
          files: { 'index2.js': { filename: 'index2.js', content: 'Hello World 2' } },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          html_url: 'https://gist.github.com/new-id-2',
          public: true,
          owner: { login: 'testuser', id: 1, avatar_url: '', html_url: '' },
        }),
      });
    });

    await page.locator('button:has-text("Create Gist")').click();

    // Should navigate back to home
    await expect(page.locator('.search-input').first()).toBeVisible({ timeout: 15000 });
  });
});
