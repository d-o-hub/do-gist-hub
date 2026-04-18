import { test } from '@playwright/test';

test.describe('Responsive Screenshots', () => {
  test('mobile - 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'screenshots/mobile-375.png', 
      fullPage: true 
    });
    console.log('✓ Mobile screenshot (375px) saved');
  });

  test('mobile large - 480px', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 854 });
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'screenshots/mobile-large-480.png', 
      fullPage: true 
    });
    console.log('✓ Mobile large screenshot (480px) saved');
  });

  test('tablet - 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'screenshots/tablet-768.png', 
      fullPage: true 
    });
    console.log('✓ Tablet screenshot (768px) saved');
  });

  test('desktop - 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'screenshots/desktop-1280.png', 
      fullPage: true 
    });
    console.log('✓ Desktop screenshot (1280px) saved');
  });

  test('desktop large - 1536px', async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 864 });
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'screenshots/desktop-large-1536.png', 
      fullPage: true 
    });
    console.log('✓ Desktop large screenshot (1536px) saved');
  });

  test('desktop xl - 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'screenshots/desktop-xl-1920.png', 
      fullPage: true 
    });
    console.log('✓ Desktop XL screenshot (1920px) saved');
  });
});
