# Progress Update: Playwright WebKit Cache System Deps Fix

**Date:** 2026-05-21
**Type:** progress
**Status:** complete
**Relates to:** `cross-browser.yml`

## Problem

The `cross-browser.yml` workflow failed for WebKit with:
```
libwoff2dec.so.1.0.2: cannot open shared object file: No such file or directory
```

**Root cause**: The Playwright browser cache step gated the entire install with `if: cache-hit != 'true'`. On cache hit, `npx playwright install --with-deps` was skipped entirely — including system library installation. System dependencies like `libwoff2dec` are not cacheable (apt packages), so they were missing on subsequent runs.

Per [Playwright CI docs](https://playwright.dev/docs/ci):
> "Caching browser binaries is not recommended, since the amount of time it takes to restore the cache is comparable to the time it takes to download the binaries. Especially under Linux, operating system dependencies need to be installed, which are not cacheable."

## Fix

Split browser binary install from system dependency install:

| Condition | Step |
|-----------|------|
| Cache miss | `npx playwright install --with-deps ${{ matrix.browser }}` (browsers + deps) |
| Cache hit  | `npx playwright install-deps ${{ matrix.browser }}` (deps only, ~5s) |

This matches the 2026 industry consensus pattern (currents-dev, helpmetest.com, techlistic.com).

## Files Changed

- `.github/workflows/cross-browser.yml` — Split install step; added `install-deps` gated on cache hit.

## Prevention

- `agents-docs/ci-maintenance.md` updated with rule: "Playwright system deps must be installed on cache hit via `npx playwright install-deps`."
- `agents-docs/issues/2026-05-21-playwright-cache-system-deps.md` created documenting the issue.

## Verification

- [x] Cross-browser workflow no longer skips system deps on cache hit
- [x] All existing tests continue to pass
- [x] Quality gate passes
