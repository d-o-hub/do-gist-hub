import { test, expect } from '@playwright/test';

test.describe('GitHub Client Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should use encrypted token from auth service', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { setMetadata } = await import('./src/services/db');
      const { encrypt } = await import('./src/services/security/crypto');
      const { listGists } = await import('./src/services/github/client');

      const testToken = 'ghp_test_token_1234567890';
      const encrypted = await encrypt(testToken);
      await setMetadata('github-pat-enc', encrypted);
      await setMetadata('github-pat', null);

      let capturedHeaders: Record<string, string> | null = null;
      const originalFetch = window.fetch;
      window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.headers) {
          capturedHeaders = {};
          if (init.headers instanceof Headers) {
            init.headers.forEach((v, k) => {
              capturedHeaders![k] = v;
            });
          } else if (Array.isArray(init.headers)) {
            init.headers.forEach(([k, v]) => {
              capturedHeaders![k] = v;
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
      } finally {
        window.fetch = originalFetch;
      }

      return {
        authHeader: capturedHeaders?.['Authorization'] || capturedHeaders?.['authorization'],
      };
    });

    expect(result.authHeader).toBe('token ghp_test_token_1234567890');
  });
});
