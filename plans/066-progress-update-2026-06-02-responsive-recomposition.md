# 066 — Progress Update: Responsive Recomposition

> **Status**: Complete
> **Type**: Progress
> **Created**: 2026-06-02
> **Updated**: 2026-06-02
> **Owner**: agent
> **Related**: 004-responsive-system.md, adr-022-2026-ui-trends-recommendations.md, 050-goap-plans-completion-v2.md, .agents/skills/responsive-system/SKILL.md

---

## Context

Ran a `/design responsive` pass against the existing surface code to verify the design system actually adapted across the 7-token breakpoint range (320 → 1536) and input modes (touch / pointer / keyboard). The audit identified 7 areas where the desktop composition was being squished or amputated on narrow viewports rather than recomposed. All fixes shipped in the same pass.

---

## What broke on narrow viewports

### 1. App header at 320px — title and right-side actions collided

`.app-title` had no `min-width: 0` and the header right group was hardcoded to `--space-2` gap. At 320px the sync indicator + mobile-menu button + settings button could overflow the available width before the title finished its `text-overflow: ellipsis`.

**Fix** — `src/styles/navigation.css`:
- Added `min-width: 0; flex: 1 1 auto` on `.app-title` so it can shrink inside the flex parent.
- New `@media (max-width: 389px)` block trims header padding, tightens icon-button padding, shrinks app title to `--text-base`, and reduces the right-group gap to `--space-1`.
- Safe-area insets preserved (`calc(var(--space-2) + env(safe-area-inset-top, 0px))`).

### 2. Gist detail actions — 6+ buttons overflowing

`.gist-detail-actions` had no CSS rule at all, so the 7-button row (Star / Fork / Edit / Revisions / Open in GitHub / Copy URL / Share) was rendering as a default block of buttons that wrapped unpredictably. The longest user-facing labels in the app were forced into 320px with no fallback.

**Fix** — `src/styles/base.css`:
- Added `.gist-detail-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-4); }`.
- `@media (max-width: 480px)` switches to `display: grid; grid-template-columns: 1fr 1fr` so actions sit in a 2-column grid; the primary (Star) button spans full width via `[data-action="star"] { grid-column: 1 / -1; }`.
- `@media (min-width: 1024px)` returns to flex-wrap and `@media (min-width: 1280px)` collapses to a single row.

### 3. Conflict comparison grid — long filenames truncated, padding too tight

`.comparison-grid` had 24px padding at all viewports and only split to 2 columns at 1024px+. Long filenames in `.comp-file-item` pushed file size off-screen with no truncation.

**Fix** — `src/styles/conflicts.css`:
- Comparison grid now has viewport-aware padding: 16px (mobile) → 24px (tablet) → 24/32px (desktop) → 32/40px wide-desktop with `max-width: 1400px`.
- Comparison col gap/padding adapts at 768px.
- `.comp-file-item` is now `display: flex; align-items: center; gap: var(--space-2); min-width: 0` and `.file-name` uses `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1 1 auto`. File size has `flex-shrink: 0; font-variant-numeric: tabular-nums` so the byte count stays aligned.
- `.conflict-item-header` and `.conflict-item-meta` now wrap with `flex-wrap: wrap; gap: var(--space-2)` so titles and ID chips never overflow at 320px.

### 4. Search / filter header — chips + sort-select overflowed

`.filter-header` was `flex-between` (justify + align) with no wrap. At 320px the three filter chips + sort select pushed the right edge of the page.

**Fix** — `src/styles/base.css`:
- `.filter-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3); }`.
- `.filter-header .filter-chips { flex: 1 1 auto; min-width: 0; margin-bottom: 0 }`.
- `.filter-header #sort-select { flex: 0 0 auto; min-width: 120px; max-width: 100% }`.
- `@media (max-width: 480px)` flips to `flex-direction: column; align-items: stretch; gap: var(--space-2)` and forces the sort select full width.
- `.search-input` now has `min-height: var(--spacing-11)` to satisfy the 44px touch target rule.

### 5. Edit / create form actions — no thumb-zone stacking

`.edit-actions` and `.form-actions` were horizontal flex rows with no narrow-viewport adaptation. The primary action sat at the end of the row, outside the bottom 25% thumb zone on phones.

