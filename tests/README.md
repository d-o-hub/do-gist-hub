# Playwright Test Patterns

This document outlines the standard patterns and best practices for writing Playwright tests in this project.

## Mandatory `async` callbacks in `page.evaluate`

When using `page.evaluate` or `page.evaluateHandle`, always use `async` callbacks, even if the logic within is synchronous. This ensures consistency and prevents potential execution issues in the browser context.

```typescript
// ✅ CORRECT
await page.evaluate(async () => {
  localStorage.clear();
});

// ❌ INCORRECT
await page.evaluate(() => {
  localStorage.clear();
});
```

## Avoiding `any` Types

TypeScript's `any` type should be avoided in tests to maintain type safety and catch potential errors early. Use proper interfaces, types, or `unknown` with type guards.

```typescript
// ✅ CORRECT
const gists: Gist[] = await page.evaluate(async () => {
  return window.gistStore.getAll();
});

// ❌ INCORRECT
const gists: any = await page.evaluate(async () => {
  return window.gistStore.getAll();
});
```

## State Isolation

Every E2E test file (`.spec.ts`) MUST import `test` and `expect` from `tests/base.ts`. This fixture ensures absolute state isolation by clearing `localStorage`, `IndexedDB`, and `Service Workers` before every test starts.

```typescript
// ✅ CORRECT
import { test, expect } from '../base';

test('my test', async ({ page }) => {
  // ...
});

// ❌ INCORRECT
import { test, expect } from '@playwright/test';
```

## Locators and Assertions

- Use `.first()` or specific data attributes (e.g., `data-route`, `data-testid`) for multi-element locators to avoid strict mode violations.
- Prefer web-first assertions like `expect(locator).toBeVisible({ timeout: 10000 })`.
- Use `.filter({ visible: true })` for breakpoint-specific UI elements.
