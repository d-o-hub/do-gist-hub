# 052 — GOAP: UI/UX Modernization & Quality Gate Alignment

> **Date**: 2026-05-21
> **Type**: GOAP Plan
> **Status**: Complete
> **Related**: `039-ui-ux-2026-modernization.md`, `adr-022-2026-ui-trends-recommendations.md`, `adr-007-ui-ux-modernization.md`

## Context

A recent audit of the codebase revealed several outstanding UI/UX modernization opportunities to fully align with 2026 modern web APIs (Popover API, CSS Anchor Positioning, and token-based design), as well as a pre-existing Quality Gate blocker in `plans/README.md` due to a plan numbering mismatch.

The key modernization items are:
1. **Command Palette Popover API Migration**: Replace custom JS-driven dialog backdrop toggling with HTML5 Popover API (`popover="manual"`) and its native top-layer `::backdrop` pseudo-element.
2. **Gist Card Anchor Positioning Tooltips**: Replace legacy `title` attributes on card staleness indicators with focusable badges paired with native Popovers positioned via CSS Anchor Positioning.
3. **Autosearch CSS Token Polish**: Remove inline styled hex colors (`#3b82f6`, `#f97316`, `#ef4444`) on Gist Card sync status badges and replace them with semantic classes mapped to theme-aware design tokens.
4. **Skeleton Styling Extraction**: Move inline dimension and border-radius styles from the skeleton component (`src/components/ui/skeleton.ts`) into structural classes in `base.css`.
5. **Quality Gate Realignment**: Fix the plan numbering discrepancy in `plans/README.md` (`Next available plan number: 051` vs actual `052`) which causes quality gate validations to fail.

## GOAP

### Goal: Achieve modern, token-driven UI/UX components using the native Popover API and Anchor Positioning, and restore a green Quality Gate.

**Action 1: Fix Plan Numbering Mismatch & Register 052**
- **Precondition**: None.
- **Effect**: Resolves plan numbering checks in the quality gate by setting the next available plan to `053` in `plans/README.md`, and registers this plan as active in `_index.md` and `_status.json`.
- **Cost**: Low.
- **Files**: `plans/README.md`, `plans/_index.md`, `plans/_status.json`.

**Action 2: Polyfill Popover API in JSDOM Testing Environment**
- **Precondition**: Vitest configuration is available.
- **Effect**: Polyfills `HTMLElement.prototype.showPopover` and `hidePopover` in Vitest setup to prevent unit test crashes in JSDOM.
- **Cost**: Low.
- **Files**: `tests/setup.ts`.

**Action 3: Migrate Command Palette to HTML5 Popover API**
- **Precondition**: Command palette component and styling exist.
- **Effect**: Toggles command palette visibility natively using popover state, simplifying DOM insertion and leveraging top-layer `::backdrop`.
- **Cost**: Medium.
- **Files**: `src/components/ui/command-palette.ts`, `src/styles/command-palette.css`.

**Action 4: Implement CSS Anchor Positioned Tooltips for Staleness Badges**
- **Precondition**: Staleness badges exist in Gist Cards.
- **Effect**: Replaces the basic `title` tooltip with an interactive, accessible, CSS-anchored tooltip popup.
- **Cost**: Medium.
- **Files**: `src/components/gist-card.ts`, `src/styles/base.css`.

**Action 5: Extract Inline Badge Styles to Theme-Aware Token Classes**
- **Precondition**: Sync status badges are styled with inline hex codes.
- **Effect**: Replaces hardcoded hex codes with semantic utility classes (`.sync-status-pending`, etc.) utilizing CSS design variables.
- **Cost**: Low.
- **Files**: `src/components/gist-card.ts`, `src/styles/base.css`.

**Action 6: Extract Inline Skeleton Styles to CSS**
- **Precondition**: Skeleton component utilizes inline CSS styles.
- **Effect**: Modularizes skeleton layouts by using clean semantic classes mapped in `base.css`.
- **Cost**: Low.
- **Files**: `src/components/ui/skeleton.ts`, `src/styles/base.css`.

## Consequences

- Zero global CSS selector or layout conflicts.
- Performance and rendering improved by shifting dialog layering to browser top-layer natively.
- Full contrast checks (WCAG 2.2 AA) maintained via tokenized status colors.
- Quality Gate fully green (`./scripts/quality_gate.sh` passes completely).