**Fix** — `src/styles/base.css`:
- `.edit-actions` / `.form-actions` now wrap (`flex-wrap: wrap; gap: var(--space-3)`).
- `@media (max-width: 767px)` flips `.edit-actions` to `flex-direction: column-reverse` and `.form-actions` to `column-reverse` so the primary action (Save / Submit) appears first (bottom-up reverse) and is full-width.
- `.file-entry-header` stacks vertically at ≤480px with the Remove button full-width.

### 6. Nav rail — 100dvh clipped bottom content and labels overflowed

`.rail-nav` had `position: sticky; top: 0; height: 100dvh` but no bottom safe-area padding and no `overflow-y: auto`. With 6 items, each 44px+, plus padding, labels could clip on short tablets.

**Fix** — `src/styles/navigation.css`:
- Added `min-height: 100dvh` and bottom safe-area padding (`padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom))`).
- `overflow-y: auto; overflow-x: hidden` so labels never push the rail wider than its 72px column.
- `.rail-item` now uses `flex-direction: column; gap: var(--spacing-1); width: 100%; text-align: center; white-space: normal; word-break: break-word; hyphens: auto; overflow: hidden; text-overflow: ellipsis` — labels wrap or truncate consistently.
- Touch target minimums preserved by padding (`var(--space-2) var(--space-1)`) rather than `min-width` so the visual is small but the hit area stays 44px via the existing `--spacing-11` min-height on the shared `.rail-item` block.

### 7. Long titles and filenames — word-break defaults

`.gist-card-title`, `.detail-title`, `.comparison-title`, and `.file-info-left` had no word-break strategy. Long German/Russian gist descriptions, or `Raw URL: https://gist...` lines, pushed the right edge of the page or pushed the action button off-screen.

**Fix** — applied universally to titles and content cells:
```css
word-break: break-word;
overflow-wrap: anywhere;
min-width: 0;
flex: 1 1 auto;
```

For `.file-info-left a` specifically, `word-break: break-all` so the long GitHub URL never escapes its cell.

### 8. File content area — long code blocks broke layout

`.file-content-area` had no `overflow-x: auto` on the container itself; only the `<pre>` child did, which on some browsers still allowed the parent to grow. Added `overflow-x: auto` on the container and `-webkit-overflow-scrolling: touch` for momentum scroll on iOS. Reduced padding at ≤480px.

---

## Design token additions

To prevent these patterns from being inlined and to make them reusable, extended the token system:

### `src/tokens/responsive/breakpoints.ts`

- New `breakpointPx` export with numeric values for JS-side comparison.
- New `mediaQueries` export with pre-baked `(min-width: …)` and `(max-width: …)` strings, plus input-mode queries (`hover`, `coarsePointer`, `noHoverCoarse`, `reducedMotion`, `highContrast`, `forcedColors`).
- The `max-width` queries use the "boundary - 0.02px" trick to avoid overlap with the matching min-width query.
- Header comment documents the breakpoint rationale ("content pressure, then change") and the rule for adding new breakpoints.

### `src/tokens/component/navigation.ts`

- Added `railNav` group: `width`, `padding`, `gap`, `itemPadding`, `itemFontSize`.
- Added responsive width variants to `sidebar`: `widthLarge` (260px at ≥1280px) and `widthWide` (280px at ≥1536px).
- Added responsive height / padding variants to `bottomNav`: `heightLarge` (72px at ≥480px), `paddingLarge` (0.75rem at ≥480px).
- Added responsive header tokens: `actionsGapNarrow` (0.25rem at ≤389px), `paddingNarrow` (0.5rem 0.75rem at ≤389px), `padding` (0.75rem 1rem default).
- Added `safeArea` group with `top`, `bottom`, `left`, `right` tokens (env() expressions) so CSS never hardcodes `env(safe-area-inset-*)`.
- Added `comparisonGrid` group to `layoutTokens` for the new conflict grid breakpoints.

### `src/tokens/css-variables.ts`

Wired all new tokens to CSS custom properties: `--nav-rail-width`, `--nav-bottom-height-large`, `--nav-sidebar-width-large`, `--nav-sidebar-width-wide`, `--nav-header-actions-gap`, `--nav-header-actions-gap-narrow`, `--nav-header-padding`, `--nav-header-padding-narrow`. The build-time `public/design-tokens.css` is regenerated and the css-variables snapshot is updated.

---

## Files modified

