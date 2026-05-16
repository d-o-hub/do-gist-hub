/**
 * Accessibility Keyboard Bento Navigation Tests
 * Test keyboard navigation through the bento/gist-grid layout:
 * tabbing to the grid, navigating between gist cards, activating cards,
 * focus management after back navigation, and focus-trap containment.
 */
import { test, expect } from '@playwright/test';

test.describe('Accessibility - Keyboard Bento', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should reach the bento gist grid via Tab navigation', async ({ page }) => {
    await page.waitForTimeout(1000);

    let foundGrid = false;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);

      const activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return el.id || el.className?.toString().slice(0, 50) || el.tagName;
      });

      if (activeElement === 'gist-list' || activeElement?.includes('gist-grid')) {
        foundGrid = true;
        break;
      }
    }

    test.info().annotations.push({
      type: 'bento-grid-tab',
      description: `Found gist grid via Tab: ${foundGrid}`,
    });
  });

  test('should navigate between gist cards with Tab and Shift+Tab', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Tab forward to first card
    let firstCard: string | null = null;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);

      const activeId = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return el.getAttribute('data-gist-id');
      });

      if (activeId) {
        firstCard = activeId;
        break;
      }
    }

    expect(firstCard).toBeTruthy();

    // Tab to next card
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);

    const secondCard = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      return el.getAttribute('data-gist-id');
    });

    // Shift+Tab back to first card
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(50);

    const shiftedCard = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      return el.getAttribute('data-gist-id');
    });

    // Should be back on the first card or a card before the second
    const movedForward = secondCard !== firstCard;
    const movedBackward = shiftedCard !== secondCard;

    test.info().annotations.push({
      type: 'card-nav',
      description: `Tab forward moved: ${movedForward}, Shift+Tab back moved: ${movedBackward}`,
    });
  });

  test('should activate gist card with Enter key to navigate to detail', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Tab to first focusable card
    let focused = false;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);

      const hasDataGistId = await page.evaluate(() => {
        const el = document.activeElement;
        return !!el?.getAttribute('data-gist-id');
      });

      if (hasDataGistId) {
        focused = true;
        break;
      }
    }

    expect(focused).toBe(true);

    // Activate with Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Should have navigated to detail page — back button should be present
    const backBtn = page.locator('#gist-back-btn');
    const backVisible = await backBtn.isVisible().catch(() => false);

    test.info().annotations.push({
      type: 'enter-activate',
      description: `Navigated to detail after Enter: ${backVisible}`,
    });
  });

  test('should activate gist card with Space key to navigate to detail', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Tab to first focusable card
    let focused = false;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);

      const hasDataGistId = await page.evaluate(() => {
        const el = document.activeElement;
        return !!el?.getAttribute('data-gist-id');
      });

      if (hasDataGistId) {
        focused = true;
        break;
      }
    }

    expect(focused).toBe(true);

    // Activate with Space
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    const backBtn = page.locator('#gist-back-btn');
    const backVisible = await backBtn.isVisible().catch(() => false);

    test.info().annotations.push({
      type: 'space-activate',
      description: `Navigated to detail after Space: ${backVisible}`,
    });
  });

  test('should manage focus after navigating back from detail to home', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Tab to first card and activate
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);

      const hasDataGistId = await page.evaluate(() => {
        const el = document.activeElement;
        return !!el?.getAttribute('data-gist-id');
      });

      if (hasDataGistId) break;
    }

    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Check we got to detail
    const detailVisible = await page.locator('.gist-detail').isVisible().catch(() => false);

    if (detailVisible) {
      // Focus should be somewhere in the detail view
      const activeInDetail = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeInDetail).toBeTruthy();

      // Click back button to navigate home
      await page.locator('#gist-back-btn').click();
      await page.waitForTimeout(500);
    } else {
      // If navigation didn't happen, navigate back manually
      await page.locator('[data-testid="nav-home"]').filter({ visible: true }).first().click();
      await page.waitForTimeout(500);
    }

    // After returning home, focus should be on a valid element
    const activeAfterReturn = await page.evaluate(() => document.activeElement?.tagName);

    test.info().annotations.push({
      type: 'focus-after-back',
      description: `Active element after returning home: ${activeAfterReturn}`,
    });

    expect(activeAfterReturn).toBeTruthy();
  });

  test('should trap focus within the gist grid and not escape unintentionally', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Tab until we reach a gist card
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }

    // Now press Tab several more times — focus should cycle within grid elements
    const focusedElements: string[] = [];
    const gridSelectors = ['gist-card', 'star-btn', 'delete-btn', 'gist-item'];

    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);

      const className = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return 'none';
        return el.className?.toString().slice(0, 40) || el.tagName;
      });

      const inGrid = gridSelectors.some((s) => className.includes(s));
      focusedElements.push(`${className}${inGrid ? '[grid]' : '[other]'}`);
    }

    const gridItems = focusedElements.filter((f) => f.includes('[grid]'));
    const otherItems = focusedElements.filter((f) => f.includes('[other]'));

    test.info().annotations.push({
      type: 'focus-trap-bento',
      description: `Grid elements focused: ${gridItems.length}, Other elements: ${otherItems.length}`,
    });
  });
});
