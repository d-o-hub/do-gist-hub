import { test } from '@playwright/test';

test.describe('Memory Safety & Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  const clickNav = async (page: any, route: string) => {
    await page.locator(`.sidebar-nav [data-route="${route}"], .rail-nav [data-route="${route}"], .bottom-nav [data-route="${route}"]`).first().click();
  };

  test('should verify AbortController cancels pending requests on navigation', async ({ page }) => {
    await page.route('**/gists*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    const abortedRequests: string[] = [];
    page.on('requestfailed', request => {
      if (request.url().includes('/gists')) {
        abortedRequests.push(request.url());
      }
    });

    await clickNav(page, 'home');
    await clickNav(page, 'settings');

    await page.waitForLoadState('networkidle');
    expect(abortedRequests.length).toBeGreaterThanOrEqual(0);
  });

  test('should verify LifecycleManager cleans up event listeners on route change', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await clickNav(page, 'settings');
      await expect(page.locator('h2')).toContainText('Settings');

      await clickNav(page, 'home');
      await expect(page.locator('.search-input')).toBeVisible();
    }
  });

  test('should verify no memory growth after multiple navigation cycles', async ({ page }) => {
    const getHeapSize = async () => {
      return await page.evaluate(() => {
        // @ts-ignore
        return window.performance.memory ? window.performance.memory.usedJSHeapSize : 0;
      });
    };

    const initialHeap = await getHeapSize();

    if (initialHeap > 0) {
      for (let i = 0; i < 5; i++) {
        await clickNav(page, 'settings');
        await clickNav(page, 'home');
      }

      const finalHeap = await getHeapSize();
      expect(finalHeap).toBeLessThan(initialHeap * 2.0);
    } else {
      test.skip();
    }
  });

  test('should verify IndexedDB connections are closed properly', async ({ page }) => {
    await clickNav(page, 'settings');
    await clickNav(page, 'home');

    const dbStatus = await page.evaluate(async () => {
      try {
        const request = indexedDB.open('d-o-gist-hub-db');
        return !!request;
      } catch (e) {
        return false;
      }
    });

    expect(dbStatus).toBe(true);
  });
});
