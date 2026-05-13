# Progress Update — PR #156: Test Coverage Expansion

> **Date**: 2026-05-13  
> **PR**: [#156](https://github.com/d-o-hub/do-gist-hub/pull/156) — `test/add-unit-test-coverage`  
> **Status**: ✅ **MERGED** into `main` (commit `fb23476`)  
> **Branch**: Deleted (local + remote auto-deleted by GitHub)  

## Summary

Added comprehensive unit test coverage across 16 new test files and significantly enhanced 2 existing test files. Total test count: **790 tests across 47 files** (up from ~130).

## New Test Files (16)

| File | Tests | Area |
|------|-------|------|
| `command-palette.test.ts` | 34 | Constructor, setCommands, open/close, search/filter, keyboard nav, click delegation, global shortcut, categories, singleton |
| `conflict-detector.test.ts` | 11 | detectConflict scenarios, resolveConflict strategies, store/get/clear |
| `dialog.test.ts` | 13 | DOM creation, sanitization, confirm/cancel resolution, animation, default title |
| `error-handler.test.ts` | 18 | GitHub error codes (401/403/404/422/429/500), network errors, string/null errors |
| `export-import.test.ts` | 8 | exportAllGists JSON, import valid/invalid/missing formats |
| `gist-card.test.ts` | 26 | renderCard output, caching, bindCardEvents, star/delete actions, toast feedback |
| `main.test.ts` | 12 | Bootstrap init order, success/failure paths, auth state logging |
| `nav-keyboard.test.ts` | 20 | Constructor filtering, arrow nav (up/down/left/right), Home/End, wrap-around, focus tracking, lifecycle |
| `offline-monitor.test.ts` | 11 | Online/offline detection, event dispatch, subscription |
| `offline-route.test.ts` | 6 | Render stats, pending count, synced state, conflict count, navigation |
| `perf.test.ts` | 21 | Web Vitals init, LCP/FID/CLS callbacks, performance marks/measures |
| `rate-limiter.test.ts` | 10 | Token bucket, rate limit headers, retry-after, conditional requests |
| `register-sw.test.ts` | 20 | Registration, updatefound, unregister, clearCaches, isInstalled, background sync |
| `sw.test.ts` | 13 | Cache strategies, fetch handling, message events |
| `toast.test.ts` | 30 | Success/error/info/warning variants, duration, action button, remove, stack |
| `types.test.ts` | 9 | Type guards, validation, GistRecord shape |

## Enhanced Test Files (2)

### gist-detail.test.ts
- **Before**: 6 route-level tests (mocked the entire component module)
- **After**: 17 component-level tests covering `renderFileContent`, `renderGistDetail`, `renderRevisions`, `loadGistDetail`
- Proper mocking of gistStore and toast services

### gist-store.test.ts
- **Before**: 15 basic tests (init, create/update/delete with offline queuing)
- **After**: 49 comprehensive tests covering:
  - Full CRUD operations with API + offline fallback
  - Star/unstar toggle with rollback
  - Search/filter (by description, filename, case-insensitive)
  - Subscribe/unsubscribe patterns
  - reloadFromDb, hydrateGist, loadGists
  - Conflict resolution
  - Authentication gating

## CodeRabbit Review Feedback Addressed

Commit `7267e13` fixed 4 review comments:

1. **gist-store.test.ts**: Fixed misleading test name ("returns false" → "returns true for non-existent gist when offline (no-op success)")
2. **gist-card.test.ts**: Fixed non-deterministic relative time test using `vi.useFakeTimers()` + `vi.setSystemTime()` (since `formatRelativeTime` uses `new Date()`, not `Date.now()`)
3. **offline-route.test.ts**: Added `window.removeEventListener('app:navigate', ...)` cleanup after conflict card navigation test
4. **register-sw.test.ts**: Save/restore original `MessageChannel` and `SyncManager` globals in beforeEach/afterEach

## CI Results

| Check | Status |
|-------|--------|
| Quality Gate | ✅ Pass |
| Playwright Tests (3) | ✅ Pass |
| Android Debug Build | ✅ Pass |
| Bundle Analysis | ✅ Pass |
| ShellCheck | ✅ Pass |
| pnpm Audit | ✅ Pass |
| Validate Commits | ✅ Pass |
| GitLeaks | ✅ Pass |
| Apply Labels | ✅ Pass |
| CodeRabbit | ✅ Review complete |

## Learnings

- **`formatRelativeTime` uses `new Date()`**: Mocking `Date.now()` is insufficient — use `vi.useFakeTimers()` + `vi.setSystemTime()` to control current time in tests that call formatRelativeTime.
- **`vi.clearAllMocks()` doesn't restore original implementations**: Use `vi.restoreAllMocks()` or explicit `mockRestore()` to clean up `vi.spyOn` calls.
- **Global state in beforeEach/afterEach**: When tests mutate `globalThis.MessageChannel` or other globals, always save the original and restore it in `afterEach` to prevent cross-test contamination.
- **CodeRabbit nitpick items**: All were valid. The `useIterableCallbackReturn` lint suggestions are pre-existing patterns that don't fail CI; the `forEach((el) => el.remove())` pattern returns `void` so it doesn't trigger the rule.

## Validation

```bash
pnpm run typecheck    # ✅ clean
pnpm run lint         # ✅ 0 errors (78 files)
pnpm run test:unit    # ✅ 790 passed (47 files)
```

## Post-Merge Validation

| Check | Status |
|-------|--------|
| Quality Gate (post-merge) | ✅ Pass |
| Coverage (statements) | 80.19% ✅ |
| Coverage (branches) | 70.47% ✅ |
| Coverage (functions) | 82.07% ✅ |
| Coverage (lines) | 81.88% ✅ |
| TypeScript strict | ✅ Clean |
| Biome lint | ✅ 0 errors (78 files) |

*Last updated: 2026-05-13 (post-merge)*
