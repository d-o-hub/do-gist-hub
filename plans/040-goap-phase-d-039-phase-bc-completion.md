# 040 — GOAP Phase D: Plan 039 Phase B/C Completion & Plan Status Hygiene

> **Date**: 2026-05-17
> **Type**: GOAP Plan
> **Status**: Complete
> **Related**: `039-ui-ux-2026-modernization.md`, `038-codebase-audit-recommendations-2026-05-16.md`, `adr-022-2026-ui-trends-recommendations.md`

## Context

Plans 038 and 039 are marked `complete` in the registry, but a comprehensive audit revealed several Phase B and Phase C items from Plan 039 that were never actually implemented. Most Phase B items (speculation rules, accent hue, text-wrap, field-sizing) were shipped, but three remain:

1. **@scope blocks** in CSS files (Phase B)
2. **OKLCH shadow tokens** `--shadow-{xs..2xl}` replacing hardcoded box-shadow ramps (Phase B)
3. **Popover API + anchor positioning** for command-palette and tooltips (Phase B)
4. **Interpolate-size + accent-color** progressive enhancements (Phase C)
5. **Stale plan status headers** across 4 plan files

## GOAP

### Goal: Complete all outstanding Plan 039 Phase B/C items and fix plan documentation drift.

**Action 1: Add `@scope` blocks to CSS files**
- **Precondition**: All CSS selectors identified
- **Effect**: Scopes existing .gist-card and .bento-grid selectors under `@scope` blocks, eliminating global selector collisions
- **Cost**: Low (wrapping, no selector changes)
- **Files**: `src/styles/base.css`

**Action 2: Define OKLCH shadow token ramp**
- **Precondition**: `--accent-h` and OKLCH support confirmed
- **Effect**: Replaces hardcoded `box-shadow` values with token-driven `--shadow-{xs..2xl}` ramp using OKLCH/color-mix
- **Cost**: Low
- **Files**: `src/styles/base.css`, `src/styles/modern-glass.css`

**Action 3: Convert command-palette to Popover API with anchor positioning**
- **Precondition**: command-palette CSS exists as dead code; needs anchor-name wiring
- **Effect**: Minimal footprint — CSS-only attribute-driven approach
- **Cost**: Medium
- **Files**: `src/styles/command-palette.css`

**Action 4: Add `interpolate-size` and `accent-color` progressive enhancements**
- **Precondition**: Supports query confirmed
- **Effect**: Enables native height animations and dark-mode-aware form accent colors
- **Cost**: XS
- **Files**: `src/styles/motion.css`, `src/styles/base.css`

**Action 5: Fix stale plan status headers**
- **Precondition**: Current status known from `_status.json`
- **Effect**: Updates status headers in `038-codebase-audit-recommendations-2026-05-16.md`, `029-goap-phase-c-future-work.md`, `039-ui-ux-2026-modernization.md`, `adr-020-swarm-audit-phase-a.md` to reflect `complete` status
- **Cost**: XS

**Action 6: Run quality gate and create progress update**
- **Precondition**: All previous actions pass typecheck + lint + tests
- **Effect**: Creates progress update document, commits atomically, pushes for PR
- **Cost**: Low

## Consequences

- Plan 039 Phase B/C fully implemented per specification
- Dead code (legacy command-palette CSS) converted to modern Popover API
- All plan status headers match `_status.json`
- Quality gate verifies no regressions to the existing 963-passing test suite
