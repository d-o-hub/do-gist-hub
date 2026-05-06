/**
 * Visual regression screenshots across all breakpoints
 */
import { test } from '@playwright/test';

const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 812, device: 'Pixel 7' },
  { name: 'tablet', width: 768, height: 1024, device: 'iPad Mini' },
  { name: 'desktop', width: 1280, height: 800, device: 'Desktop Chrome' },
  { name: 'wide', width: 1536, height: 864, device: 'Desktop Chrome' },
] as const;

test.describe('UI Visual Verification', () => {
  for (const bp of BREAKPOINTS) {
    test(`screenshot - ${bp.name} (${bp.width}x${bp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Check no horizontal scroll
      const scrollWidth = await page.evaluate(async () => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(async () => document.documentElement.clientWidth);
      test.info().annotations.push({
        type: 'horizontal-overflow',
        description: `${bp.name}: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}, overflow=${scrollWidth > clientWidth}`,
      });

      // Screenshot full page
      await page.screenshot({
        path: `analysis/screenshots/screenshot-${bp.name}.png`,
        fullPage: true,
      });

      // Verify navigation exists
      const bottomNav = page.locator('.bottom-nav');
      const sidebarNav = page.locator('.sidebar-nav');
      const hasNav = (await bottomNav.count()) > 0 || (await sidebarNav.count()) > 0;
      test.info().annotations.push({
        type: 'navigation',
        description: `${bp.name}: nav visible = ${hasNav}`,
      });

      // Verify gist cards render
      const cards = page.locator('.gist-card');
      const cardCount = await cards.count();
      test
        .info()
        .annotations.push({ type: 'cards', description: `${bp.name}: card count = ${cardCount}` });

      // Verify no overlapping cards
      if (cardCount > 0) {
        const overlaps = await page.evaluate(async () => {
          const elements = document.querySelectorAll('.gist-card');
          const rects: DOMRect[] = [];
          elements.forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.height > 0) rects.push(r);
          });
          for (let i = 0; i < rects.length; i++) {
            for (let j = i + 1; j < rects.length; j++) {
              const a = rects[i],
                b = rects[j];
              const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
              const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
              if (overlapX > 10 && overlapY > 10) return true;
            }
          }
          return false;
        });
        test.info().annotations.push({
          type: 'overlap',
          description: `${bp.name}: cards overlap = ${overlaps}`,
        });
      }

      // Verify touch targets on mobile
      if (bp.width < 768) {
        const smallTargets = await page.evaluate(async () => {
          const elements = document.querySelectorAll(
            'button, .nav-item, .icon-button, .filter-btn, .gist-action-btn'
          );
          const small: { tag: string; w: number; h: number }[] = [];
          elements.forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
              small.push({ tag: el.tagName, w: Math.round(r.width), h: Math.round(r.height) });
            }
          });
          return small;
        });
        test.info().annotations.push({
          type: 'touch-targets',
          description: `${bp.name}: small targets (<44px) = ${JSON.stringify(smallTargets.slice(0, 5))}`,
        });
      }

      // Verify active pill style on nav
      const activeNav = page.locator('.nav-item.active, .sidebar-item.active');
      const activeCount = await activeNav.count();
      test.info().annotations.push({
        type: 'active-nav',
        description: `${bp.name}: active nav items = ${activeCount}`,
      });

      // Check active has pill styling (border-radius full + background)
      if (activeCount > 0) {
        const pillStyle = await page.evaluate(async () => {
          const el = document.querySelector('.nav-item.active, .sidebar-item.active');
          if (!el) return null;
          const cs = getComputedStyle(el);
          return {
            borderRadius: cs.borderRadius,
            backgroundColor: cs.backgroundColor,
          };
        });
        test.info().annotations.push({
          type: 'pill-style',
          description: `${bp.name}: ${JSON.stringify(pillStyle)}`,
        });
      }
    });
  }
});
