# 059 — GOAP: Resolve Pre-Existing CI Issues

> **Status**: Active
> **Type**: GOAP
> **Created**: 2026-05-26
> **Updated**: 2026-05-26
> **Owner**: agent
> **Related**: adr-032-vitest-environment-teardown.md, adr-033-webkit-indexeddb-flaky-tests.md, tests/unit/app.test.ts, tests/browser/gist-store.spec.ts

---

## Context

Two pre-existing CI issues cause non-deterministic failures in separate pipelines:

1. **Vitest EnvironmentTeardownError** (unit tests): When vitest tears down the jsdom environment after all tests complete, transitive module resolution (via `vi.mock`'d modules that still trigger real imports) causes `EnvironmentTeardownError`. The fix is to proactively mock all modules that could be transitively resolved, even those already mocked.

2. **WebKit IndexedDB flakiness** (browser tests): Playwright's WebKit port on Linux (Ubuntu 24.04) has an unreliable IndexedDB implementation. The `should toggle star status` test in `gist-store.spec.ts` performs sequential IDB operations inside `page.evaluate()` that can hang or timeout on WebKit.

---

## Goals

### Goal 1: Fix Vitest EnvironmentTeardownError

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 1 | Add `vi.mock('../../src/components/ui/skeleton', ...)` to `app.test.ts` with a mock factory providing `renderDetail`, `renderList`, `renderCard` methods | Research done (reason: vi.mock doesn't prevent transitive resolution) | No more teardown errors in CI | XS |
| 2 | Add `vi.mock('idb', ...)` to `app.test.ts` with an `openDB` mock | Action 1 done (reason: same pattern, same file) | idb not resolved after env teardown | XS |
| 3 | Add `beforeAll` eager `import()` for unmockable transitive leaf modules | Actions 1–2 done (reason: completes the defense) | conflict-detector, conflict-resolution, focus-trap pre-cached | XS |

### Goal 2: Fix Flaky WebKit Star-Toggle Test

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 4 | Add `test.skip(browserName === 'webkit', 'known webkit indexeddb flakiness')` to `gist-store.spec.ts:228` | Research done (reason: WebKit IndexedDB unreliable on Linux) | No more flaky failures in cross-browser CI | XS |

---

## Success Criteria

- `pnpm run test:unit` passes consistently with zero `EnvironmentTeardownError` failures across 10+ consecutive runs
- `pnpm run test:browser --project=webkit` shows the star-toggle test as skipped (not failed), with all other WebKit tests passing
- Cross-browser CI (`cross-browser.yml`) has zero non-deterministic failures on the WebKit matrix entry
- Chromium and Firefox test coverage is unaffected by either change

---

## Plan Registry

- Register this plan in `_status.json`, `_index.md`, and `README.md`
- Next available plan: `060`
