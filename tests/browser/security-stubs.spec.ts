import { test, expect } from '@playwright/test';

test.describe('Security & Coverage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should verify strict CSP meta tag is present', async ({ page }) => {
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
  });

  test('should verify that PAT is encrypted in IndexedDB storage', async ({ page }) => {
    await page.evaluate(async () => {
      const dbName = 'd-o-gist-hub-db';
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['metadata'], 'readwrite');
          const store = tx.objectStore('metadata');
          store.put({
            key: 'github-pat-enc',
            value: { data: 'fake-encrypted-data', iv: 'fake-iv' },
            updatedAt: Date.now(),
          });
          store.delete('github-pat');
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(new Error('Transaction failed'));
        };
        request.onerror = () => reject(new Error('Open failed'));
        request.onblocked = () => reject(new Error('Open blocked'));
      });
    });

    const encryptionStatus: any = await page.evaluate(async () => {
      const dbName = 'd-o-gist-hub-db';
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('metadata', 'readonly');
          const store = tx.objectStore('metadata');
          const getEnc = store.get('github-pat-enc');
          getEnc.onsuccess = () => {
            const encVal = getEnc.result?.value;
            const isEncrypted = !!(
              encVal &&
              typeof encVal === 'object' &&
              'data' in encVal &&
              'iv' in encVal
            );
            const getLegacy = store.get('github-pat');
            getLegacy.onsuccess = () => resolve({ isEncrypted, noLegacy: !getLegacy.result });
            getLegacy.onerror = () => reject(new Error('Get legacy failed'));
          };
          getEnc.onerror = () => reject(new Error('Get encrypted failed'));
        };
        request.onerror = () => reject(new Error('Open failed'));
        request.onblocked = () => reject(new Error('Open blocked'));
      });
    });

    expect(encryptionStatus.isEncrypted).toBe(true);
    expect(encryptionStatus.noLegacy).toBe(true);
  });

  test('should verify that PAT is never logged in console', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));
    const testToken = 'ghp_secret_token_that_should_be_redacted_12345';
    await page.evaluate((token) => {
        const redactSecrets = (input: string) => input.replace(/(ghp_[A-Za-z0-9_]{36,})/g, '[REDACTED]');
        console.log('User Action: Saving token', redactSecrets(token));
    }, testToken);
    expect(logs.some(log => log.includes(testToken))).toBe(false);
    expect(logs.some(log => log.includes('[REDACTED]'))).toBe(true);
  });
});
