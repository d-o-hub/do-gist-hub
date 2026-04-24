# Plan: Final Quality Polish and Analyzer Resolution

## Goal
Resolve remaining warnings from the codebase analyzer and ensure full compliance with the 2026 UI patterns specified in the template.

## Completed Changes

### 1. CSS Refinement ✅
- Added `min-height: 0` to flex children with overflow (already in `base.css`)
- Safe area insets used in `app-header` and `bottom-nav` (already in `navigation.css`)
- Replaced hardcoded `max-width: 400px` with semantic tokens `--max-w-empty-state` and `--max-w-dialog` in `base.css` `:root`
- Added `.empty-state-action` override styles (extends `.btn.btn-primary`)

### 2. Component Structure ✅
- `app.ts` has proper `.sidebar-nav` and `.rail-nav` with mobile-first `display: none` base
- Removed duplicate `data-testid='settings-btn'`; tests now use `data-route='settings'` selectors with `.first()` for resilience across nav layouts
- Event delegation via `data-route` and `data-action` with `dataset.navBound` guard
- Debounce cleanup (`clearTimeout`) added to `clear-search` action handler

### 3. Test Stability ✅
- Fixed `@ts-ignore` → `@ts-expect-error` in `memory-stubs.spec.ts`
- Removed unused `_transitionTriggered` variable in `modernization-verification.spec.ts`
- Replaced `catch (e)` → `catch {}` for unused error params
- Updated all test selectors from `data-testid="settings-btn"` to `data-route="settings"` for resilience
- Added `networkidle` waits and `<details>` section expansion in `export-import.spec.ts`

### 4. Verification
- Run `./scripts/analyze-codebase.sh --validate` and ensure zero errors and minimal warnings.
- Run `pnpm run quality` to verify type-checking and linting.

## Impact
- Full compliance with documented repository standards.
- Improved layout stability on various devices.
- Clearer path for future UI enhancements (sidebar/rail transitions).
- Playwright tests more stable across browsers and viewports.
