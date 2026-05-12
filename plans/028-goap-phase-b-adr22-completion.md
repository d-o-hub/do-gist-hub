# GOAP Plan — Phase B: ADR-022 Completion & Strict TypeScript Compliance

> **Status**: Completed  
> **Completed**: 2026-07-18  
> **Target**: 2026-07-25  
> **Methodology**: Goal-Oriented Action Planning (GOAP)  
> **Precondition**: All P0/P1 items resolved (Phase A / ADR-026 complete). 130/130 tests passing. 0 lint/type errors.

---

## Executive Summary

Phase A modernization (ADR-026) successfully resolved all P0/P1 gaps. The codebase is at peak health: zero open issues/PRs, full CI green, 130/130 unit tests passing, zero Biome lint errors.

This Phase B GOAP addresses the final P2/P3 items from:
- **ADR-022** (2026 UI Trends): Context-aware theming, container query expansion
- **ADR-007** (UX Modernization): Component-level responsive behavior beyond gist cards
- **TypeScript strictness mandate**: Eliminate the last two intentional `any` casts

All actions are scoped to preserve the current zero-error state. No single action exceeds 2 hours of work.

---

## 1. Goal Hierarchy

```
Phase B: ADR-022 Completion & Strict TS
├─ Goal 1: Eradicate Remaining `any` Types
│  ├─ Action 1.1: Refactor db.ts DBSchemaIndex
│  └─ Action 1.2: Refactor register-sw.ts SyncManager
├─ Goal 2: Expand Container Query Architecture
│  ├─ Action 2.1: Detail View @container adaptation
│  └─ Action 2.2: Settings & Offline Stats @container
├─ Goal 3: Context-Aware Auto-Theming
│  ├─ Action 3.1: Time-of-day theme engine
│  └─ Action 3.2: Settings UI for time-based mode
└─ Goal 4: Sensor-Based Adaptation Blueprint
   └─ Action 4.1: Document ambient light architecture
```

---

## 2. Action Plan

### Goal 1: Eradicate Remaining `any` Types

**Rationale**: Achieve 100% strict TypeScript 6 compliance. The two remaining `any` casts are the only Biome-allowed exceptions in the entire codebase.

#### Action 1.1: Refactor `db.ts` Index Type
- **File**: `src/services/db.ts` (line ~16)
- **Status**: ✅ **Already resolved** — `DBSchemaIndex` alias was removed in a prior PR. No `any` casts remain.

#### Action 1.2: Refactor `register-sw.ts` SyncManager
- **File**: `src/services/pwa/register-sw.ts` (line ~97)
- **Status**: ✅ **Already resolved** — `SyncManager` interface is properly defined locally and typed as `ServiceWorkerRegistration & { sync: SyncManager }`. No `any` cast remains.

### Goal 2: Expand Container Query Architecture

**Rationale**: ADR-007 mandates container queries for component-level responsive behavior. Currently only `gist-card` uses `@container`. Detail view, settings panels, and offline stats still rely solely on viewport media queries.

#### Action 2.1: Detail View Container Queries
- **Status**: ✅ **Completed** — Added `container-type: inline-size; container-name: detail-view` to `.gist-detail`. Added `@container detail-view (min-width: 500px)` for `.file-info-left` row layout and `@container detail-view (min-width: 700px)` for `.file-tabs` and `.file-content-area` wider layouts.
- **Files**: `src/styles/base.css`, `src/routes/gist-detail.ts`
- **Current**: `.file-info` uses flexbox but no container query; layout depends on viewport width
- **Target**:
  - Add `container-type: inline-size` to `.detail-header` or `.file-content-area` wrapper
  - Add `@container detail-view (min-width: 500px)` rule to flip `.file-info` from stacked column to inline row
  - Add `@container detail-view (min-width: 700px)` rule for wider file tab layouts
- **Priority**: P2
- **Complexity**: Medium (~1 hr)
- **Success Criteria**:
  - Detail view adapts to its container width, not just viewport
  - No visual regression at any breakpoint
  - Playwright tests (if any for detail view) still pass

