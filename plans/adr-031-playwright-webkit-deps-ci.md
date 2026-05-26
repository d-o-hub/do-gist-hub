<!-- Last Audit: 2026-05-26 -->
# ADR-031 — Playwright WebKit System Dependency Installation in CI

**Status**: Accepted
**Date**: 2026-05-26
**Deciders**: DevOps Agent
**Related**: `.github/workflows/cross-browser.yml`, `053-progress-update-2026-05-21-playwright-cache-fix.md`

---

## Context

The `cross-browser.yml` workflow (`.github/workflows/cross-browser.yml:19`) runs Playwright tests against Firefox and WebKit on every push to `main`. The workflow uses `actions/cache@v5` to cache Playwright browser binaries at `~/.cache/ms-playwright`, keyed by OS and browser name.

The cache strategy has two branches:

1. **Cache miss** (line 38): `npx playwright install ${{ matrix.browser }}` — installs the browser binary only.
2. **Cache hit** (line 41): `npx playwright install-deps ${{ matrix.browser }}` — installs system dependencies only.

This works correctly for Firefox, whose system dependencies are minimal. However, **WebKit requires approximately 35 system libraries** (GTK4, GStreamer, flite, libsoup3, WebKitGTK, etc.) that are not bundled in the Playwright browser binary and cannot be cached via `actions/cache` because they are installed at the system level via `apt-get`.

On a WebKit cache miss:
- `npx playwright install webkit` downloads the browser binary (~80MB) and caches it.
- System dependencies are **not installed** because `--with-deps` is absent.
- The WebKit tests then fail immediately with 58 failures due to missing shared libraries.

On a WebKit cache hit:
- `npx playwright install-deps webkit` runs correctly, installing all system deps.
- Tests pass.

The gap is the missing `--with-deps` flag on the cache-miss install step. The `install` command supports `--with-deps` to install both the browser binary and its system dependencies in a single invocation.

---

## Decision

### 1. Add `--with-deps` to the cache-miss install step

Append `--with-deps` to the `npx playwright install` command on line 39 of `cross-browser.yml`:

```yaml
- name: Install Playwright Browsers
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: npx playwright install --with-deps ${{ matrix.browser }}
```

This ensures that on a cache miss, both the browser binary and all required system libraries are installed atomically.

### 2. Keep `install-deps` on cache hit as a safety net

The existing `install-deps` step (line 42) runs only when `cache-hit == 'true'`. This path remains correct and serves as a safety net for cached browsers. No change needed.

### 3. Benefits of the dual-path approach

| Path | Condition | Behavior | Status |
|------|-----------|----------|--------|
| Cache miss | `cache-hit != 'true'` | `install --with-deps` (binary + system deps) | **Fixed** |
| Cache hit | `cache-hit == 'true'` | `install-deps` (system deps only) | Already correct |

The cache key (`playwright-${{ runner.os }}-${{ matrix.browser }}-${{ hashFiles('pnpm-lock.yaml') }}`) ensures the browser binary is stored per-browser and invalidated when `pnpm-lock.yaml` changes (which triggers a Playwright version update via the `@playwright/test` dependency).

---

## Tradeoffs

### Pros

- Eliminates the 58 WebKit test failures on cache-miss runs entirely.
- No additional CI steps or runner time — the flag is a single-word append.
- Works for Firefox too (same `--with-deps` semantics, no regression).
- The `install-deps` safety net on cache hit is preserved.

### Cons

- `--with-deps` runs `apt-get install` with `sudo`, adding ~15–30s to cache-miss runs.
- The system dependencies are not cached, so every cache miss pays this cost (acceptable — cache misses are infrequent relative to hits).
- No change to the existing Firefox path (Firefox deps are minimal, so `--with-deps` is harmless but adds a small overhead).

---

## Consequences

- WebKit tests no longer fail unconditionally on cache-miss CI runs.
- The workflow is self-healing regardless of cache state.
- No additional maintenance burden — the flag is part of Playwright's documented CLI.

---

## Rejected Alternatives

### Remove caching entirely for WebKit
**Rejected because**: The browser binary is ~80MB and caching reduces install time from ~40s to ~5s on cache hit. The problem is not caching itself but the missing `--with-deps` flag.

### Always run `install-deps` unconditionally (merge both branches)
**Rejected because**: On cache hit, `install --with-deps` would re-download the browser binary unnecessarily. The two-branch approach is optimal for cache utilization.

### Install system deps via a separate `apt-get` step
**Rejected because**: Playwright's `install-deps` already manages the exact list of required libraries. Maintaining a separate apt list would drift from upstream.

---

## Rollback

1. Remove `--with-deps` from the cache-miss install command in `cross-browser.yml`.
2. Revert to the original two-branch behavior without `--with-deps`.

---

## References

- `.github/workflows/cross-browser.yml` — the target workflow file
- `053-progress-update-2026-05-21-playwright-cache-fix.md` — original cache fix documentation
- [Playwright CLI docs: `install --with-deps`](https://playwright.dev/docs/cli#install-system-dependencies)

---

*Created: 2026-05-26. Status: Accepted.*
