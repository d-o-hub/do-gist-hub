# Mobile Emulation Tests (2026 Style)

```typescript
// tests/mobile/responsive.spec.ts
import { test, expect, devices } from '@playwright/test';

// Use Playwright's device descriptors
const MOBILE_DEVICES = [
  { name: 'iPhone SE', viewport: { width: 320, height: 568 } },
  { name: 'iPhone 14', viewport: { width: 390, height: 844 } },
  { name: 'iPad Mini', viewport: { width: 768, height: 1024 } },
];

for (const device of MOBILE_DEVICES) {
  test.describe(`Mobile: ${device.name}`, () => {
    test.use({ viewport: device.viewport });

    test('gist list is responsive', async ({ page }) => {
      await page.goto('/');
      const list = page.getByTestId('gist-list');
      await expect(list).toBeVisible();

      // Verify width constraint
      const box = await list.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(device.viewport.width);
    });

    test('touch targets are 44x44 minimum', async ({ page }) => {
      await page.goto('/');
      const buttons = page.locator('button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const box = await buttons.nth(i).boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    });
  });
}
```
