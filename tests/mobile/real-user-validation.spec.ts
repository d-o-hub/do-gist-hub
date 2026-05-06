import { test, expect } from '../base';
import * as fs from 'fs';

const breakpoints = [
  { width: 390, height: 844, name: '390px' },
  { width: 768, height: 1024, name: '768px' },
  { width: 1536, height: 864, name: '1536px' },
];

test.describe('Real User Validation', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync('analysis/responsive')) {
      fs.mkdirSync('analysis/responsive', { recursive: true });
    }
  });

  for (const bp of breakpoints) {
    test(`validate at ${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      // 1. Initial State Screenshot
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `analysis/responsive/${bp.name}-initial.png` });

      // 2. Overflow check
      const isNoOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      );
      expect(isNoOverflow).toBe(true);

      // 3. Command Palette interaction (Cmd+K)
      const isMac = process.platform === 'darwin';
      const modifier = isMac ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+k`);
      await page.waitForTimeout(500);
      const palette = page.locator('.command-palette');
      const paletteVisible = await palette.isVisible().catch(() => false);
      if (paletteVisible) {
        await page.screenshot({ path: `analysis/responsive/${bp.name}-command-palette.png` });
        await page.keyboard.press('Escape');
      }

      // 4. Mobile Menu / Rail / Sidebar interaction
      if (bp.width < 768) {
        // Bottom nav should be visible
        const bottomNav = page.locator('.bottom-nav');
        await expect(bottomNav).toBeVisible();
      } else if (bp.width < 1024) {
        // Rail should be visible
        const rail = page.locator('.rail-nav');
        await expect(rail).toBeVisible();
      } else {
        // Sidebar should be visible
        const sidebar = page.locator('.sidebar-nav');
        await expect(sidebar).toBeVisible();
      }
    });
  }
});
