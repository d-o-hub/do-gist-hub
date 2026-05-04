---
name: playwright-quality
description: Cross-browser testing with Playwright including mobile emulation, offline behavior, and absolute state isolation.
version: "0.1.1"
template_version: "0.1.0"
---

# Playwright-quality Skill

Implement comprehensive test coverage using Playwright for cross-browser quality assurance.

## 2026 Best Practices

1. **State Isolation**: Standard browser context isolation is insufficient for apps using IndexedDB and Service Workers. **Every** test must import `test` from `tests/base.ts` which clears localStorage, sessionStorage, Service Workers, Cache Storage, and IndexedDB ('d-o-gist-hub-db', 'gist-cache') before starting.
2. **Webserver Timeout**: Increased `webServer.timeout` to 120,000ms to ensure the dev server is ready before tests begin in CI.
3. **CI Resilience**: Use `--retries=2` and `--reporter=github` for automatic recovery and better failure visibility.
4. **Role-based locators**: Use `getByRole()`, `getByLabel()`, `getByTestId()` or stable classes over dynamic IDs.
5. **Web-first assertions**: Auto-retry until timeout, no manual `waitFor()` calls. Match exact UI casing.
6. **Parallel + shard**: CI uses sharding for large test suites.

## Test Structure

```
tests/
├── base.ts         <-- Standard Isolation Fixture
├── browser/        <-- Desktop tests
├── mobile/         <-- Mobile emulation
└── offline/        <-- Offline behavior
```

## Required Config (playwright.config.ts)

```typescript
webServer: {
  command: 'pnpm dev',
  url: 'http://localhost:3000',
  timeout: 120000,
},
```
