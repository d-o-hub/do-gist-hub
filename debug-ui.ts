import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Authenticate
  await page.evaluate(async () => {
    const { setMetadata } = await import('./src/services/db.ts');
    await setMetadata('github-pat-enc', { data: 'dummy', iv: 'dummy' });
    await setMetadata('github-username', 'testuser');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  console.log('Navigating to Create Gist...');
  await page.locator('[data-testid="nav-create"]').first().click();

  // Wait for content
  try {
    await page.waitForSelector('.detail-title', { timeout: 5000 });
    const title = await page.textContent('.detail-title');
    console.log('Title found:', title);

    await page.screenshot({ path: 'create-gist-debug.png' });

    const descVisible = await page.isVisible('#gist-description');
    const contentVisible = await page.isVisible('#gist-content');
    console.log('Description visible:', descVisible);
    console.log('Content visible:', contentVisible);

  } catch (e) {
    console.error('Failed to find create gist form elements');
    await page.screenshot({ path: 'create-gist-error.png' });
  }

  await browser.close();
})();
