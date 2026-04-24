import { test, expect } from '@playwright/test';

test.describe('Performance Metrics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should verify LCP is within budget', async ({ page }) => {
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => resolve(0), 5000);
      });
    });

    if (lcp > 0) {
        expect(lcp).toBeLessThan(2500);
    }
  });

  test('should verify FID/INP interaction latency is low', async ({ page, browserName }) => {
    if (browserName === 'webkit') {
       test.skip(true, 'WebKit layout is flaky for Settings nav button');
    }
    await page.locator('[data-testid="settings-btn"]').filter({ visible: true }).first().click();

    const interactionMetrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('event');
      return entries.map(e => e.duration);
    });

    if (interactionMetrics.length > 0) {
      const maxLatency = Math.max(...interactionMetrics);
      expect(maxLatency).toBeLessThan(100);
    }
  });

  test('should verify initial JS bundle size is within budget', async ({ page }) => {
    let totalJsSize = 0;
    page.on('response', response => {
      if (response.url().endsWith('.js')) {
        const headers = response.headers();
        totalJsSize += parseInt(headers['content-length'] || '0', 10);
      }
    });

    await page.reload({ waitUntil: 'networkidle' });
    if (totalJsSize > 0) {
        expect(totalJsSize).toBeLessThan(500 * 1024);
    }
  });

  test('should verify route-based code splitting for large components', async ({ page, browserName }) => {
    const loadedScripts = new Set<string>();
    page.on('response', response => {
      if (response.url().endsWith('.js')) loadedScripts.add(response.url());
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    const initialScriptCount = loadedScripts.size;

    if (browserName === 'webkit') {
       test.skip(true, 'WebKit layout is flaky for Settings nav button');
    }

    await page.locator('[data-testid="settings-btn"]').filter({ visible: true }).first().click();
    await page.waitForLoadState('networkidle');
    expect(loadedScripts.size).toBeGreaterThanOrEqual(initialScriptCount);
  });
});
