# GOAP Gap Analysis — Current State

> Analysis date: 2026-07-18 (follow-up to 025-progress-update)
> Methodology: ADR-vs-implementation gap audit, codebase search, CI status check

## Executive Summary

**Overall Health: 🟡 Good — 1 CI failure (non-blocking), 0 type/lint errors, 130/130 tests passing. 4 P0/P1 items remain, plus dead code and integration gaps.**

---

## 1. GitHub Status

| Check | Result |
|-------|--------|
| Open Issues | **0** — no open issues |
| Open PRs | **0** — no open PRs |
| Recent merges | `main` is clean, last merge was PR #145 |

---

## 2. CI/CD Status

| Workflow | Status |
|----------|--------|
| Quality Gate | ✅ Pass |
| Playwright Tests (3 shards) | ✅ Pass (last run) |
| Android Debug Build | ✅ Pass |
| Bundle Analysis | ✅ Pass |
| Visual Regression (main only) | ✅ Pass |
| **Commitlint** | ❌ **1 failure on `main`** |

### Commitlint Failure Detail

**Failing commit**: `fix: resolve ADR-026 GOAP actions — activate global error handler, refactor ErrorBoundary/EmptyState (noStaticOnlyClass), wire AbortController lifecycle cleanup`

**Error**: `header-max-length` — header is 160 characters, exceeding the 150-char limit.

**Impact**: Non-blocking. The commit is already merged. This is a past violation that won't re-trigger on new commits. No action required unless the repo policy requires rewriting history.

---

## 3. Current Validation State

```bash
pnpm run check        # ✅ typecheck + lint + format:check — all pass (78 files)
pnpm run test:unit    # ✅ 130 passed (11 files)
./scripts/quality_gate.sh  # ✅ All gates passed
```

---

## 4. GOAP: Completed Actions (since 025-progress-update)

| ID | Action | ADR | Status |
|----|--------|-----|--------|
| P0-2 | Activate global error handling | ADR-006 | ✅ `initGlobalErrorHandling()` called in `src/main.ts:30` |
| P0-3 | Wire AbortController lifecycle | ADR-009 | ✅ `lifecycle.cleanupRoute()` called in `app.ts:navigate()` |
| P1-1 | Refactor ErrorBoundary | ADR-026 | ✅ Class → object literal (`export const ErrorBoundary = { render, bindEvents }`) |
| P1-2 | Refactor EmptyState | ADR-026 | ✅ Class → object literal (`export const EmptyState = { render }`) |
| P1-3 | Resolve Biome warnings | ADR-026 | ✅ 0 warnings |

---

## 5. GOAP: Remaining P0/P1 Items

### P0-1: Fix Playwright Navigation Test Failures 🟢 LIKELY RESOLVED

**Updated finding**: All 5 most recent CI workflow runs show `completed / success`, including the Playwright Tests job (3 shards). The last confirmed failure was pre-025 (before the CSS display fix was applied).

**Recommendation**: Mark as resolved unless a new CI failure surfaces. The 025 progress update applied CSS fixes that likely addressed the root cause (`display:none` not overridden in test viewport).

**Note**: Cannot verify locally — no Chromium installed. CI is green as of the latest runs.

### P1-4: Remove TS6 `ignoreDeprecations` and Fix `baseUrl` 🟡

**Current `tsconfig.json`**:
```json
"ignoreDeprecations": "6.0",
"baseUrl": ".",
"paths": {
  "@/*": ["src/*"],
  "@tokens/*": ["src/tokens/*"],
  "@components/*": ["src/components/*"],
  "@services/*": ["src/services/*"]
}
```

- `baseUrl` is deprecated in TypeScript 6; should migrate to `paths` with explicit `./src/` prefixes
- `ignoreDeprecations: "6.0"` actively suppresses TS6 deprecation warnings
- The `@/*` path aliases are used throughout the codebase — migration must update all imports

### P1-5: Build RouteBoundary Component 🟡

