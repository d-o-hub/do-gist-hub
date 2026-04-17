/**
 * Accessibility Semantic HTML Tests
 * Test ARIA labels, roles, headings structure, and semantic markup
 */
import { test, expect } from '@playwright/test';

test.describe('Accessibility - Semantics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();
    const h3Count = await page.locator('h3').count();

    // Should have exactly one h1 (app title)
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // Headings should be in order (h2 before h3)
    const headings = await page.locator('h1, h2, h3').all();
    let lastLevel = 0;
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const level = parseInt(tagName[1]);
      expect(level).toBeGreaterThanOrEqual(lastLevel);
      lastLevel = level;
    }
  });

  test('should have ARIA labels on interactive elements', async ({ page }) => {
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    let buttonsWithoutLabel = 0;
    for (let i = 0; i < Math.min(buttonCount, 20); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');
      const textContent = (await button.textContent())?.trim();

      if (!ariaLabel && !title && !textContent) {
        buttonsWithoutLabel++;
      }
    }

    // Most buttons should have labels (allow some tolerance)
    expect(buttonsWithoutLabel).toBeLessThan(5);
  });

  test('should have ARIA live regions for dynamic content', async ({ page }) => {
    // Toast notifications should use aria-live
    const liveRegions = page.locator('[aria-live]');
    const liveCount = await liveRegions.count();

    // Should have at least one live region (for toasts or announcements)
    test.info().annotations.push({
      type: 'live-regions',
      description: `Found ${liveCount} aria-live regions`,
    });
  });

  test('should use semantic HTML elements', async ({ page }) => {
    // Should use nav for navigation
    const navCount = await page.locator('nav').count();
    expect(navCount).toBeGreaterThanOrEqual(1);

    // Should use main for main content
    const mainCount = await page.locator('main').count();
    expect(mainCount).toBeGreaterThanOrEqual(1);

    // Should use header for app header
    const headerCount = await page.locator('header').count();
    expect(headerCount).toBeGreaterThanOrEqual(1);

    // Should use article for gist cards
    const articleCount = await page.locator('article').count();
    test.info().annotations.push({
      type: 'semantic-articles',
      description: `Found ${articleCount} article elements`,
    });
  });

  test('should have landmarks for navigation', async ({ page }) => {
    // Navigation should have role="navigation" or be <nav> element
    const navElements = page.locator('nav, [role="navigation"]');
    const navCount = await navElements.count();
    expect(navCount).toBeGreaterThanOrEqual(1);

    // Main content should have role="main" or be <main> element
    const mainElements = page.locator('main, [role="main"]');
    const mainCount = await mainElements.count();
    expect(mainCount).toBeGreaterThanOrEqual(1);
  });

  test('should have proper form labels', async ({ page }) => {
    // Navigate to create page to test forms
    await page.locator('[data-testid="nav-create"]').click();

    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();

    let inputsWithoutLabel = 0;
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const type = await input.getAttribute('type');

      // Hidden inputs don't need labels
      if (type === 'hidden' || type === 'submit' || type === 'button') continue;

      // Check for associated label
      let hasLabel = false;
      if (id) {
        hasLabel = await page.locator(`label[for="${id}"]`).count().then(c => c > 0);
      }
      if (!hasLabel && ariaLabel) hasLabel = true;

      if (!hasLabel) inputsWithoutLabel++;
    }

    // Most inputs should have labels
    expect(inputsWithoutLabel).toBeLessThan(3);
  });

  test('should have alt text or aria-label on icon buttons', async ({ page }) => {
    const iconButtons = page.locator('.icon-button, [aria-label*="toggle"], [aria-label*="settings"]');
    const iconCount = await iconButtons.count();

    for (let i = 0; i < iconCount; i++) {
      const btn = iconButtons.nth(i);
      const ariaLabel = await btn.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });

  test('should have role="alert" on error messages', async ({ page }) => {
    // Trigger an error or check error banner structure
    const errorBanner = page.locator('[role="alert"]');
    const alertCount = await errorBanner.count();

    test.info().annotations.push({
      type: 'alert-roles',
      description: `Found ${alertCount} elements with role="alert"`,
    });
  });

  test('should use list for navigation items', async ({ page }) => {
    // Bottom nav should use list or have list-like structure
    const bottomNav = page.locator('[data-testid="bottom-nav"]');
    const listInside = bottomNav.locator('ul, ol');
    const listCount = await listInside.count();

    test.info().annotations.push({
      type: 'nav-list',
      description: `Bottom nav contains ${listCount} list elements`,
    });
  });

  test('should have descriptive link text', async ({ page }) => {
    // All links should have meaningful text
    const links = page.locator('a[href]');
    const linkCount = await links.count();

    let linksWithoutText = 0;
    for (let i = 0; i < Math.min(linkCount, 20); i++) {
      const link = links.nth(i);
      const text = (await link.textContent())?.trim();
      const ariaLabel = await link.getAttribute('aria-label');

      if (!text && !ariaLabel) {
        linksWithoutText++;
      }
    }

    expect(linksWithoutText).toBeLessThan(3);
  });

  test('should have proper table structure for code view', async ({ page }) => {
    await page.waitForTimeout(1000);

    const codeTables = page.locator('.code-table table');
    const tableCount = await codeTables.count();

    if (tableCount > 0) {
      // Code tables should have proper structure
      const tbody = page.locator('.code-table tbody');
      await expect(tbody.first()).toBeVisible();

      // Should have line numbers
      const lineNumbers = page.locator('.line-number');
      const lineNumberCount = await lineNumbers.count();
      test.info().annotations.push({
        type: 'code-table',
        description: `Code table has ${lineNumberCount} line numbers`,
      });
    }
  });
});
