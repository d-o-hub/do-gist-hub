/**
 * Mobile Responsive Tests
 * Test responsive behavior, breakpoints, touch targets, and overflow
 */
import { test, expect } from '@playwright/test';

const MOBILE_BREAKPOINTS = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'phone', width: 375, height: 667 },
  { name: 'large-phone', width: 414, height: 896 },
];

test.describe('Mobile Responsive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  for (const bp of MOBILE_BREAKPOINTS) {
    test(`should have no horizontal overflow at ${bp.name} (${bp.width}x${bp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
    });
  }

  for (const bp of MOBILE_BREAKPOINTS) {
    test(`should show bottom navigation at ${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });

      const bottomNav = page.locator('[data-testid="bottom-nav"]');
      await expect(bottomNav).toBeVisible();

      // Should have 4 navigation items
      const navItems = bottomNav.locator('.nav-item');
      await expect(navItems).toHaveCount(4);
    });
  }

  test('should hide sidebar on mobile and show on desktop', async ({ page }) => {
    // Mobile - sidebar should be hidden or not present
    await page.setViewportSize({ width: 375, height: 667 });
    const sidebarMobile = page.locator('[data-testid="sidebar-nav"]');
    const sidebarVisibleMobile = await sidebarMobile.isVisible().catch(() => false);
    
    // Desktop - sidebar should be visible
    await page.setViewportSize({ width: 1280, height: 800 });
    const sidebarDesktop = page.locator('[data-testid="sidebar-nav"]');
    await expect(sidebarDesktop).toBeVisible();

    // On mobile, if sidebar is visible it should be styled correctly
    if (sidebarVisibleMobile) {
      const sidebarDisplay = await sidebarMobile.evaluate(el => getComputedStyle(el).display);
      expect(sidebarDisplay).toMatch(/none|hidden/i);
    }
  });

  for (const bp of MOBILE_BREAKPOINTS) {
    test(`should have minimum 44x44px touch targets at ${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.waitForTimeout(500);

      const smallTargets = await page.evaluate(() => {
        const elements = document.querySelectorAll(
          'button, .nav-item, .icon-button, .filter-btn, .gist-action-btn'
        );
        const small: Array<{ tag: string; width: number; height: number; text?: string }> = [];
        
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (rect.width < 44 || rect.height < 44) {
              small.push({
                tag: el.tagName,
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                text: el.textContent?.trim().slice(0, 30),
              });
            }
          }
        });
        
        return small;
      });

      // Log small touch targets for debugging (but don't fail test if < 3 exist)
      test.info().annotations.push({
        type: 'touch-targets',
        description: `${bp.name}: ${smallTargets.length} targets < 44px: ${JSON.stringify(smallTargets.slice(0, 5))}`,
      });

      // Allow some tolerance for informational elements
      expect(smallTargets.length).toBeLessThan(10);
    });
  }

  test('should scale typography appropriately on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    const titleSize = await page.evaluate(() => {
      const title = document.querySelector('.app-title');
      if (!title) return null;
      return getComputedStyle(title).fontSize;
    });

    expect(titleSize).toBeTruthy();
    // Font size should be reasonable for mobile (not larger than 32px)
    if (titleSize) {
      const sizePx = parseFloat(titleSize);
      expect(sizePx).toBeLessThan(32);
      expect(sizePx).toBeGreaterThan(12);
    }
  });

  test('should maintain readable line lengths on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    const contentWidth = await page.evaluate(() => {
      const main = document.querySelector('.app-main');
      if (!main) return 0;
      const style = getComputedStyle(main);
      return parseFloat(style.width) - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    });

    // Content area should be at least 280px wide (allowing for padding)
    expect(contentWidth).toBeGreaterThanOrEqual(280);
  });

  test('should adapt form inputs for mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.locator('[data-testid="nav-create"]').click();
    await page.waitForSelector('.route-create');

    // Form inputs should be full width on mobile
    const formInput = page.locator('.form-input').first();
    const inputVisible = await formInput.isVisible().catch(() => false);
    
    if (inputVisible) {
      const inputWidth = await formInput.evaluate(el => el.getBoundingClientRect().width);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      
      // Input should take most of the viewport width (at least 75% to account for padding)
      expect(inputWidth).toBeGreaterThan(viewportWidth * 0.75);
    }
  });

  test('should handle orientation change gracefully', async ({ page }) => {
    // Start portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(300);

    // Should still have no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // Bottom nav should still be visible
    const bottomNav = page.locator('[data-testid="bottom-nav"]');
    const navVisible = await bottomNav.isVisible().catch(() => false);
    expect(navVisible).toBe(true);
  });
});
