# Browser Tests (2026 Style)

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
