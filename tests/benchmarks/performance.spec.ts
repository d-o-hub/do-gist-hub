import { test, expect } from '@playwright/test';
test.describe('Performance Benchmarks', () => {
  test('Page Load Performance', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForSelector('#app');
    const loadTime = Date.now() - startTime;
    console.log(`Cold Start: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(2000);
  });
});
