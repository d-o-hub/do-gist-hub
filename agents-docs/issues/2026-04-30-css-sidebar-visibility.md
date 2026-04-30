# Issue: Sidebar missing base display:none

**Detected:** 2026-04-30
**ID:** css-sidebar-visibility
**Status:** Resolved

## Symptom
Mobile shows unstyled sidebar buttons

## Location
`/home/doswald/git/do-gist-hub/src/styles/navigation.css` (group selector)

## Root Cause
`analyze-codebase.sh` used a strict regex `\.sidebar-nav\s*{` which failed to match group selectors like `.sidebar-nav, .rail-nav, .bottom-nav { display: none; }`. The base style was correctly implemented in `navigation.css` but the validation script reported a false positive.

## Fix
- Updated `scripts/analyze-codebase.sh` to:
  1. Search all `src/styles/*.css` files (not just `base.css`).
  2. Use `\.sidebar-nav` with `grep -A5` to catch `display: none` in group selectors.

## Verification
- [x] `./scripts/analyze-codebase.sh --validate` passes
- [x] `npm run check` passes
- [x] No console errors

## Learning
<!-- Pattern extracted from this issue -->

## Related
- Pattern: <!-- Link to pattern file -->
- Fix: <!-- Link to fix file -->
