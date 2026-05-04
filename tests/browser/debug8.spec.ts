import { test, expect } from '../base';

test.describe('GistStore Integration Debug 8', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.evaluate(async () => {
      const { setMetadata, flushGistWrites } = await import('/src/services/db.ts');
      const { encrypt } = await import('/src/services/security/crypto.ts');
      const { default: networkMonitor } = await import('/src/services/network/offline-monitor.ts');

      const encrypted = await encrypt('dummy-token');
      await setMetadata('github-pat-enc', encrypted);
      await setMetadata('github-username', 'testuser');

      (networkMonitor as any).status = 'online';

      await flushGistWrites();
    });
    await page.reload();
  });

  test('should handle gist creation (online) - DEBUG 8', async ({ page }) => {
    await page.route(url => url.hostname === 'api.github.com', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      const headers = route.request().headers();
      console.log(`PLAYWRIGHT: Route hit ${method} ${url} | Auth: ${headers['authorization']}`);

      if (url.includes('/user') && method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ login: 'testuser' }),
        });
      }

      if (url.includes('/gists') && method === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-gist-id',
            description: 'New Gist',
            files: { 'test.txt': { filename: 'test.txt', content: 'hello' } },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            html_url: 'https://gist.github.com/new-gist-id',
            owner: { login: 'testuser', id: 1, avatar_url: '', html_url: '' }
          }),
        });
      }

      return route.fulfill({ status: 404 });
    });

    const success = await page.evaluate(async () => {
      try {
        const { default: gistStore } = await import('/src/stores/gist-store.ts');
        const { flushGistWrites } = await import('/src/services/db.ts');
        const { default: networkMonitor } = await import('/src/services/network/offline-monitor.ts');

        (networkMonitor as any).status = 'online';

        console.log('BROWSER: Calling createGist');
        const result = await gistStore.createGist('New Gist', true, { 'test.txt': 'hello' });
        console.log('BROWSER: createGist returned:', !!result);

        await flushGistWrites();
        return !!result;
      } catch (e: any) {
        console.error('BROWSER: Caught error:', e.message);
        return false;
      }
    });

    expect(success).toBe(true);
  });
});
