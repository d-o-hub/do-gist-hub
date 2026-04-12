---
name: playwright-quality
description: Cross-browser testing with Playwright including mobile emulation, offline behavior, and Android WebView smoke tests.
---

# Playwright-quality Skill

Implement comprehensive test coverage using Playwright for cross-browser quality assurance.

## When to Use

- Adding E2E tests
- Testing mobile responsiveness
- Verifying offline behavior
- Android WebView smoke tests
- Accessibility testing

## Test Structure

```
tests/
├── browser/
│   ├── gist-list.spec.ts
│   ├── gist-editor.spec.ts
│   ├── auth.spec.ts
│   └── navigation.spec.ts
├── mobile/
│   ├── responsive.spec.ts
│   └── touch-interactions.spec.ts
├── offline/
│   ├── offline-read.spec.ts
│   └── offline-write-queue.spec.ts
├── android/
│   └── webview-smoke.spec.ts
├── visual/
│   └── regression.spec.ts
└── a11y/
    └── accessibility.spec.ts
```

## Browser Tests

```typescript
// tests/browser/gist-list.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Gist List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays list of gists', async ({ page }) => {
    await expect(page.locator('[data-testid="gist-list"]')).toBeVisible();
  });

  test('loads gists from IndexedDB first', async ({ page }) => {
    // Verify offline-first behavior
    const gistItems = await page.locator('[data-testid="gist-item"]').count();
    expect(gistItems).toBeGreaterThan(0);
  });

  test('paginates gist list', async ({ page }) => {
    await page.locator('[data-testid="load-more"]').click();
    await expect(page.locator('[data-testid="gist-list"]')).toBeVisible();
  });
});
```

## Mobile Emulation Tests

```typescript
// tests/mobile/responsive.spec.ts
import { test, expect } from '@playwright/test';

const DEVICES = [
  { name: 'iPhone SE', viewport: { width: 375, height: 667 } },
  { name: 'iPhone 12', viewport: { width: 390, height: 844 } },
  { name: 'iPad', viewport: { width: 768, height: 1024 } },
];

for (const device of DEVICES) {
  test.describe(device.name, () => {
    test.use({ viewport: device.viewport });

    test('gist list is responsive', async ({ page }) => {
      await page.goto('/');
      const listWidth = await page.locator('[data-testid="gist-list"]').boundingBox();
      expect(listWidth?.width).toBeLessThanOrEqual(device.viewport.width);
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

## Offline Tests

```typescript
// tests/offline/offline-read.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Offline Read', () => {
  test('loads gists from IndexedDB when offline', async ({ page, context }) => {
    // Go online first to load data
    await context.setOffline(false);
    await page.goto('/');
    await expect(page.locator('[data-testid="gist-list"]')).toBeVisible();

    // Go offline
    await context.setOffline(true);

    // Reload and verify data still available
    await page.reload();
    await expect(page.locator('[data-testid="gist-list"]')).toBeVisible();
  });

  test('shows offline indicator', async ({ page, context }) => {
    await context.setOffline(true);
    await page.goto('/');
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
  });
});
```

## Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Gotchas

- **Deterministic Tests**: No flaky tests, use deterministic data
- **Silent Success**: Tests should be quiet on success, verbose on failure
- **Wait for Selectors**: Use `waitForSelector` not `setTimeout`
- **Mobile Viewports**: Test at 320px, 390px, 768px minimum
- **Offline First**: Test offline behavior thoroughly
- **Android WebView**: Smoke test native app packaging
- **Clean State**: Reset state between tests

## Required Outputs

- `playwright.config.ts` - Playwright configuration
- `tests/browser/*.spec.ts` - Browser tests
- `tests/mobile/*.spec.ts` - Mobile emulation tests
- `tests/offline/*.spec.ts` - Offline behavior tests
- `tests/android/*.spec.ts` - Android WebView tests (optional)

## Verification

```bash
# Run all tests
npm run test

# Run specific test suite
npm run test:browser
npm run test:mobile
npm run test:offline

# Run with UI
npm run test:ui

# Generate coverage
npm run test:coverage
```

## References

- https://playwright.dev/docs/emulation - Mobile emulation
- https://playwright.dev/docs/api/class-android - Android API
- https://playwright.dev/docs/api/class-androidwebview - WebView testing
- `AGENTS.md` - Testing rules
