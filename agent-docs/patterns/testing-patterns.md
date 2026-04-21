# Testing Patterns

## Playwright Best Practices (2026)

### Use Role-Based Locators

```typescript
// Good: Stable, accessible
await page.getByRole('button', { name: 'Create' }).click();
await page.getByLabel('Description').fill('Test');

// Bad: Brittle
await page.locator('#create-btn').click();
await page.locator('.description-input').fill('Test');
```

### Test Isolation

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});
```

### Web-First Assertions

```typescript
// Good: Auto-retry
await expect(page.getByText('Success')).toBeVisible();

// Bad: Manual polling
expect(await page.isVisible('.success')).toBeTruthy();
```

### Mock External APIs

```typescript
test('loads gists', async ({ page }) => {
  await page.route('**/api.github.com/**', (route) => {
    route.fulfill({ status: 200, body: JSON.stringify(mockGists) });
  });
  await page.goto('/');
});
```

---

## Test Categories

### Browser Tests

- Navigation
- Gist CRUD operations
- Settings
- Error handling

### Mobile Tests

- Responsive layouts (320/390/480/768)
- Touch interactions
- Safe area insets
- Viewport scroll

### Offline Tests

- Cache behavior
- Sync queue
- Optimistic updates
- Conflict detection

### Accessibility Tests

- Keyboard navigation
- Screen reader support
- Color contrast
- ARIA labels

### Visual Tests

- Screenshot comparison
- Responsive breakpoints
- Theme switching

---

## Stub Pattern (Anti-Pattern)

Avoid stubs in production tests:

```typescript
// Bad: Stub
test('memory usage', async () => {
  expect(memoryUsage).toBeLessThan(50);
});

// Good: Real test
test('memory usage', async ({ page }) => {
  const metrics = await page.metrics();
  expect(metrics.JSHeapUsedSize).toBeLessThan(50 * 1024 * 1024);
});
```

---

## Coverage Goals

| Type       | Current | Target |
| ---------- | ------- | ------ |
| Statements | 30%     | 80%    |
| Branches   | 25%     | 75%    |
| Functions  | 35%     | 80%    |
| Lines      | 30%     | 80%    |

---

## Test File naming

```
tests/
├── browser/          # Desktop browser tests
│   ├── gist-list.spec.ts
│   ├── navigation.spec.ts
│   └── settings.spec.ts
├── mobile/           # Mobile emulation tests
│   ├── responsive.spec.ts
│   └── navigation.spec.ts
├── offline/          # Offline behavior tests
│   ├── cache.spec.ts
│   └── sync.spec.ts
├── accessibility/    # A11y tests
│   ├── keyboard.spec.ts
│   └── screen-reader.spec.ts
└── visual/           # Screenshot tests
    └── modernization.spec.ts
```

---

_Last updated: 2026-04-21_