#### Action 2.2: Settings & Offline Stats Container Queries
- **Status**: ✅ **Completed** — Added `container-type: inline-size; container-name: settings-panel` to `.settings-section` with `@container settings-panel (min-width: 400px)` for `.form-actions` row layout. Added `container-type: inline-size; container-name: offline-panel` to `.offline-stats` with `@container offline-panel (min-width: 400px)` for `.stat-card` padding adjustment.
- **Files**: `src/styles/base.css`, `src/routes/settings.ts`, `src/routes/offline.ts`
- **Current**: `.settings-section` and `.offline-stats` use viewport media queries only
- **Target**:
  - Add `container-type: inline-size` to `.settings-section` and `.offline-stats`
  - Convert viewport-dependent rules to `@container` equivalents
  - Ensure settings inputs and offline counters reflow correctly when rendered in narrower contexts (e.g., split view, drawer)
- **Priority**: P2
- **Complexity**: Medium (~1 hr)
- **Success Criteria**:
  - Settings and offline stats adapt to container width
  - No visual regression
  - Responsive screenshots (if tested) still pass

### Goal 3: Context-Aware Auto-Theming

**Rationale**: ADR-022 P3 calls for "context-aware theming beyond dark/light." Time-of-day auto-switching is the highest-value, lowest-risk implementation. Ambient light sensors are deferred to Goal 4 due to browser support and privacy concerns.

#### Action 3.1: Time-of-Day Theme Engine
- **Status**: ✅ **Completed** — Extended `src/tokens/design-tokens.ts` with `resolveTimeBasedTheme()` (dark 19:00–07:00), `resolveTheme()`, `getThemePreference()`, `setTheme()`, `initTheme()` with interval lifecycle management. Interval re-evaluates every 15 minutes and fires `app:theme-change` event when the resolved theme changes.
- **File**: `src/tokens/design-tokens.ts`
- **Current**: `getTheme()` returns `'light'` or `'dark'` based on `localStorage` or `prefers-color-scheme`
- **Target**:
  - Extend theme type to include `'time'`: `'light' | 'dark' | 'time'`
  - Add `resolveTimeBasedTheme()` function: dark between 19:00–07:00, light otherwise
  - Modify `getTheme()` to resolve `'time'` to the appropriate mode
  - Modify `initTheme()` to set up a timer/interval to re-evaluate `'time'` mode periodically (e.g., every 15 min or at the next threshold)
- **Priority**: P2
- **Complexity**: Medium (~1.5 hr)
- **Success Criteria**:
  - `setTheme('time')` works and stores `'time'` in localStorage
  - `getTheme()` returns `'light'` or `'dark'` even when stored preference is `'time'`
  - Theme switches automatically at 07:00 and 19:00 boundaries
  - No flash of unstyled content on page load

#### Action 3.2: Settings UI for Time-Based Mode
- **Status**: ✅ **Completed** — Added `<option value="time">Time-based (Dark 7PM–7AM)</option>` to settings theme select. Simplified event listener to store preference string and call `initTheme()`. `app.ts` now passes `getThemePreference()` to settings so the correct option is pre-selected (including `'time'`).
- **File**: `src/routes/settings.ts`
- **Current**: Theme `<select>` has options for `light` and `dark`
- **Target**:
  - Add `<option value="time">Time-based (Dark 7PM–7AM)</option>`
  - Update the change listener to call `setTheme('time')`
  - Update diagnostics/info display to show current resolved theme
- **Priority**: P2
- **Complexity**: Low (< 30 min)
- **Success Criteria**:
  - User can select time-based theme from settings
  - Selection persists across sessions
  - Diagnostics display shows correct resolved theme

### Goal 4: Sensor-Based Adaptation Blueprint

**Rationale**: Ambient light sensor theming is a high-effort, high-privacy-risk feature. It belongs in the backlog with a clear architecture document.

