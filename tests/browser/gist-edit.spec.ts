import { test, expect } from '@playwright/test';

test.describe('Gist Edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should display create gist form', async ({ page }) => {
    await page.locator('[data-testid="create-btn"]').first().click();
    await expect(page.locator('h2')).toContainText('Create New Gist');
    await expect(page.locator('#gist-description')).toBeVisible();
    await expect(page.locator('#gist-content')).toBeVisible();
  });

  test('should create a new gist', async ({ page }) => {
    await page.route('**/gists', async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'new-gist-id',
                    description: 'Test Gist Creation',
                    files: { 'index.js': { filename: 'index.js', content: 'console.log("hello")' } },
                    html_url: 'https://gist.github.com/new-gist-id',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    public: true,
                    owner: { login: 'testuser' }
                })
            });
        } else {
            await route.continue();
        }
    });

    await page.locator('[data-testid="create-btn"]').first().click();
    await page.locator('#gist-description').fill('Test Gist Creation');
    await page.locator('#gist-content').fill('console.log("hello")');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('.search-input')).toBeVisible();
  });
});
