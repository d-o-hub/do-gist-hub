# Offline Tests (2026 Style)

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
