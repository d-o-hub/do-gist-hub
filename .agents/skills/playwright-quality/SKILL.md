---
name: playwright-quality
description: Cross-browser testing with Playwright including mobile emulation, offline behavior, and Android WebView smoke tests.
version: '0.1.0'
template_version: '0.1.0'
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
├── browser/          # Browser tests
├── mobile/           # Mobile emulation tests
├── offline/          # Offline behavior tests
├── android/          # Android WebView tests
├── visual/           # Visual regression tests
└── a11y/            # Accessibility tests
```

## Code Examples

See reference files for detailed examples:

- `references/browser-tests.md` - Browser test patterns
- `references/mobile-tests.md` - Mobile emulation tests
- `references/offline-tests.md` - Offline behavior tests
- `references/configuration.md` - Playwright configuration

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
npm run test                # Run all tests
npm run test:browser        # Run browser tests
npm run test:mobile         # Run mobile tests
npm run test:offline        # Run offline tests
npm run test:ui             # UI mode
npm run test:debug          # Debug mode
npm run test:coverage       # Generate coverage
npm run test:report         # Open HTML report
```

## References

- https://playwright.dev/docs/best-practices - Official best practices
- https://playwright.dev/docs/emulation - Mobile emulation
- https://playwright.dev/docs/api/class-android - Android API
- https://testdino.com/blog/playwright-best-practices/ - 17 Best Practices for 2026