#### Action 4.1: Document Ambient Light Architecture
- **Status**: ✅ **Completed** — Document created at `plans/adr-022-ambient-light-extension.md`. Covers API overview (`AmbientLightSensor`, `Permissions API`), privacy considerations with user opt-in, fallback strategy to time-based mode, integration points in `design-tokens.ts`, and lux thresholds.
- **File**: `plans/adr-022-ambient-light-extension.md` (new)
- **Content**:
  - API overview: `AmbientLightSensor`, `Permissions API`
  - Privacy considerations: user opt-in required, data redaction
  - Fallback strategy: degrade to time-based if sensor unavailable
  - Integration point: extend `src/tokens/design-tokens.ts` with `resolveAmbientTheme(lux: number)`
  - Thresholds: < 50 lux → dark, 50–200 lux → dim, > 200 lux → light
- **Priority**: P3
- **Complexity**: High (planning only, ~1 hr)
- **Success Criteria**:
  - Document exists in `plans/`
  - References ADR-022 and this GOAP plan
  - Contains enough detail for a future implementer

---

## 3. Dependency Mapping

```
Phase 1: Types (Goal 1)
    ├─ Action 1.1 ──┐
    └─ Action 1.2 ──┴─→ pnpm run check ──→ merge

Phase 2: CSS (Goal 2)
    ├─ Action 2.1 ──┐
    └─ Action 2.2 ──┴─→ visual verification ──→ merge

Phase 3: Theming (Goal 3)
    ├─ Action 3.1 ──→ Action 3.2
    └─ Action 3.2 ──→ browser verification ──→ merge

Phase 4: Docs (Goal 4)
    └─ Action 4.1 ──→ standalone
```

**Key Rule**: Phases are sequential. Goal 1 must merge before Goal 2 begins. Goal 2 before Goal 3.

---

## 4. Validation Checklist

### Validation Results — Phase B Complete

- [x] `pnpm run check` — typecheck + lint + format:check (0 errors)
- [x] `pnpm run test:unit` — 162/162 passing across 12 test files (+32 new design-tokens tests)
- [x] `pnpm run test:browser` (modernization-verification) — 3/3 passed (container-type, sidebar, view-transitions)
- [x] Responsive screenshots — 6/6 passed (375px→1920px)
- [x] `./scripts/quality_gate.sh` — all gates pass
- [x] No `any` types introduced
- [x] No `eslint-disable` or `biome-ignore` comments added

---

## 7. Learnings & Compact Notes

### 7.1 Playwright Screenshot Test Configuration
**Learning**: `playwright.screenshots.config.ts` previously omitted a `webServer` block. Without it, the first screenshot test would occasionally pass (if a dev server happened to be running) but all subsequent tests failed with `ERR_CONNECTION_REFUSED` because Playwright did not manage the server lifecycle.
**Fix**: Added `webServer: { command: 'pnpm run dev', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI, timeout: 300_000 }` to `playwright.screenshots.config.ts`.
**Pattern to propagate**: Any standalone Playwright config that navigates to a local dev URL should include an explicit `webServer` block, even if the main `playwright.config.ts` already has one. Workers=1 screenshot suites are especially sensitive to server lifecycle because they share a single browser instance across sequential viewports.

### 7.2 Unit-Testing Interval-Based DOM Logic with Vitest
**Learning**: Testing `setInterval` theme re-evaluation required careful sequencing of `vi.useFakeTimers()` + `vi.setSystemTime()` + `vi.advanceTimersByTime()`.
**Pattern**: Mock `Date` via `vi.setSystemTime(new Date(2026, 0, 1, hour, 0, 0))` before calling interval-sensitive functions. After calling `initTheme()`, use `vi.advanceTimersByTime(900_000)` to trigger the interval callback, then assert on `document.documentElement.setAttribute` spy and `window.dispatchEvent` spy.
**Rediscovered pitfall**: `vi.spyOn(document.documentElement, 'setAttribute')` must be restored in `afterEach()` to avoid leaking spies into subsequent test suites.
**Refinement**: Use `vi.spyOn(globalThis, 'setInterval')` and `vi.spyOn(globalThis, 'clearInterval')` instead of `vi.getTimerCount()`, which counts ALL timers (including vitest internals) and produces fragile assertions. Use `vi.spyOn(globalThis, 'clearInterval')` to explicitly verify that old intervals are cleaned up when switching away from `'time'` mode.
**Refinement**: Mock `safeLog` / `safeError` from `src/services/security/logger` via `vi.mock()` at the top of the test file. Without this, `initDesignTokens()` triggers real logger calls that attempt IndexedDB persistence in jsdom, producing noisy `[Logger] Failed to persist log` stderr output that looks like test failures.

