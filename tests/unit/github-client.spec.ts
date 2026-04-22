import { test, expect } from '@playwright/test';

test.describe('GitHub Client Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should use encrypted token from auth service', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Mock the database to have an encrypted token
      const { setMetadata } = await import('@/services/db');
      const { encrypt } = await import('@/services/security/crypto');

      const testToken = 'ghp_test_token_1234567890';
      const encrypted = await encrypt(testToken);
      await setMetadata('github-pat-enc', encrypted);

      // Clear legacy token if any
      await setMetadata('github-pat', null);

      // Now call a client function that uses getAuthToken
      const { listGists } = await import('@/services/github/client');

      // We don't want to actually make a network request, so we can check if it tries to use the token
      // or we can just test the internal getAuthToken if it was exported, but it's not.
      // However, we can mock fetch to see the headers.
      let capturedHeaders: HeadersInit | null = null;
      const originalFetch = window.fetch;
      window.fetch = async (input, init) => {
        capturedHeaders = init?.headers || null;
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
        hasAuthHeader: !!capturedHeaders && (capturedHeaders as any)['Authorization'] === `token ${testToken}`,
        tokenUsed: (capturedHeaders as any)?.['Authorization']
      };
    });

    expect(result.hasAuthHeader).toBe(true);
  });
});
