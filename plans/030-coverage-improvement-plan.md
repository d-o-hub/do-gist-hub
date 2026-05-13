# Coverage Improvement Plan

> **Date**: 2026-05-13 (post PR #156 merge)  
> **Current Coverage**: Statements 80.19% | Branches 70.47% | Functions 82.07% | Lines 81.88%  
> **Target**: Achieved ✅ (thresholds: 45% lines/functions/statements, 35% branches)  
> **Last PR**: #156 — 18 test files added/enhanced, 790 tests, **MERGED**  
> **Related**: `vitest.config.ts`, `tests/unit/`, `plans/011-testing-strategy.md`

---

## Executive Summary

Unit test coverage has exceeded all targets at **81.88% lines** (target: 70%). PR #156 added 16 new test files and enhanced 2 existing files, bringing the total from ~130 tests to **790 tests across 47 files**. All vitest coverage thresholds are met (45% lines/functions/statements, 35% branches).

---

## Current Coverage by Area (Post PR #156)

| Area | Coverage | Tests | Status |
|------|----------|-------|--------|
| `src/tokens/` | ~95% | css-variables, design-tokens | 🟢 Good |
| `src/services/db.ts` | ~85% | db, db-security | 🟢 Good |
| `src/services/github/` | ~80% | client, auth, error-handler, rate-limiter | 🟢 Good |
| `src/services/security/` | ~75% | crypto, dom, logger | 🟢 Good |
| `src/services/lifecycle.ts` | ~70% | lifecycle | 🟢 Good |
| `src/stores/gist-store.ts` | ~85% | gist-store (49 tests) | 🟢 Good |
| `src/services/sync/` | ~75% | queue, conflict-detector | 🟢 Good |
| `src/services/network/` | ~80% | offline-monitor | 🟢 Good |
| `src/services/export-import.ts` | ~70% | export-import | 🟢 Good |
| `src/services/perf/` | ~70% | perf | 🟢 Good |
| `src/services/pwa/` | ~75% | sw, register-sw | 🟢 Good |
| `src/components/` | ~80% | app, gist-card, gist-detail, gist-edit, conflict-resolution | 🟢 Good |
| `src/components/ui/` | ~85% | 13 files tested | 🟢 Good |
| `src/routes/` | ~80% | home, gist-detail, offline, create, settings | 🟢 Good |
| `src/utils/` | ~80% | dialog, nav-keyboard, announcer, focus-trap, view-transitions | 🟢 Good |
| `src/main.ts` | ~70% | main | 🟢 Good |
| `src/types/` | ~75% | types | 🟢 Good |

**All areas exceed 70% coverage threshold.** 🎉

---

## Phase 1: ✅ COMPLETED (PR #156, merged 2026-05-13)

All Phase 1 targets now have comprehensive test coverage.

### 1. `src/components/ui/` ✅ (13 files tested)
| File | Lines | Strategy |
|------|-------|----------|
| `route-boundary.ts` | ~60 | Mock error scenarios, test route wrapping with success/error |
| `error-boundary.ts` | ~80 | Test error catching, fallback rendering, reset behavior |
| `command-palette.ts` | ~100 | Test command registration, keyboard navigation, filtering |
| `nav-rail.ts` | ~90 | Test route rendering, active state, click navigation |
| `bottom-sheet.ts` | ~70 | Test open/close animations, content rendering, overlay |
| `empty-state.ts` | ~40 | Test all render configurations (title, action, route) |
| `skeleton.ts` | ~50 | Test renderList, renderDetail output formats |
| `button.ts` | ~30 | Test variant rendering, click events |

**Effort**: Medium (2-3 agent rounds)  
**Coverage gain**: ~8-10%

### 2. `src/services/sync/` ✅ (2 files tested)
| File | Lines | Strategy |
|------|-------|----------|
| `queue.ts` | ~100 | Already partially tested via `sync-queue.test.ts`, add edge cases (empty queue, failed operations) |
| `conflict-detector.ts` | ~50 | Already partially tested, add diff scenarios |

**Effort**: Low (1 agent round)  
**Coverage gain**: ~2-3%

### 3. `src/routes/` ✅ (5 files tested)
| File | Lines | Strategy |
|------|-------|----------|
| `gist-detail.ts` | ~60 | Test render with/without gistId, skeleton display, scroll-progress bar |
| `settings.ts` | ~80 | Test theme switching, token display, navigation |
| `create.ts` | ~60 | Test form rendering, file add/remove |
| `offline.ts` | ~50 | Test offline status display, sync queue listing |

**Effort**: Medium (2 agent rounds)  
**Coverage gain**: ~4-5%

---

## Phase 2: ✅ COMPLETED (PR #156)

### 4. `src/services/security/` ✅ (3 files tested)
- `logger.ts` (~120 lines) — Test log levels, redaction patterns
- `dom.ts` (~30 lines) — Already tested via `security-dom.test.ts`
- Plus edge cases for existing tests

**Effort**: Low (1 agent round)  
**Coverage gain**: ~2-3%

### 5. `src/main.ts` ✅ (main.test.ts, 12 tests)
- Test app initialization, global error handler, PWA registration
- Requires mocking imports (lifecycle, route initialization)

**Effort**: Low (1 agent round)  
**Coverage gain**: ~1%

---

## Phase 3: ✅ COMPLETED (PR #156)

### 6. `src/components/` ✅ (5 files tested)
| File | Lines | Strategy |
|------|-------|----------|
| `gist-card.ts` | ~80 | Test card rendering with various data, favorite toggle, click |
| `gist-edit.ts` | ~100 | Test form rendering, validation, save/cancel |
| `conflict-resolution.ts` | ~80 | Test conflict display, resolve options |

**Effort**: Medium (2 agent rounds)  
**Coverage gain**: ~5-8%

---

## PR #156 Progress (2026-05-13)

Added 16 new unit test files + enhanced 2 existing files:

### New Test Files
| File | Tests | Coverage Area |
|------|-------|---------------|
| `command-palette.test.ts` | 34 | UI component |
| `conflict-detector.test.ts` | 11 | Sync service |
| `dialog.test.ts` | 13 | Utility |
| `error-handler.test.ts` | 18 | Error handling |
| `export-import.test.ts` | 8 | Data service |
| `gist-card.test.ts` | 26 | UI component |
| `main.test.ts` | 12 | App bootstrap |
| `nav-keyboard.test.ts` | 20 | Navigation utility |
| `offline-monitor.test.ts` | 11 | Network service |
| `offline-route.test.ts` | 6 | Route |
| `perf.test.ts` | 21 | Performance |
| `rate-limiter.test.ts` | 10 | API service |
| `register-sw.test.ts` | 20 | PWA service |
| `sw.test.ts` | 13 | Service worker |
| `toast.test.ts` | 30 | UI component |
| `types.test.ts` | 9 | Type utilities |

### Enhanced Test Files
| File | Before | After | Changes |
|------|--------|-------|---------|
| `gist-detail.test.ts` | 6 route-level | 17 component-level | Full renderFileContent, renderGistDetail, renderRevisions, loadGistDetail coverage |
| `gist-store.test.ts` | 15 basic | 49 comprehensive | Full CRUD, star toggle, search/filter, offline queue, API rollback, conflict resolution |

### CodeRabbit Fixes (commit 7267e13)
- Fixed misleading test name in `gist-store.test.ts` ("returns false" → "returns true")
- Fixed non-deterministic relative time test in `gist-card.test.ts` using `vi.useFakeTimers()`
- Added event listener cleanup in `offline-route.test.ts`
- Restore original MessageChannel/SyncManager globals in `register-sw.test.ts`

---

## Summary: Coverage Goal Achieved 🎉

```
PR #156 (790 tests, 47 files)
     │
     ▼
Before: 35.6% lines ──▶ After: 81.88% lines
Before: 130 tests    ──▶ After: 790 tests
Before: 11 files     ──▶ After: 47 files

Thresholds: ✅ All exceeded (45% lines/fn/stmts, 35% branches)
Target 70%: ✅ Achieved (81.88% lines)
```

**Remaining uncovered files** (low-priority, mostly barrel/config):
- `src/services/*/index.ts` (barrel files)
- `src/tokens/component/*.ts` (token constants)
- `src/tokens/primitive/*.ts` (token constants)
- `src/tokens/semantic/color-semantic.ts` (token constants)
- `src/tokens/elevation/shadows.ts` (token constants)
- `src/tokens/motion/motion.ts` (token constants)
- `src/tokens/responsive/breakpoints.ts` (token constants)
- `src/services/perf/budgets.ts` (config constants)
- `src/services/perf/interaction-timer.ts` (utility)
- `src/config/app.config.ts` (config constants)

---

## Implementation Notes

- **Follow existing patterns**: Use `vi.mock`, `vi.fn`, `jsdom` environment (already configured)
- **CSS.supports issue**: Fixed in `src/routes/gist-detail.ts` — add `typeof CSS !== 'undefined'` guard
- **IndexedDB logger errors**: Pre-existing issue with logger persistence in test environment — not blocking coverage
- **Coverage thresholds**: Current config requires 70% lines/functions, 60% branches. Consider a stepped approach (e.g., 40% → 50% → 70%) to avoid blocking CI