### 7.3 Module-Level State Persistence Across Test Files
**Learning**: `initDesignTokens()` uses a module-level `tokensLink` variable to enforce idempotency. When jsdom is recreated between test files, `tokensLink` still references the destroyed element from the previous jsdom instance. If a future test file imports `design-tokens.ts` and calls `initDesignTokens()`, the function returns early because `tokensLink` is truthy, but the element does not exist in the new document.
**Mitigation**: No other test files currently call `initDesignTokens()`. If this becomes a problem, either export a `__resetDesignTokensForTests()` helper or call `vi.resetModules()` in `afterAll`.

### 7.4 localStorage Stubbing in jsdom
**Learning**: Testing `setInterval` theme re-evaluation required careful sequencing of `vi.useFakeTimers()` + `vi.setSystemTime()` + `vi.advanceTimersByTime()`.
**Pattern**: Mock `Date` via `vi.setSystemTime(new Date(2026, 0, 1, hour, 0, 0))` before calling interval-sensitive functions. After calling `initTheme()`, use `vi.advanceTimersByTime(900_000)` to trigger the interval callback, then assert on `document.documentElement.setAttribute` spy and `window.dispatchEvent` spy.
**Rediscovered pitfall**: `vi.spyOn(document.documentElement, 'setAttribute')` must be restored in `afterEach()` to avoid leaking spies into subsequent test suites.

### 7.3 localStorage Stubbing in jsdom
**Learning**: Vitest's `jsdom` environment provides a real `localStorage` implementation, but it persists across tests within the same test file. Stubbing with `vi.stubGlobal('localStorage', { getItem: vi.fn(() => storedPreference), setItem: vi.fn((k, v) => { ... }) })` gives full control and avoids cross-test leakage.
**Pattern**: Store a module-level mutable `storedPreference: string | null` and update it inside the stubbed `setItem` / `removeItem`. Reset to `null` in `beforeEach`.

### 7.4 Container Query Verification via Playwright
**Learning**: Modernization-verification tests use `page.evaluate(() => window.getComputedStyle(el).containerType)` to assert `container-type: inline-size`. This is a reliable cross-browser check because Playwright's Chromium project computes the resolved container type correctly even when the element is dynamically rendered.
**Result**: `.gist-detail`, `.settings-section`, and `.offline-stats` all verified with this technique. No visual regressions detected across 6 responsive breakpoints.

---

## 5. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| IndexedDB type refactor breaks store operations | High | Low | Unit tests cover all store methods |
| Container query changes cause layout shift | Medium | Low | Visual regression tests, manual breakpoint check |
| Time-based theme causes FOUC on load | Medium | Low | Set theme before DOM render; use `data-theme` on `<html>` |
| CI commitlint failure (header too long) | Low | Medium | Keep headers ≤ 150 chars, body ≤ 200, footer ≤ 200 |

---

## 6. References

- ADR-022: 2026 UI Trends Integration Recommendations (`plans/adr-022-2026-ui-trends-recommendations.md`)
- ADR-007: UI/UX Modernization (`plans/adr-007-ui-ux-modernization.md`)
- ADR-026: Phase A Modernization GOAP (`plans/adr-026-phase-a-modernization-goap.md`)
- Progress Update 027 (`plans/027-progress-update-2026-07-18.md`)
- GOAP Analysis Current (`plans/026-goap-analysis-current.md`)

---

*Created: 2026-07-18. Status: Proposed.*