**ADR-006 (Global Error Handling)** specifies a layered error strategy:
- `ErrorBoundary` — per-component error fallback (✅ built)
- `AsyncErrorBoundary` — for lazy-loaded routes (❌ not built)
- `RouteBoundary` — for route-level error isolation (❌ not built)

The `RouteBoundary` would wrap each route's rendering in the `app.ts` switch statement, catching errors from lazy-loaded route modules.

### P1-6: Wire Skeleton Component into Route Rendering 🟡

**Problem**: `src/components/ui/skeleton.ts` exports `Skeleton.renderCard()`, `Skeleton.renderList()`, and `Skeleton.renderDetail()`. The component is **never imported** anywhere in the application.

**Current state**: `src/routes/home.ts` builds inline skeleton HTML strings directly:
```typescript
// In renderGistList(), line 67-80
return Array(3).fill('').map(() => `
  <div class="gist-card skeleton">
    <div class="loading-skeleton" style="height:20px;width:80%;..."></div>
    ...
  </div>
`).join('');
```

**Fix**: Replace inline skeleton strings with `Skeleton.renderList(3)` in `home.ts`, and use `Skeleton.renderDetail()` in `gist-detail.ts`.

### P1-7: Add "Conflicts" to Bottom Navigation 🟡

**Current bottom nav** (in `app.ts:render()`): Home, Starred, Create, Offline

**Missing**: "Conflicts" entry. The conflict resolution route exists and is accessible via command palette, but has no bottom-nav entry.

---

## 6. NEW: Integration Gaps Discovered

### Dead Code: 3 Files Never Imported

| File | Exports | Imported By |
|------|---------|-------------|
| `src/stores/ui-store.ts` | `uiStore` (reactive theme/route/toast/palette state) | **Nothing** |
| `src/stores/auth-store.ts` | `authStore` (reactive auth state) | **Nothing** |
| `src/components/ui/skeleton.ts` | `Skeleton` (card/list/detail placeholders) | **Nothing** |

### State Duplication: `app.ts` vs Stores

`app.ts` manages its own internal state (`currentRoute`, theme from localStorage) instead of using the reactive stores:

```typescript
// app.ts — manages state directly
private currentRoute: Route = 'home';
// theme managed via localStorage + DOM attribute directly
const savedTheme = localStorage.getItem('theme-preference') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
```

`ui-store.ts` has a full reactive system (`subscribe`, `navigate()`, `setTheme()`, `showToast()`) — all unused.

**Recommendation**: Either:
- (A) Wire `app.ts` to use `ui-store` for state management (preferred — follows architecture)
- (B) Remove `ui-store.ts` and `auth-store.ts` as dead code

### Toast Usage: ✅ Actually Wired

Contrary to the 025 gap report, `ToastManager` IS used across routes:
- `src/routes/settings.ts` — 7 calls (`toast.success`, `toast.error`)
- `src/routes/create.ts` — 6 calls
- `src/components/gist-edit.ts` — 7 calls
- `src/components/gist-detail.ts` — 4 calls
- `src/components/gist-card.ts` — 1 call
- `src/components/conflict-resolution.ts` — 2 calls

**Verdict**: Toast integration gap from 025 is **resolved**.

---

## 7. TypeScript Strictness Audit

### `any` Usage in Source (2 instances)

| File | Line | Code | Notes |
|------|------|------|-------|
| `src/services/db.ts` | 16 | `type DBSchemaIndex = any;` | Has `eslint-disable-next-line` comment |
| `src/services/pwa/register-sw.ts` | 97 | `(registration as any).sync` | Has `eslint-disable-next-line` comment |

Both are intentional with disable comments. Low priority but contradicts ADR strict-types guideline.

---

