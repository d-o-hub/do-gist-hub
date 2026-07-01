# GOAP: Impeccable UI — Production-Ready Responsive Completion

> **Status**: Complete
> **Type**: GOAP
> **Created**: 2026-06-30
> **Updated**: 2026-06-30
> **Owner**: agent
> **Related**: 066-responsive-recomposition, 069-responsive-composition-v2, 070-design-token-audit, adr-034-design-token-system-dtcg, adr-007-ui-ux-modernization

## Goal

Complete the final 5% of UI/UX gaps identified in a full CSS + component audit to achieve an **impeccable, production-ready, fully responsive** interface. The CSS system (plans 066/069/070) brought the project to ~95%; this plan closes every remaining gap.

## Audit Findings Summary

### P0 — Accessibility Violation (1)
- Tag assignment dialog missing `role="dialog"`, `aria-modal="true"`, focus trap, Escape handling, return-focus

### P1 — CSS Structural (3)
- `empty-state.css`: Duplicate `@media (max-width: 480px)` block — dead code conflicting with second block
- `command-palette.css`: No mobile breakpoint (footer keyboard hints irrelevant on touch; landscape overflow risk)
- `keyboard-help.css`: No mobile consideration (keyboard shortcuts irrelevant on touch devices)

### P1 — Undefined Tokens (9 CSS variables)
| Variable | Usage |
|---|---|
| `--color-border-subtle` | navigation.css, base.css |
| `--color-on-accent` | base.css (checkbox check mark) |
| `--color-overlay-dark` | conflicts.css |
| `--color-overlay-light` | conflicts.css |
| `--color-text-secondary` | keyboard-help.css |
| `--spacing-v128` | base.css (revisions max-width) |
| `--spacing-11` | base.css (file editor) |

### P1 — Component (3)
- Tag dialog overflows at 320px (inline `min-width: 300px`, no `max-width`)
- Fork button (`data-action="fork"`) rendered with no event handler — dead code
- Tag dialog + toast container use excessive inline styles that should be CSS classes

### P2 — Token Discipline (systemic)
- 17× hardcoded `letter-spacing` (tokens exist but unused)
- 17× hardcoded `backdrop-filter: blur(Npx)` (no blur token)
- 8× hardcoded animation durations in shorthand properties

## Actions

### Phase 1: Token Definitions (define missing CSS variables)

- [x] **A1**: Add `--color-border-subtle`, `--color-on-accent`, `--color-overlay-dark`, `--color-overlay-light`, `--color-text-secondary` to `css-variables.ts`
- [x] **A2**: Add `--spacing-v128: 32rem` to spacing primitives
- [x] **A3**: Replace `--spacing-11` with `--spacing-v11` (existing token)

### Phase 2: CSS Structural Fixes

- [x] **A4**: Consolidate duplicate `@media (max-width: 480px)` in `empty-state.css`
- [x] **A5**: Add mobile breakpoint to `command-palette.css` (hide footer on touch, adjust padding, max-height for landscape)
- [x] **A6**: Add mobile breakpoint to `keyboard-help.css` (hide on touch or condense)

### Phase 3: Tag Dialog Accessibility (P0)

- [x] **A7**: Extract inline styles from `showTagAssignmentDialog()` to `.tag-dialog` CSS class
- [x] **A8**: Add `role="dialog"`, `aria-modal="true"`, `aria-label="Assign tags"`
- [x] **A9**: Add backdrop overlay, focus trap, Escape key handling, return-focus-on-close
- [x] **A10**: Add viewport constraint (`max-width: min(300px, calc(100vw - 2rem))`)

### Phase 4: Dead Code & Token Discipline

- [x] **A11**: Remove fork button or bind handler (evaluate if fork API is available)
- [x] **A12**: Add `--blur-sm/md/lg/xl` tokens for backdrop-filter values
- [x] **A13**: Replace hardcoded `backdrop-filter` values with tokens
- [x] **A14**: Add `--letter-spacing-tight/normal/wide/wider/widest` tokens
- [x] **A15**: Replace hardcoded `letter-spacing` values with tokens

### Phase 5: Documentation & Verification

- [x] **A16**: Update `AGENTS.md` with plan 071 reference, new self-learning rules
- [x] **A17**: Update `plans/_index.md` and `plans/_status.json` with plan 071
- [x] **A18**: Update `.agents/skills/responsive-system/SKILL.md` with new patterns
- [x] **A19**: Run quality gate (typecheck + lint + test:unit + build)

## Success Criteria

- Zero P0 accessibility violations in components
- Zero undefined CSS variables referenced in stylesheets
- All responsive components handle 320px–1536px without overflow
- No dead interaction code (buttons without handlers)
- Hardcoded visual values replaced with tokens
- Quality gate passes (lint, typecheck, tests, build)
