# GOAP Gap Analysis — Current State

> Analysis date: 2026-07-18 (follow-up to 025-progress-update, updated after PR #146 + #147 merges)
> Methodology: ADR-vs-implementation gap audit, codebase search, CI status check

## Executive Summary

**Overall Health: 🟢 Strong — 0 CI failures, 0 type/lint errors, 130/130 tests passing. All P1 items resolved. 3 ADRs remain partially implemented (lower-priority UX/visual items).**

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

**Status**: ✅ Resolved. Subsequent commits comply. This was a one-time violation on an already-merged commit. No CI failures remain.

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

## 5. GOAP: Remaining P0/P1 Items — ALL RESOLVED ✅

All P1 items from the 026 analysis have been completed and merged (PR #146, PR #147, direct commit `04bae14`):

| ID | Action | ADR | Status | Merged |
|----|--------|-----|--------|--------|
| P0-1 | Fix Playwright Navigation Test Failures | ADR-020 | ✅ CI green across all runs | PR #145 |
| P1-4 | Remove TS6 `ignoreDeprecations`, fix `baseUrl` | ADR-026 | ✅ Done | PR #146 |
| P1-5 | Build RouteBoundary component | ADR-006 | ✅ Done | PR #146 |
| P1-6 | Wire Skeleton into route rendering (`home.ts` + `gist-detail.ts`) | ADR-026 | ✅ Done | PR #146 + `04bae14` |
| P1-7 | Add "Conflicts" to bottom nav + all nav surfaces | ADR-026 | ✅ Done | PR #146 |
| — | Add skeleton detail CSS layout | ADR-026 | ✅ Done | PR #147 |

---

## 6. Resolved Integration Gaps

### Skeleton Component: ✅ Wired

`Skeleton.renderList(3)` used in `src/routes/home.ts` and `Skeleton.renderDetail()` used in `src/routes/gist-detail.ts`. CSS layout for skeleton detail classes added to `src/styles/base.css`.

### Dead Code: ✅ Removed

| File | Exports | Disposition |
|------|---------|-------------|
| `src/stores/ui-store.ts` | `uiStore` | **Deleted** — dead code, zero imports |
| `src/stores/auth-store.ts` | `authStore` | **Deleted** — dead code, zero imports |

### Config Issues: ✅ Fixed

| Issue | Fix |
|-------|-----|
| `playwright.config.ts` used `npm run dev` | Changed to `pnpm run dev` |
| `biome.json` had `noStaticOnlyClass: "off"` | Re-enabled to `"error"` |
| `tsconfig.json` had `ignoreDeprecations: "6.0"` + `baseUrl` | Removed; paths updated to `./src/*` |

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
| ADR-006 | Global Error Boundary | ✅ Implemented — RouteBoundary built (PR #146) |
| ADR-007 | CSP + Logging Redaction | ✅ Implemented |
| ADR-007 UX | UI/UX Modernization | 🟡 Partial — 3 lower-priority items remain (P3: context-aware theming, container queries expansion, scroll-driven refinements) |
| ADR-008 | Web Vitals Budgets | ✅ Implemented |
| ADR-009 | AbortController Lifecycle | ✅ Implemented |
| ADR-010 | SW Cache Name Derivation | ✅ Implemented |
| ADR-011 | Unit Testing (Vitest) | ✅ Implemented |
| ADR-012 | Pre-commit Workflow | ✅ Implemented |
| ADR-013 | Request Deduplication | ✅ Implemented |
| ADR-014 | Exponential Backoff Sync | ✅ Implemented |
| ADR-015 | CI Node24 + Android | ✅ Implemented |
| ADR-016 | GitHub API Efficiency | ✅ Implemented |
| ADR-020 | Swarm Audit Phase A | ✅ Implemented — nav tests passing, CSS token coverage expanded |
| ADR-021 | Merge Strategy | ✅ Implemented |
| ADR-022 | 2026 UI Trends | 🟡 Partial — spring physics, scroll animations, bento grid done. 3 P3 items remain (context-aware theming, advanced scroll effects, sensor-based adaptations) |
| ADR-026 | Phase A Modernization GOAP | ✅ All P1 items resolved (PR #146, #147, `04bae14`) |

---

## 9. Configuration Issues — ALL RESOLVED ✅

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

### Immediate (next cycle)
1. **P3 items from ADR-022**: Context-aware theming, advanced scroll effects (sensor-based, opt-in)
2. **P3 items from ADR-007 UX**: Container query expansion, breakpoint refinements
3. **TypeScript strictness**: Replace `any` in `db.ts` and `register-sw.ts` (both have lint-disable comments)

### Done (this cycle)
✅ All P1 items resolved (PR #146, #147, `04bae14`)
✅ Config issues fixed (`playwright.config.ts`, `biome.json`, `tsconfig.json`)
✅ Dead code removed (`ui-store.ts`, `auth-store.ts`)
✅ Skeleton component wired in both `home.ts` and `gist-detail.ts`
✅ RouteBoundary built and wrapping all 7 routes
✅ Conflicts added to all 4 navigation surfaces

---

## 10. Files Changed Since 025

### PR #146 (P1-4 through P1-7)
| File | Change |
|------|--------|
| `tsconfig.json` | Remove `ignoreDeprecations` + `baseUrl`; update `paths` to `./src/*` |
| `playwright.config.ts` | `npm run dev` → `pnpm run dev` |
| `biome.json` | `noStaticOnlyClass: "off"` → `"error"` |
| `src/components/ui/route-boundary.ts` | **New** — Route-level error isolation with retry |
| `src/components/ui/error-boundary.ts` | Import `sanitizeHtml` from security; remove local `escapeHtml` |
| `src/components/app.ts` | Import RouteBoundary; wrap all 7 route cases; add Conflicts nav |
| `src/components/ui/nav-rail.ts` | Add Conflicts to NAV_ITEMS |
| `src/routes/home.ts` | Import Skeleton; replace inline HTML with `Skeleton.renderList(3)` |
| `tests/mobile/responsive.spec.ts` | Nav item count 4 → 5 |
| `src/stores/ui-store.ts` | **Deleted** |
| `src/stores/auth-store.ts` | **Deleted** |

### Direct commit `04bae14` (Skeleton detail wiring)
| File | Change |
|------|--------|
| `src/routes/gist-detail.ts` | Import Skeleton; show `Skeleton.renderDetail()` as loading state |

### PR #147 (Skeleton detail CSS)
| File | Change |
|------|--------|
| `src/styles/base.css` | Add `.gist-detail-skeleton`, `.skeleton-header`, `.skeleton-content`, `.skeleton-code-lines`, `.skeleton-code-line`, `.skeleton-file-tab` layout rules |

*Last updated: 2026-07-18*
