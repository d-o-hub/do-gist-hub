import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Export/Import Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Ensure DB is initialized
    await page.waitForSelector('.app-shell');
  });

  test('should export gists to JSON', async ({ page }) => {
    // Add a dummy gist first
    await page.evaluate(async () => {
      const dbRequest = indexedDB.open('d-o-gist-hub-db');
      await new Promise((resolve) => {
        dbRequest.onsuccess = (e: any) => {
          const db = e.target.result;
          const tx = db.transaction('gists', 'readwrite');
          tx.objectStore('gists').put({
            id: 'test-gist-id',
            description: 'Test Gist for Export',
            files: { 'test.txt': { filename: 'test.txt', content: 'hello' } },
            updatedAt: new Date().toISOString(),
            starred: true,
            syncStatus: 'synced'
          });
          tx.oncomplete = resolve;
        };
      });
    });

    await page.locator('[data-route="settings"]').filter({ visible: true }).first().click();

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download');
    // Open Data & Diagnostics section
    await page.locator('summary:has-text("Data & Diagnostics")').click();
    await page.click('#export-data-btn');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/gist-hub-backup-.*\.json/);

    const downloadPath = await download.path();
    const content = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));

    expect(content.version).toBe(2);
    expect(content.gists).toHaveLength(1);
    expect(content.gists[0].id).toBe('test-gist-id');
  });

  test('should import gists from JSON', async ({ page }) => {
    await page.locator('[data-route="settings"]').filter({ visible: true }).first().click();

    const backupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      gists: [
        {
          id: 'imported-gist-id',
          description: 'Imported Gist',
          files: { 'import.js': { filename: 'import.js', content: 'console.log("imported")' } },
          updatedAt: new Date().toISOString(),
          starred: false,
          syncStatus: 'synced'
        }
      ],
      metadata: { total: 1, starred: 0 }
    };

    // Create a temporary file for import
    const importFilePath = path.join(process.cwd(), 'tests/test-import.json');
    fs.writeFileSync(importFilePath, JSON.stringify(backupData));

    // Open Data & Diagnostics section
    await page.locator('summary:has-text("Data & Diagnostics")').click();
    await page.setInputFiles('#import-file-input', importFilePath);

    // Check for success toast - use first() to avoid strict mode violation if body matches too
    await expect(page.locator('.toast-success').first()).toContainText('1 NEW', { timeout: 15000 });

    // Verify gist is in DB
    const gistExists = await page.evaluate(async () => {
      const dbRequest = indexedDB.open('d-o-gist-hub-db');
      return new Promise((resolve) => {
        dbRequest.onsuccess = (e: any) => {
          const db = e.target.result;
          const tx = db.transaction('gists', 'readonly');
          const request = tx.objectStore('gists').get('imported-gist-id');
          request.onsuccess = () => resolve(!!request.result);
        };
      });
    });

    expect(gistExists).toBe(true);

    // Cleanup
    fs.unlinkSync(importFilePath);
  });

  test('should detect conflicts during import', async ({ page }) => {
    // Add a gist with pending changes
    await page.evaluate(async () => {
        const dbRequest = indexedDB.open('d-o-gist-hub-db');
        await new Promise((resolve) => {
          dbRequest.onsuccess = (e: any) => {
            const db = e.target.result;
            const tx = db.transaction('gists', 'readwrite');
            tx.objectStore('gists').put({
              id: 'conflict-gist-id',
              description: 'Local Version',
              files: { 'test.js': { filename: 'test.js', content: 'local' } },
              updatedAt: new Date().toISOString(),
              starred: false,
              syncStatus: 'pending' // Pending change causes conflict on import
            });
            tx.oncomplete = resolve;
          };
        });
      });

    await page.locator('[data-route="settings"]').filter({ visible: true }).first().click();

    const backupData = {
      version: 2,
      exportedAt: new Date(Date.now() + 10000).toISOString(), // Newer
      gists: [
        {
          id: 'conflict-gist-id',
          description: 'Imported Version (Changed)', // Make it different
          files: { 'test.js': { filename: 'test.js', content: 'imported' } },
          updatedAt: new Date(Date.now() + 10000).toISOString(),
          starred: false,
          syncStatus: 'synced'
        }
      ],
      metadata: { total: 1, starred: 0 }
    };

    const conflictFilePath = path.join(process.cwd(), 'tests/test-conflict.json');
    fs.writeFileSync(conflictFilePath, JSON.stringify(backupData));

    // Open Data & Diagnostics section
    await page.locator('summary:has-text("Data & Diagnostics")').click();
    await page.setInputFiles('#import-file-input', conflictFilePath);

    // Verify gist in DB has conflict status
    await expect.poll(async () => {
      return await page.evaluate(async () => {
        const dbRequest = indexedDB.open('d-o-gist-hub-db');
        return new Promise((resolve) => {
          dbRequest.onsuccess = (e: any) => {
            const db = e.target.result;
            const tx = db.transaction('gists', 'readonly');
            const request = tx.objectStore('gists').get('conflict-gist-id');
            request.onsuccess = () => resolve(request.result?.syncStatus);
            request.onerror = () => resolve(null);
          };
        });
      });
    }, { timeout: 15000 }).toBe('conflict');

    // Cleanup
    fs.unlinkSync(conflictFilePath);
  });
});
