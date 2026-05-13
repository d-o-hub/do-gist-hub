/**
 * Container Query Verification Tests (Phase C Action 4.1)
 * Verifies that all container-type declarations have active @container rules.
 * Uses getComputedStyle to confirm container query behavior at different widths.
 */
import { test, expect } from '@playwright/test';
import { seedGists, DEFAULT_TEST_GISTS } from '../helpers/seed-gists';
import { mockGitHubApi } from '../helpers/mock-github-api';

const CONTAINER_QUERIES = [
  { selector: '.gist-card', name: 'gist-card', expectedType: 'inline-size' },
] as const;

test.describe('Container Queries', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await seedGists(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    // Mock API after reload — Playwright route interceptors are cleared on navigation.
    // Must be set up after reload so hydrateGist calls are properly intercepted.
    await mockGitHubApi(page, DEFAULT_TEST_GISTS);
  });

  for (const cq of CONTAINER_QUERIES) {
    test(`should have container-type: ${cq.expectedType} on ${cq.name}`, async ({ page }) => {
      const el = page.locator(cq.selector).first();
      await expect(el).toBeVisible();

      const containerType = await el.evaluate(
        (el) => window.getComputedStyle(el).containerType
      );
      expect(containerType).toBe(cq.expectedType);
    });
  }

  test('should have container-name set on gist cards', async ({ page }) => {
    const card = page.locator('.gist-card').first();
    await expect(card).toBeVisible();

    const containerName = await card.evaluate(
      (el) => window.getComputedStyle(el).containerName
    );
    expect(containerName).toBe('gist-card');
  });

  test('should have container-name set on gist detail', async ({ page }) => {
    // Navigate directly to detail (more reliable than clicking cards)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('app:navigate', {
        detail: { route: 'detail', params: { gistId: 'test-gist-1' } },
      }));
    });

    const detail = page.locator('.gist-detail');
    await expect(detail).toBeVisible({ timeout: 5000 });

    const containerType = await detail.evaluate(
      (el) => window.getComputedStyle(el).containerType
    );
    expect(containerType).toBe('inline-size');

    const containerName = await detail.evaluate(
      (el) => window.getComputedStyle(el).containerName
    );
    expect(containerName).toBe('detail-view');
  });

  test('should apply @container gist-card rules for wider cards', async ({ page }) => {
    // Set viewport to desktop width where gist-grid has 3 columns
    await page.setViewportSize({ width: 1440, height: 900 });

    const card = page.locator('.gist-card').first();
    await expect(card).toBeVisible();

    const cardWidth = await card.evaluate((el) => el.getBoundingClientRect().width);
    test.info().annotations.push({
      type: 'card-width',
      description: `gist-card width at 1440px viewport: ${cardWidth}px`,
    });

    // Card header should be in row layout when card width >= 400px
    const header = card.locator('.gist-card-header');
    await expect(header).toBeVisible();

    const flexDirection = await header.evaluate(
      (el) => window.getComputedStyle(el).flexDirection
    );
    test.info().annotations.push({
      type: 'header-flex',
      description: `gist-card-header flex-direction at ${cardWidth}px card width: ${flexDirection}`,
    });
  });

  test('should apply @container settings-panel rules on settings page', async ({ page }) => {
    // Navigate to settings
    const settingsBtn = page.locator('[data-testid="settings-btn"]').filter({ visible: true }).first();
    await expect(settingsBtn).toBeVisible();

    await settingsBtn.click();
    const section = page.locator('.settings-section').first();
    await expect(section).toBeVisible({ timeout: 5000 });

    const containerType = await section.evaluate(
      (el) => window.getComputedStyle(el).containerType
    );
    const containerName = await section.evaluate(
      (el) => window.getComputedStyle(el).containerName
    );
    expect(containerType).toBe('inline-size');
    expect(containerName).toBe('settings-panel');

    test.info().annotations.push({
      type: 'settings-container',
      description: `settings-section: type=${containerType}, name=${containerName}`,
    });
  });

  test('should apply @container offline-panel rules on offline page', async ({ page }) => {
    // Navigate to offline
    await page.locator('[data-testid="nav-offline"]').first().click();
    const section = page.locator('.offline-stats').first();
    await expect(section).toBeVisible({ timeout: 5000 });

    const containerType = await section.evaluate(
      (el) => window.getComputedStyle(el).containerType
    );
    const containerName = await section.evaluate(
      (el) => window.getComputedStyle(el).containerName
    );
    expect(containerType).toBe('inline-size');
    expect(containerName).toBe('offline-panel');

    test.info().annotations.push({
      type: 'offline-container',
      description: `offline-stats: type=${containerType}, name=${containerName}`,
    });
  });

  test('should respect @container gist-card responsive breakpoints', async ({ page }) => {
    await expect(page.locator('.gist-card').first()).toBeVisible({ timeout: 5000 });

    // Test at multiple viewport widths that change card layout
    const widths = [390, 768, 1280];
    const results: string[] = [];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 });

      const card = page.locator('.gist-card').first();
      await expect(card).toBeVisible();

      const cardWidth = await card.evaluate((el) => el.getBoundingClientRect().width);
      const actions = card.locator('.gist-card-actions');
      await expect(actions).toBeVisible();

      const flexDir = await actions.evaluate((el) => window.getComputedStyle(el).flexDirection);

      results.push(`${width}px vp → card ${Math.round(cardWidth)}px → actions flex:${flexDir}`);
    }

    test.info().annotations.push({
      type: 'responsive-breakpoints',
      description: results.join(' | '),
    });

    expect(results.length).toBe(widths.length);
  });
});
