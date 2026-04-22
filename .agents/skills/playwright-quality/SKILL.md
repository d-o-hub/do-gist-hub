---
name: playwright-quality
description: Cross-browser testing with Playwright including mobile emulation, offline behavior, and Android WebView smoke tests.
---

# Playwright-quality Skill

Implement comprehensive test coverage using Playwright for cross-browser quality assurance.

**Reference**: https://playwright.dev/docs/best-practices | https://testdino.com/blog/playwright-best-practices/

## When to Use

- Adding E2E tests
- Testing mobile responsiveness
- Verifying offline behavior
- Android WebView smoke tests
- Accessibility testing

## 2026 Best Practices

1. **Role-based locators**: Use `getByRole()`, `getByLabel()`, `getByTestId()` over CSS selectors
2. **Web-first assertions**: Auto-retry until timeout, no manual `waitFor()` calls
3. **Test isolation**: Each test runs in separate browser context
4. **Mock external APIs**: Use `page.route()` for 3rd party services
5. **Seed data via API**: Use API calls for setup (50ms vs 5s for UI)
6. **Parallel + shard**: CI uses sharding for large test suites (500+ tests)
7. **Trace on failure**: `trace: 'on-first-retry'` for debugging CI failures
8. **Video on failure**: `video: 'on-first-retry'` for visual debugging

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

## Browser Tests (2026 Style)

```typescript
// tests/browser/gist-list.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Gist List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays list of gists', async ({ page }) => {
    // Use role-based locators for resilience
    const gistList = page.getByTestId('gist-list');
    await expect(gistList).toBeVisible();
  });

  test('loads gists from IndexedDB first', async ({ page }) => {
    // Web-first assertion auto-retries
    const gistItems = page.getByTestId('gist-item');
    await expect(gistItems.first()).toBeVisible();
  });

  test('paginates gist list', async ({ page }) => {
    await page.getByTestId('load-more').click();
    await expect(page.getByTestId('gist-list')).toBeVisible();
  });
});
```

## Mobile Emulation Tests (2026 Style)

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

## Offline Tests (2026 Style)

```typescript
// tests/offline/offline-read.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Offline Read', () => {
  test('loads gists from IndexedDB when offline', async ({ page, context }) => {
    // Seed data via API (faster than UI)
    await context.setOffline(false);
    await page.goto('/');
    await expect(page.getByTestId('gist-list')).toBeVisible();

    // Go offline
    await context.setOffline(true);

    // Reload and verify data still available
    await page.reload();
    await expect(page.getByTestId('gist-list')).toBeVisible();
  });

  test('shows offline indicator', async ({ page, context }) => {
    await context.setOffline(true);
    await page.goto('/');
    await expect(page.getByTestId('offline-indicator')).toBeVisible();
  });
});
```

## Configuration (2026 Best Practices)

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30 * 1000,
  expect: { timeout: 10 * 1000 },
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list', { printSteps: true }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10 * 1000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testDir: './tests/browser' },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testDir: './tests/browser' },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testDir: './tests/browser' },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, testDir: './tests/mobile' },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] }, testDir: './tests/mobile' },
    { name: 'tablet', use: { ...devices['iPad Mini'] }, testDir: './tests/mobile' },
    { name: 'mobile-small', use: { viewport: { width: 320, height: 568 } }, testDir: './tests/mobile' },
    { name: 'offline', use: { ...devices['Desktop Chrome'], offline: true }, testDir: './tests/offline' },
    { name: 'accessibility', use: { ...devices['Desktop Chrome'] }, testDir: './tests/accessibility' },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

## Gotchas

- **Deterministic Tests**: No flaky tests, use deterministic data
- **Silent Success**: Tests should be quiet on success, verbose on failure
- **Web-first Assertions**: Use `expect(locator).toBeVisible()` not manual waits
- **Mobile Viewports**: Test at 320px, 390px, 768px minimum
- **Offline First**: Test offline behavior thoroughly
- **Android WebView**: Smoke test native app packaging
- **Clean State**: Reset state between tests
- **No setTimeout**: Use web-first assertions that auto-retry

## Required Outputs

- `playwright.config.ts` - Playwright configuration
- `tests/browser/*.spec.ts` - Browser tests
- `tests/mobile/*.spec.ts` - Mobile emulation tests
- `tests/offline/*.spec.ts` - Offline behavior tests
- `tests/android/*.spec.ts` - Android WebView tests (optional)

## Verification

```bash
# Run all tests
pnpm run test

# Run specific test suite
pnpm run test:browser
pnpm run test:mobile
pnpm run test:offline

# Run with UI mode (2026 feature)
pnpm run test:ui

# Debug mode
pnpm run test:debug

# Generate coverage
pnpm run test:coverage

# Open HTML report
pnpm run test:report
```

## References

- https://playwright.dev/docs/best-practices - Official best practices
- https://playwright.dev/docs/emulation - Mobile emulation
- https://playwright.dev/docs/api/class-android - Android API
- https://testdino.com/blog/playwright-best-practices/ - 17 Best Practices for 2026
- `AGENTS.md` - Testing rules
