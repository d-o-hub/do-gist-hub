import { test, expect } from '@playwright/test';

test.describe('GitHub Client Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should use encrypted token from auth service', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Mock the database to have an encrypted token
      const { setMetadata } = await import('./src/services/db');
      const { encrypt } = await import('./src/services/security/crypto');

      const testToken = 'ghp_test_token_1234567890';
      const encrypted = await encrypt(testToken);
      await setMetadata('github-pat-enc', encrypted);

      // Clear legacy token if any
      await setMetadata('github-pat', null);

      // Now call a client function that uses getAuthToken
      const { listGists } = await import('./src/services/github/client');

      let capturedAuthHeader: string | null = null;
      const originalFetch = window.fetch;
      window.fetch = async (_input, init) => {
        if (init?.headers) {
          const h = new Headers(init.headers);
          capturedAuthHeader = h.get('Authorization');
        }
        return new Response(JSON.stringify([]), { status: 200 });
      };

      try {
        await listGists();
      } catch (e) {
        // Ignore errors as we just want the headers
      } finally {
        window.fetch = originalFetch;
      }

      return {
        hasAuthHeader: capturedAuthHeader === `token ${testToken}`,
        tokenUsed: capturedAuthHeader
      };
    });

    expect(result.hasAuthHeader).toBe(true);
  });
});
