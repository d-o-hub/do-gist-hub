# Progress Update — 2026-07-18 (Follow-up to 026)

> **Status**: P1-4 through P1-7 resolved. RouteBoundary (P1-5) built. Dead code removed. Config fixed.

## Completed Actions

### Config Fixes (Discovered in 026)
- **`tsconfig.json`**: Removed `ignoreDeprecations: "6.0"` and deprecated `baseUrl`. Updated all `paths` to explicit `./src/` prefixes (`"@/*": ["./src/*"]`).
- **`playwright.config.ts`**: `npm run dev` → `pnpm run dev` (project policy compliance).
- **`biome.json`**: Re-enabled `noStaticOnlyClass: "error"` (was `"off"`). 0 lint violations — ErrorBoundary and EmptyState refactors hold.

### GOAP Actions Completed

| ID | Action | ADR | Status |
|----|--------|-----|--------|
| P1-4 | Remove TS6 `ignoreDeprecations`, fix `baseUrl` | ADR-026 | ✅ Done |
| P1-5 | Build RouteBoundary component | ADR-006 | ✅ Done |
| P1-6 | Wire Skeleton into route rendering | ADR-026 | ✅ Done |
| P1-7 | Add "Conflicts" to bottom nav | ADR-026 | ✅ Done |

### P1-4: TS6 Migration
- Removed `ignoreDeprecations: "6.0"`
- Removed deprecated `baseUrl: "."`
- Updated 4 path aliases to explicit relative prefixes (`"./src/*"`)

### P1-5: RouteBoundary Component
- **New file**: `src/components/ui/route-boundary.ts`
  - `RouteBoundary.wrap(container, route, renderFn)` — try/catch wrapper for route rendering
  - On failure: renders fallback UI with error message, route info, "Try Again" and "Go Home" buttons
  - Retry dispatches `app:navigate` custom event (reuses existing navigation pipeline)
  - Error normalization: handles `throw "string"` and `throw null` safely
  - Uses shared `sanitizeHtml` from `src/services/security/dom.ts`
- **`src/components/app.ts`**: All 7 route cases in `navigate()` wrapped with `RouteBoundary.wrap()`
- **`src/components/ui/error-boundary.ts`**: Deduplicated `escapeHtml` — now imports `sanitizeHtml` from security

### P1-6: Skeleton Wiring
- **`src/routes/home.ts`**: Replaced 8-line inline skeleton HTML with `import { Skeleton }` + `Skeleton.renderList(3)`
- CSS classes (`.loading-skeleton`, `.skeleton-card`) verified in `base.css` and `motion.css`

### P1-7: Conflicts Navigation
- **Bottom nav**: Added "Conflicts" between Create and Offline (5 items total)
- **Sidebar nav**: Added "Conflicts" under Offline section
- **Mobile menu**: Added "Conflicts" under Offline section
- **Nav-rail** (`src/components/ui/nav-rail.ts`): Added `{ route: 'conflicts', label: 'Conflicts', testId: 'nav-conflicts' }`
- **Test update** (`tests/mobile/responsive.spec.ts`): `toHaveCount(4)` → `toHaveCount(5)`

### Dead Code Removal
- Deleted `src/stores/ui-store.ts` and `src/stores/auth-store.ts` — zero production imports confirmed

## Validation

```bash
pnpm run check        # ✅ typecheck (0 errors) + lint (77 files, 0 issues) + format:check (77 files)
pnpm run test:unit    # ✅ 130 passed (11 files)
./scripts/quality_gate.sh  # ✅ All gates passed
```

## ADR-022 / ADR-007 UX Audit Findings

Most ADR-022 and ADR-007 items are already implemented (stale gap report in 025/026):

| Item | Status | Location |
|------|--------|----------|
| Spring physics (`linear()`) | ✅ Implemented | `src/tokens/motion/motion.ts` |
| Scroll-driven animations | ✅ Implemented | `src/styles/motion.css` (`@supports (animation-timeline: view())`) |
| Container queries | ✅ Implemented | `src/styles/base.css` (`@container gist-card`) |
| All 7 breakpoints | ✅ Active | Across `base.css`, `navigation.css`, `interactions.css` |
| Bento grid | ✅ Implemented | `base.css` (`.gist-card.featured` spans 2 cols) |
| View Transitions API | ✅ Implemented | `motion.css`, `src/utils/view-transitions.ts` |
| Glassmorphism nav | ✅ Implemented | `modern-glass.css`, `navigation.css` |
| Variable fonts | ✅ Implemented | `src/main.ts` (Inter Variable, JetBrains Mono, Anton) |

Remaining P3/future items: context-aware theming (sensor-based, opt-in).

## Files Changed

| File | Change |
|------|--------|
| `tsconfig.json` | Remove `ignoreDeprecations` + `baseUrl`; update `paths` to `./src/*` |
| `playwright.config.ts` | `npm run dev` → `pnpm run dev` |
| `biome.json` | `noStaticOnlyClass: "off"` → `"error"` |
| `src/components/ui/route-boundary.ts` | **New** — Route-level error isolation with retry |
| `src/components/ui/error-boundary.ts` | Import `sanitizeHtml` from security; remove local `escapeHtml` |
| `src/components/app.ts` | Import RouteBoundary; wrap all 7 route cases |
| `src/components/ui/nav-rail.ts` | Add Conflicts to NAV_ITEMS |
| `src/routes/home.ts` | Import Skeleton; replace inline HTML with `Skeleton.renderList(3)` |
| `tests/mobile/responsive.spec.ts` | Nav item count 4 → 5 |
| `src/stores/ui-store.ts` | **Deleted** — dead code |
| `src/stores/auth-store.ts` | **Deleted** — dead code |

*Last updated: 2026-07-18*
