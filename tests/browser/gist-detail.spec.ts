import { test, expect } from '@playwright/test';

test.describe('Gist Detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/user', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ login: 'testuser', id: 12345 })
        });
    });

    await page.route('**/users/testuser/gists*', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
                id: 'test-gist-id',
                description: 'Detail Test Gist',
                files: { 'test.ts': { filename: 'test.ts', type: 'text/plain' } },
                html_url: 'https://gist.github.com/test-gist-id',
                git_pull_url: 'https://gist.github.com/test-gist-id.git',
                git_push_url: 'https://gist.github.com/test-gist-id.git',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                starred: false,
                public: true,
                owner: { login: 'testuser', id: 12345, avatar_url: '', html_url: '' }
            }])
        });
    });

    await page.route('**/gists/starred*', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
        });
    });

    await page.goto('http://localhost:3000');

    await page.evaluate(async () => {
        const dbName = 'd-o-gist-hub-db';
        const request = indexedDB.open(dbName);
        return new Promise((resolve) => {
            request.onsuccess = async () => {
                const db = request.result;
                const tx = db.transaction(['metadata'], 'readwrite');
                const store = tx.objectStore('metadata');
                await store.put({ key: 'github-pat-enc', value: { data: 'Ym9ndXM=', iv: 'Ym9ndXM=' }, updatedAt: Date.now() });
                await store.put({ key: 'github-username', value: 'testuser', updatedAt: Date.now() });
                tx.oncomplete = () => resolve(true);
            };
        });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should display gist details when a card is clicked', async ({ page }) => {
    const card = page.locator('.gist-card').first();
    await expect(card).toBeVisible();
    await card.click();

    await expect(page.locator('#gist-detail-container')).toBeVisible();
    await expect(page.locator('.detail-title')).toBeVisible();
  });
});
