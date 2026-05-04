# Playwright CI Stabilization Report

## Problem Statement
CI shards 1 and 2 were consistently failing with exit code 1 and timeout errors. Investigation revealed multiple root causes:
1. **State Bleed**: Leftover data in IndexedDB and localStorage between tests caused inconsistent behavior.
2. **Server Startup**: The dev server was not always ready when tests started, especially in resource-constrained CI environments.
3. **Selector Regressions**: UI modernization introduced mixed-case labels and dynamic IDs that broke existing E2E selectors.

## Resolution & Learnings

### 1. Absolute State Isolation
A custom Playwright fixture (`tests/base.ts`) was implemented to ensure every test starts with a clean slate.
- **Action**: Every test file now imports `test` and `expect` from `../base` instead of `@playwright/test`.
- **Implementation**: The fixture navigates to the app origin and executes a comprehensive cleanup script (localStorage, sessionStorage, Service Workers, Cache Storage, and IndexedDB) before each test.

### 2. CI Resilience
- **Retries**: Added `--retries=2` to CI commands to handle transient environment issues.
- **Timeout**: Increased `webServer.timeout` to 120s in `playwright.config.ts`.
- **Visibility**: Enabled `--reporter=github` for inline annotations of test failures in PRs.

### 3. Locator Fixes
- Replaced brittle ID selectors (e.g., `#gist-content`) with class selectors (`.gist-content`) to handle dynamic content.
- Updated text assertions to match mixed-case UI labels (e.g., "Create New Gist" instead of "CREATE NEW GIST").

## Prevention Strategy
- **Standard**: All new E2E tests MUST use the isolation fixture.
- **CI Config**: `playwright.config.ts` and `ci.yml` are now locked with high-resilience settings.
