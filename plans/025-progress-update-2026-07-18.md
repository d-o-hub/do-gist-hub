# Progress Update — 2026-07-18

## Summary

Comprehensive GOAP-based gap analysis of all ADRs vs. implementation, followed by P0/P1 fixes for ADR-026 GOAP actions and critical integration gaps.

## Gap Analysis Findings

### Implemented (11 ADRs)
ADR-004 (PAT), ADR-005 (No Backend), ADR-007 (CSP/Logging), ADR-008 (Web Vitals), ADR-010 (SW Cache Names), ADR-012 (Pre-commit), ADR-013 (Request Dedup), ADR-014 (Exponential Backoff), ADR-015 (CI Node24), ADR-016 (API Efficiency), ADR-011 (Unit Testing infra).

### Partial (6 ADRs)
ADR-006 (Error Boundary): RouteBoundary/AsyncErrorBoundary not built. `initGlobalErrorHandling()` defined but never called.
ADR-007 UX (Modernization): 7 breakpoints defined but only 3 used. Container queries declared but zero @container rules.
ADR-009 (AbortController): Global controller exists but route-level cleanup never called from app.ts.
ADR-022 (UI Trends): Dark mode + variable fonts done. Bento grid, spring physics, scroll-driven animations, context-aware theming all pending.
ADR-020 (Swarm Audit): Nav tests still failing on CI. Hardcoded CSS values persist.
ADR-026 (GOAP Actions): ErrorBoundary/EmptyState refactor not done. TS6 deprecation suppression still active.

### Integration Gaps
- `ui-store.ts` and `auth-store.ts` exist but `app.ts` manages its own state
- `ToastManager` exists but never called from routes for CRUD feedback
- `lifecycle.cleanupRoute()` exists but never called during navigation
- Skeleton component exists but never used in route rendering
- Export/import service exists but no settings UI

## P0/P1 Fixes Applied (this commit)

### P0-2: Activate Global Error Handling
- `src/main.ts`: Imported and called `initGlobalErrorHandling()`.
- Uncaught exceptions and unhandled rejections now caught and logged.

### P0-3: Wire AbortController Lifecycle Cleanup
- `src/components/app.ts`: Imported `lifecycle` and called `cleanupRoute()` at start of `navigate()`.
- Guarded with `!isSameRoute` to preserve in-flight work on same-route re-entry.
- Cancels in-flight fetch requests from previous route, creates fresh AbortController.

### P1-1: Refactor ErrorBoundary (ADR-026 Action 1)
- `src/components/ui/error-boundary.ts`: `export class ErrorBoundary` → `export const ErrorBoundary = { render, bindEvents }`.
- `getIcon()` and `escapeHtml()` moved to module-level functions.
- Fixes Biome `noStaticOnlyClass` violation.

### P1-2: Refactor EmptyState (ADR-026 Action 1)
- `src/components/ui/empty-state.ts`: `export class EmptyState` → `export const EmptyState = { render }`.
- All 3 callers (home.ts, offline.ts, conflict-resolution.ts) use `EmptyState.render()` — no API change needed.
- Fixes Biome `noStaticOnlyClass` violation.

## Subsequent Fixes (post-2026-07-18)

### Commitlint Footer Line Length + Type Safety
- `commitlint.config.mjs`: Added `footer-max-line-length: [2, 'always', 200]` to prevent CI failures when commitlint body lines are parsed as footer lines (was default 100).
- `AGENTS.md`: Documented commit line limits (header 150, body 200, footer 200) and added commit-msg hook installation instructions.
- `package.json`: Added `"commitlint:last"` script for local validation of the most recent commit.
- `scripts/pre-commit-hook.sh`: Added warning when commit-msg hook is not installed.
- `src/services/db.ts`: Removed `DBSchemaIndex` alias and `[key: string]` index signature from `GistDBSchema`; changed `by-starred: boolean` to `number` to satisfy `IDBValidKey` constraint.
- `src/services/pwa/register-sw.ts`: Replaced `any` cast with typed `ServiceWorkerRegistration & { sync: SyncManager }`.

## Remaining P0/P1 Items
- P0-1: Fix Playwright navigation test failures (CI-blocking, root cause: CSS display:none not overridden in test viewport)
- P1-5: Build RouteBoundary component
- P1-6: Wire Skeleton component into route rendering
- P1-7: Add "Conflicts" to bottom-nav
- P1-3: Resolve remaining Biome warnings
- P1-4: Remove TS6 `ignoreDeprecations` and fix `baseUrl`

## P2/P3 Backlog
See full gap analysis for bento grid, spring physics, scroll-driven animations, CSS token migration, context-aware theming, pagination UI, revision history UI.

## Files Changed
- `src/main.ts` — Import + call `initGlobalErrorHandling()`
- `src/components/app.ts` — Import `lifecycle`, call `cleanupRoute()` on navigation
- `src/components/ui/error-boundary.ts` — Class → object literal refactor
- `src/components/ui/empty-state.ts` — Class → object literal refactor

## Validation
- `pnpm run typecheck` — ✅ clean
- `pnpm run lint` — ✅ clean (0 errors, 78 files)
- `./scripts/quality_gate.sh` — ✅ passed