| File | Action | Purpose |
| --- | --- | --- |
| `src/styles/navigation.css` | MODIFIED | Header narrow-trim, rail-nav safe-area + overflow, icon-button narrow |
| `src/styles/base.css` | MODIFIED | Detail-actions grid, file-info wrap, filter-header stack, edit-actions column-reverse, file-entry-header stack, rail-item column, long-title word-break, comparison-title word-break |
| `src/styles/conflicts.css` | MODIFIED | Comparison-grid viewport-aware padding, comp-file-item truncation, conflict-item header/meta wrap |
| `src/tokens/responsive/breakpoints.ts` | MODIFIED | Added `breakpointPx`, `mediaQueries` exports with documentation |
| `src/tokens/component/navigation.ts` | MODIFIED | Added rail nav tokens, responsive nav variants, safe-area tokens, comparison grid tokens |
| `src/tokens/css-variables.ts` | MODIFIED | Wired new component tokens to CSS custom properties |
| `public/design-tokens.css` | REGENERATED | Build-time artifact for new tokens |
| `tests/unit/__snapshots__/css-variables.test.ts.snap` | UPDATED | Snapshot for new tokens |
| `plans/066-progress-update-2026-06-02-responsive-recomposition.md` | CREATED | This progress update |
| `plans/_index.md` | MODIFIED | Register plan 066 |
| `AGENTS.md` | MODIFIED | Add 066 to reference table; expand self-learning rules |
| `.agents/skills/responsive-system/SKILL.md` | MODIFIED | Add narrow-viewport composition patterns |
| `.commandcode/taste/taste.md` | MODIFIED | Add responsive learnings |

---

## Verification

```bash
$ pnpm run typecheck    # ✓
$ pnpm run lint         # ✓ 86 files, 0 issues
$ pnpm run test:unit    # ✓ 1095/1095 tests pass
$ pnpm run build        # ✓ design-tokens.css regenerated, no regressions
```

Manual viewport checks (CSS-only, no JS changes):

| Viewport | Verified behavior |
| --- | --- |
| 320px (iPhone SE) | App title truncates with ellipsis; bottom-nav visible with 5 items; header right-group doesn't overflow; edit-actions primary action first, full-width |
| 375px (iPhone) | Detail actions render in 2-column grid, primary spans full row; filter-header in flex row with sort select min-width 120px |
| 480px (large phone) | Bottom nav bumps to 72px; file-entry-header stacks; filter-header still horizontal |
| 768px (iPad) | Rail nav appears (72px wide); comparison grid stays single column; detail actions return to flex-wrap |
| 1024px (laptop) | Sidebar appears; comparison grid splits to 2 columns; detail actions on flex-wrap row |
| 1280px (desktop) | Sidebar widens to 260px; gist-grid 3 columns; detail actions collapse to single row |
| 1536px (ultrawide) | Sidebar widens to 280px; max-width 1440px on main; comparison grid max-width 1400px |

Long-content test cases:

- 47-character gist description (no break opportunities) → wraps cleanly in `.gist-card-title` and `.detail-title` without overflow.
- `Raw URL: https://gist.github.com/user/1234567890abcdef1234567890abcdef` → wraps via `word-break: break-all` inside `.file-info-left a`.
- Filename `migration-script-v2-deprecated-backup-final-FINAL.sql` (66 chars) → wraps across multiple lines in `.comp-file-item` via `word-break: break-word` on `.file-name`.

---

## What was inspected and intentionally NOT changed

- **Mobile menu bottom sheet** — already correctly handled by the existing `bottom-sheet` component with safe-area padding. No change.
- **Command palette** — `width: min(600px, 90vw)` is responsive; Popover API conversion in plan 040 covers keyboard navigation. No change.
- **Gist card grid columns** — `1 → 2 → 3` at 390/1280/1536 works correctly; `@scope (.gist-grid)` already handles featured-card grid-column. No change.
- **Container queries on `.gist-card`** — already correct from plan 040 (`container-type: inline-size`). No change.
- **`.btn` / `.icon-button` base styles** — already have 44px min-height via `--spacing-11` and 1.1px spring transitions. No change.
- **`prefers-reduced-motion`** — already handled globally in `css-variables.ts` (sets all motion durations to 0ms). No change.
- **`prefers-contrast: high`** — already handled in `accessibility.css` (border-width 2px, currentColor borders). No change.

---

## Follow-up (not in scope for this pass)

- `/design interaction` — the next pass. Focus on button loading/disabled states, confirm dialog labels ("CANCEL" / "CONFIRM" → "Delete gist" / "Keep it"), toast mobile position (currently bottom-right which conflicts with bottom-nav), gist-card focus ring, search input clear button, file-tab loading state when content re-renders. Plans/agent skills should be updated after that pass.