## 8. ADR Implementation Status Summary

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Reuse Gemini Token System | ✅ Implemented |
| ADR-002 | Web-First PWA + Capacitor | ✅ Implemented |
| ADR-003 | IndexedDB v1 | ✅ Implemented |
| ADR-004 | Fine-Grained PAT | ✅ Implemented |
| ADR-005 | No Backend | ✅ Implemented |
| ADR-006 | Global Error Boundary | 🟡 Partial — RouteBoundary/AsyncErrorBoundary missing |
| ADR-007 | CSP + Logging Redaction | ✅ Implemented |
| ADR-007 UX | UI/UX Modernization | 🟡 Partial — container queries unused, 3/7 breakpoints used |
| ADR-008 | Web Vitals Budgets | ✅ Implemented |
| ADR-009 | AbortController Lifecycle | ✅ Implemented (wired in 025) |
| ADR-010 | SW Cache Name Derivation | ✅ Implemented |
| ADR-011 | Unit Testing (Vitest) | ✅ Implemented |
| ADR-012 | Pre-commit Workflow | ✅ Implemented |
| ADR-013 | Request Deduplication | ✅ Implemented |
| ADR-014 | Exponential Backoff Sync | ✅ Implemented |
| ADR-015 | CI Node24 + Android | ✅ Implemented |
| ADR-016 | GitHub API Efficiency | ✅ Implemented |
| ADR-020 | Swarm Audit Phase A | 🟡 Partial — hardcoded CSS values persist (nav tests now passing per CI) |
| ADR-021 | Merge Strategy | ✅ Implemented |
| ADR-022 | 2026 UI Trends | 🟡 Partial — dark mode + fonts done; bento, spring, scroll animations, context-aware theming pending |
| ADR-026 | Phase A Modernization GOAP | 🟡 Partial — P1-4 through P1-7 remain |

---

## 9. NEW: Configuration Issues Discovered

### 9.1 `playwright.config.ts` Uses `npm` Instead of `pnpm`

```typescript
// playwright.config.ts:131
webServer: {
  command: 'npm run dev',  // ❌ should be 'pnpm run dev'
  ...
}
```

This violates the project's pnpm-only policy (AGENTS.md: "Use `pnpm` exclusively. No `npm`."). On CI runners without npm fallback, this would fail to start the dev server. Likely works on GitHub Actions runners because `npm` is pre-installed, but it's a latent bug.

**Fix**: Change to `pnpm run dev`.

### 9.2 `biome.json` Masks `noStaticOnlyClass`

```json
// biome.json — complexity section
"noStaticOnlyClass": "off"
```

This rule is disabled globally. Since ErrorBoundary and EmptyState have been refactored (P1-1, P1-2), there should be no remaining static-only classes. The rule could be re-enabled to prevent regressions.

**Recommendation**: Re-enable `noStaticOnlyClass` and verify lint passes.

### 9.3 Skeleton CSS Classes Exist ✅

Verified that `.loading-skeleton` (in `base.css:595` and `motion.css:186`) and `.skeleton-card` (in `base.css:607`) are defined. Wiring `Skeleton.renderList()` in `home.ts` will produce styled output. This removes a dependency concern from P1-6.

---

## 10. Recommended Action Priority

### Immediate (this cycle — low effort, high impact)
1. **Config fix**: `npm run dev` → `pnpm run dev` in `playwright.config.ts` (1 line)
2. **P1-6**: Wire Skeleton component → eliminates dead code + improves consistency (CSS verified)
3. **P1-7**: Add Conflicts to bottom-nav → completes navigation
4. **Re-enable `noStaticOnlyClass`** in biome.json → prevents regressions

### Next cycle
5. **P1-4**: TS6 `baseUrl` migration (medium effort, ~30 files to update)
6. **P0-1**: Mark resolved; monitor CI for regression

### Backlog
7. **P1-5**: Build RouteBoundary component
8. **Dead code decision**: Wire or remove `ui-store`/`auth-store`
9. **ADR-022**: Bento grid, spring physics, scroll-driven animations
10. **ADR-007 UX**: Full 7-breakpoint responsive system, container queries

---

## 10. Files Changed Since 025

No files changed in this analysis cycle (analysis-only pass).

*Last updated: 2026-07-18 (v2 — reviewer corrections applied)*
