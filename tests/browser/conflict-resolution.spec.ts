import { test, expect } from '@playwright/test';

test.describe('Conflict Resolution UI Walkthrough', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('.app-shell');

    // Seed IndexedDB with a conflict gist and its metadata
    await page.evaluate(async () => {
      const dbRequest = indexedDB.open('d-o-gist-hub-db', 3);
      await new Promise<void>((resolve, reject) => {
        dbRequest.onerror = () => reject(new Error('Failed to open DB'));
        dbRequest.onblocked = () => reject(new Error('DB blocked'));
        dbRequest.onsuccess = (event: Event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          const gistTx = db.transaction('gists', 'readwrite');
          gistTx.objectStore('gists').put({
            id: 'conflict-test-1',
            description: 'Conflicted Gist',
            files: {
              'test.js': { filename: 'test.js', content: 'local content', size: 14 },
            },
            htmlUrl: 'https://gist.github.com/test/conflict-test-1',
            gitPullUrl: 'https://gist.github.com/test/conflict-test-1.git',
            gitPushUrl: 'https://gist.github.com/test/conflict-test-1.git',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            starred: false,
            public: true,
            syncStatus: 'conflict',
            lastSyncedAt: new Date().toISOString(),
          });

          const metaTx = db.transaction('metadata', 'readwrite');
          metaTx.objectStore('metadata').put({
            key: 'sync-conflicts',
            value: [
              {
                gistId: 'conflict-test-1',
                localVersion: {
                  id: 'conflict-test-1',
                  description: 'Conflicted Gist',
                  files: {
                    'test.js': { filename: 'test.js', content: 'local content', size: 14 },
                  },
                  htmlUrl: 'https://gist.github.com/test/conflict-test-1',
                  gitPullUrl: 'https://gist.github.com/test/conflict-test-1.git',
                  gitPushUrl: 'https://gist.github.com/test/conflict-test-1.git',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  starred: false,
                  public: true,
                  syncStatus: 'conflict',
                },
                remoteVersion: {
                  id: 'conflict-test-1',
                  description: 'Conflicted Gist (Remote)',
                  files: {
                    'test.js': { filename: 'test.js', content: 'remote content', size: 15 },
                  },
                  html_url: 'https://gist.github.com/test/conflict-test-1',
                  git_pull_url: 'https://gist.github.com/test/conflict-test-1.git',
                  git_push_url: 'https://gist.github.com/test/conflict-test-1.git',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  public: true,
                  comments: 0,
                  comments_url: '',
                  user: null,
                },
                detectedAt: new Date().toISOString(),
                conflictingFields: ['description', 'content'],
              },
            ],
            updatedAt: Date.now(),
          });

          let completed = 0;
          const checkDone = () => {
            completed++;
            if (completed === 2) resolve();
          };
          gistTx.onerror = () => reject(new Error('Gist transaction failed'));
          gistTx.oncomplete = checkDone;
          metaTx.onerror = () => reject(new Error('Metadata transaction failed'));
          metaTx.oncomplete = checkDone;
        };
      });
    });

    // Reload to pick up seeded data
    await page.reload();
    await page.waitForSelector('.app-shell');
  });

  test('should navigate to conflicts, resolve with KEEP LOCAL VERSION, and return to list', async ({ page }) => {
    // Verify conflict count on the offline status page
    await page.locator('[data-testid="nav-offline"]').first().click();
    await page.waitForSelector('[data-testid="conflict-count"]');
    await expect(page.locator('[data-testid="conflict-count"]')).toHaveText('1');

    // Click the conflict stat card to navigate to conflicts view
    await page.locator('[data-testid="conflicts-stat-card"]').click();

    // Wait for conflict list to render
    await expect(page.locator('[data-testid="conflict-list"]')).toBeVisible({ timeout: 10000 });

    // Verify the conflict item is listed
    await expect(page.locator('[data-testid="conflict-list"]')).toContainText('Conflicted Gist');
    await expect(page.locator('[data-testid="conflict-list"] .conflict-item')).toHaveCount(1);

    // Click the resolve button
    await page.locator('[data-testid="resolve-btn"]').first().click();

    // Wait for the detail comparison view
    await expect(page.locator('.conflict-detail')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="resolve-local"]')).toBeVisible();
    await expect(page.locator('[data-testid="resolve-remote"]')).toBeVisible();

    // Click "KEEP LOCAL VERSION"
    await page.locator('[data-testid="resolve-local"]').click();

    // Verify success toast appears
    await expect(
      page.locator('.toast-success').filter({ visible: true }).first()
    ).toContainText('CONFLICT RESOLVED', { timeout: 15000 });

    // After resolving the only conflict, the empty state is shown (no conflict-list)
    // Verify the view returns to the conflicts route showing empty state
    await expect(page.locator('.empty-state-container')).toBeVisible({ timeout: 10000 });
  });

  test('should resolve conflict with USE REMOTE VERSION and return to list', async ({ page }) => {
    // Navigate to offline page and verify conflict count
    await page.locator('[data-testid="nav-offline"]').first().click();
    await page.waitForSelector('[data-testid="conflict-count"]');
    await expect(page.locator('[data-testid="conflict-count"]')).toHaveText('1');

    // Navigate to conflicts view via stat card
    await page.locator('[data-testid="conflicts-stat-card"]').click();

    // Wait for conflict list
    await expect(page.locator('[data-testid="conflict-list"]')).toBeVisible({ timeout: 10000 });

    // Click resolve
    await page.locator('[data-testid="resolve-btn"]').first().click();

    // Wait for detail view
    await expect(page.locator('.conflict-detail')).toBeVisible({ timeout: 10000 });

    // Choose "USE REMOTE VERSION"
    await page.locator('[data-testid="resolve-remote"]').click();

    // Verify success toast
    await expect(
      page.locator('.toast-success').filter({ visible: true }).first()
    ).toContainText('CONFLICT RESOLVED', { timeout: 15000 });

    // After resolving the only conflict, the empty state is shown
    await expect(page.locator('.empty-state-container')).toBeVisible({ timeout: 10000 });
  });

  test('should show conflict count badge and navigate via sidebar', async ({ page }) => {
    // Verify conflict count on offline page
    await page.locator('[data-testid="nav-offline"]').first().click();
    await expect(page.locator('[data-testid="conflict-count"]')).toHaveText('1');

    // Navigate via sidebar nav-conflicts directly
    await page.locator('[data-testid="nav-conflicts"]').first().click();

    // Verify conflict list loads
    await expect(page.locator('[data-testid="conflict-list"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="conflict-list"]')).toContainText('Conflicted Gist');
  });
});
