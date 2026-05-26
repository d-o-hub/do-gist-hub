# 058 — GOAP: Cross-Browser WebKit System Dependency Fix

> **Date**: 2026-05-26
> **Type**: GOAP Plan
> **Status**: Active
> **Related**: `adr-031-playwright-webkit-deps-ci.md`, `.github/workflows/cross-browser.yml`, `053-progress-update-2026-05-21-playwright-cache-fix.md`

---

## Context

The `cross-browser.yml` workflow tests Firefox and WebKit on every push to `main`. On a Playwright browser cache miss, `npx playwright install ${{ matrix.browser }}` installs the browser binary **without** system dependencies. For WebKit, this means ~35 system libraries (GTK4, GStreamer, flite, libsoup3, WebKitGTK) are missing, causing 58 test failures.

The cache-hit path runs `npx playwright install-deps ${{ matrix.browser }}` separately and works correctly. The gap is only on cache miss.

---

## Goals

### Goal 1: Fix WebKit CI Failures on Cache Miss

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 1 | Add `--with-deps` to `npx playwright install ${{ matrix.browser }}` on line 39 of `cross-browser.yml` | None | System deps installed atomically with browser binary | XS |
| 2 | Keep `install-deps` on cache hit (line 42) as safety net | None | No regression on cache-hit path | XS |
| 3 | Verify WebKit tests pass in cross-browser CI | Actions 1–2 deployed | Confirmed fix | XS |

---

## Success Criteria

- `npx playwright install --with-deps webkit` runs on cache miss, installing both browser binary and system deps
- WebKit test suite passes (zero failures) in the `cross-browser` workflow on push to `main`
- Firefox tests continue to pass (no regression)

---

## Plan Registry

- Register this plan in `_status.json`, `_index.md`, and `README.md`
- Next available plan: `059`
