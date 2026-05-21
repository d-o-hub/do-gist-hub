# Issue: Playwright System Deps Skipped on Browser Cache Hit

**Date:** 2026-05-21
**Severity:** high

## Description

When Playwright browsers are cached in CI (`.github/workflows/cross-browser.yml`), the `if: cache-hit != 'true'` guard on the install step also skips system dependency installation. On cache hit, apt packages like `libwoff2dec` are missing, causing WebKit to crash with shared library errors.

## Root Cause

System dependencies (apt packages) are not cached by the Playwright browser cache. The `--with-deps` flag was bundled into the same step as browser download, so both were skipped on cache hit.

## Files Affected

- `.github/workflows/cross-browser.yml`

## Suggested Fix

Always use this split pattern when caching Playwright browsers:

```yaml
- name: Install Playwright Browsers
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: npx playwright install ${{ matrix.browser }}

- name: Install Playwright system dependencies
  if: steps.playwright-cache.outputs.cache-hit == 'true'
  run: npx playwright install-deps ${{ matrix.browser }}
```

## Verification

- [x] Issue resolved (`053-progress-update-2026-05-21-playwright-cache-fix.md`)
- [x] `ci-maintenance.md` updated with prevention rule
- [x] Quality gate passes
