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

      // We don't want to actually make a network request, so we can check if it tries to use the token
      // However, we can mock fetch to see the headers.
      let capturedHeaders: Record<string, string> | null = null;
      const originalFetch = window.fetch;
      window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.headers) {
          capturedHeaders = {};
          if (init.headers instanceof Headers) {
            init.headers.forEach((value, key) => {
              capturedHeaders![key] = value;
            });
          } else if (Array.isArray(init.headers)) {
            init.headers.forEach(([key, value]) => {
              capturedHeaders![key] = value;
            });
          } else {
            Object.assign(capturedHeaders, init.headers);
          }
        }
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof window.fetch;

      try {
        await listGists();
      } catch (e) {
        // Ignore errors as we just want the headers
      } finally {
        window.fetch = originalFetch;
      }

      return {
        hasAuthHeader: !!capturedHeaders && (capturedHeaders['Authorization'] === `token ${testToken}` || capturedHeaders['authorization'] === `token ${testToken}`),
        tokenUsed: capturedHeaders?.['Authorization'] || capturedHeaders?.['authorization']
      };
    });

    expect(result.hasAuthHeader).toBe(true);
  });
});
