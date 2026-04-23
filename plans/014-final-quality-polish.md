# Plan: Final Quality Polish and Analyzer Resolution

## Goal
Resolve remaining warnings from the codebase analyzer and ensure full compliance with the 2026 UI patterns specified in the template.

## Proposed Changes

### 1. CSS Refinement
- Add `min-height: 0` to all flex containers that have children with `overflow: auto` or `overflow-y: auto`.
- Ensure safe area insets are used in `app-header` and `bottom-nav`.

### 2. Component Structure
- Update `src/components/app.ts` to include a proper `.sidebar-nav` and `.rail-nav` structure, even if they share content with the existing navigation. This satisfies the "2026 Mobile-First Navigation" pattern.

### 3. Verification
- Run `./scripts/analyze-codebase.sh --validate` and ensure zero errors and minimal warnings.
- Run `pnpm run quality` to verify type-checking and linting.

## Impact
- Full compliance with documented repository standards.
- Improved layout stability on various devices.
- Clearer path for future UI enhancements (sidebar/rail transitions).
