# Coverage Improvement Plan

> **Date**: 2026-07-18  
> **Current Coverage**: Lines 35.6% — Target: 70%  
> **Related**: `vitest.config.ts`, `tests/unit/`, `plans/011-testing-strategy.md`

---

## Executive Summary

Unit test coverage currently stands at **35.6% lines** (target: 70%). The recent addition of `app.test.ts` (+195 lines) and `home.test.ts` (+237 lines) brought coverage up from ~24.7%. This plan prioritizes the remaining uncovered files by impact and effort.

---

## Current Coverage by Area

| Area | Est. Coverage | Lines | Priority |
|------|--------------|-------|----------|
| `src/tokens/` | ~95% | ~300 | 🟢 Good |
| `src/services/db.ts` | ~81% | ~250 | 🟢 Good |
| `src/services/github/client.ts` | ~75% | ~394 | 🟢 Good |
| `src/services/security/` | ~60% | ~200 | 🟡 Medium |
| `src/services/lifecycle.ts` | ~70% | ~50 | 🟢 Good |
| `src/stores/gist-store.ts` | ~45% | ~300 | 🟡 Medium |
| `src/services/sync/` | ~25% | ~150 | 🔴 High |
| `src/components/app.ts` | ~15% (new) | ~366 | 🔴 High |
| `src/routes/home.ts` | ~10% (new) | ~167 | 🔴 High |
| `src/components/ui/` | ~0% | ~800 | 🔴 Critical |
| `src/routes/` (other) | ~0% | ~250 | 🔴 Critical |
| `src/main.ts` | ~0% | ~50 | 🟡 Medium |
| Other components | ~0% | ~500 | 🔴 High |

---

## Phase 1: High-Impact Files (Est. +15% coverage)

These files are large and critical to the app's core functionality. Testing them provides the biggest coverage gain.

### 1. `src/components/ui/` (8 files, ~800 lines total)
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

### 2. `src/services/sync/` (2 files, ~150 lines total)
| File | Lines | Strategy |
|------|-------|----------|
| `queue.ts` | ~100 | Already partially tested via `sync-queue.test.ts`, add edge cases (empty queue, failed operations) |
| `conflict-detector.ts` | ~50 | Already partially tested, add diff scenarios |

**Effort**: Low (1 agent round)  
**Coverage gain**: ~2-3%

### 3. `src/routes/` (other, ~250 lines)
| File | Lines | Strategy |
|------|-------|----------|
| `gist-detail.ts` | ~60 | Test render with/without gistId, skeleton display, scroll-progress bar |
| `settings.ts` | ~80 | Test theme switching, token display, navigation |
| `create.ts` | ~60 | Test form rendering, file add/remove |
| `offline.ts` | ~50 | Test offline status display, sync queue listing |

**Effort**: Medium (2 agent rounds)  
**Coverage gain**: ~4-5%

---

## Phase 2: Low-Hanging Fruit (Est. +5% coverage)

These files are smaller and have simpler logic.

### 4. `src/services/security/` (remaining)
- `logger.ts` (~120 lines) — Test log levels, redaction patterns
- `dom.ts` (~30 lines) — Already tested via `security-dom.test.ts`
- Plus edge cases for existing tests

**Effort**: Low (1 agent round)  
**Coverage gain**: ~2-3%

### 5. `src/main.ts` (~50 lines)
- Test app initialization, global error handler, PWA registration
- Requires mocking imports (lifecycle, route initialization)

**Effort**: Low (1 agent round)  
**Coverage gain**: ~1%

---

## Phase 3: Component Tests (Est. +15% coverage)

These are the remaining UI components.

### 6. `src/components/` (remaining)
| File | Lines | Strategy |
|------|-------|----------|
| `gist-card.ts` | ~80 | Test card rendering with various data, favorite toggle, click |
| `gist-edit.ts` | ~100 | Test form rendering, validation, save/cancel |
| `conflict-resolution.ts` | ~80 | Test conflict display, resolve options |

**Effort**: Medium (2 agent rounds)  
**Coverage gain**: ~5-8%

---

## Summary Roadmap

```
Phase 1 (now - +15%)    Phase 2 (+5%)     Phase 3 (+15%)
┌─────────────────┐    ┌────────────┐    ┌─────────────────┐
│ src/components/ │───▶│ security/  │───▶│ src/components/ │
│ ui/ (~800 lines)│    │ (~150 ln)  │    │ (~260 lines)    │
├─────────────────┤    ├────────────┤    ├─────────────────┤
│ src/routes/     │    │ src/main   │    │ Additional edge │
│ (~250 lines)    │    │ (~50 ln)   │    │ cases           │
├─────────────────┤    └────────────┘    └─────────────────┘
│ src/sync/       │         │                    │
│ (~150 lines)    │         ▼                    ▼
└─────────────────┘    Current: 35.6%    Target: >70%
```

**Total estimated gain**: ~35% → **~70%**

---

## Implementation Notes

- **Follow existing patterns**: Use `vi.mock`, `vi.fn`, `jsdom` environment (already configured)
- **CSS.supports issue**: Fixed in `src/routes/gist-detail.ts` — add `typeof CSS !== 'undefined'` guard
- **IndexedDB logger errors**: Pre-existing issue with logger persistence in test environment — not blocking coverage
- **Coverage thresholds**: Current config requires 70% lines/functions, 60% branches. Consider a stepped approach (e.g., 40% → 50% → 70%) to avoid blocking CI
