<!-- Last Audit: 2026-04-25 -->
# Plan-018: Fix CI Offline Test Infrastructure

**Status**: Implemented
**Date**: 2026-04-25
**Priority**: Medium

## Problem

CI Playwright tests for the `offline` project fail with:
```
Error: page.goto: net::ERR_INTERNET_DISCONNECTED at http://localhost:3000/
```

## Root Cause

The `playwright.config.ts` offline project sets `offline: true` on the browser context:

```typescript
{
  name: 'offline',
  use: {
    ...devices['Desktop Chrome'],
    offline: true,  // Browser cannot reach localhost:3000
  },
  testDir: './tests/offline',
}
```

This prevents the browser from connecting to the web server at `http://localhost:3000`, causing all offline tests to fail immediately on `page.goto()`.

## Impact

- 26 offline tests fail in CI (all with `ERR_INTERNET_DISCONNECTED`)
- Browser, mobile, and accessibility tests pass (96+ tests)
- Quality Gate and Android Build pass

## Proposed Solutions

### Option 1: Use setOffline after page load (Recommended)

Instead of `offline: true` in config, load the page first, then go offline:

```typescript
// In test file
const context = await browser.newContext();
const page = await context.newPage();
await page.goto('/');  // Load while online
await context.setOffline(true);  // Then go offline
```

### Option 2: Use 127.0.0.1 instead of localhost

Some browsers treat 127.0.0.1 differently than localhost for offline mode:
```typescript
webServer: {
  command: 'pnpm dev --host 127.0.0.1',
  url: 'http://127.0.0.1:3000',
}
```

### Option 3: Separate CI job for offline tests

Run offline tests in a separate job that doesn't use the webServer config:
```yaml
- name: Run Offline Tests
  run: pnpm exec playwright test tests/offline/ --project=offline
  env:
    PW_TEST_CONNECT_WS_ENDPOINT: ''
```

## References

- `playwright.config.ts` lines 102-110
- `.github/workflows/ci.yml` test steps
- Playwright docs: https://playwright.dev/docs/network#offline

---

*Created: 2026-04-25. Status: Identified, needs implementation.*
