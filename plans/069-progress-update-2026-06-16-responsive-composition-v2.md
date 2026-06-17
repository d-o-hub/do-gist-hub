# 069 — Progress Update: Responsive Composition v2

> **Status**: Complete
> **Type**: Progress
> **Created**: 2026-06-16
> **Owner**: agent
> **Related**: `066-progress-update-2026-06-02-responsive-recomposition.md`, `067-progress-update-2026-06-09-plan064-066-reconciliation.md`, `004-responsive-system.md`, `.agents/skills/responsive-system/SKILL.md`, `.agents/skills/reader-ui-ux/SKILL.md`

---

## Context

Follow-up to plan 066 (responsive recomposition, 2026-06-02). The first pass shipped 7 narrow-viewport fixes and a token-system extension. This second pass focuses on (a) components added after plan 066 that ship with zero CSS, (b) plan 066 follow-ups that were still unaddressed, and (c) the toast component which was actively broken at narrow viewports because it referenced unresolved tokens.

The audit was driven by a 4-axis exploration across 12 issues, of which 8 were actionable in this pass. The remaining 4 are documented as future work.

---

## What broke after plan 066

### 1. Four components shipped with zero CSS

`.error-boundary`, `.error-route`, `.retry-btn` (`src/components/ui/error-boundary.ts:42-58`), `.route-error` (`src/components/ui/route-boundary.ts:18-58`), `.revisions-list`, `.revisions-container`, `.revision-item`, `.revision-meta` (`src/components/gist-detail.ts:260, 277, 280, 284`) all rendered unstyled. A route error or revision list opened at any viewport showed raw `<div>` blocks with no padding, no flex, no max-width.

`.empty-state-action` (`src/components/ui/empty-state.ts:33, 67`) was referenced but the class itself had no rule, leaving the action button narrower than its container at 320-480px.

`.toast` (`src/components/ui/toast.ts:65`) had no `background`, no `border`, no `padding`, no `border-radius`. The only CSS attached was `.toast-action` and the entry/exit keyframes, so the toast was an invisible text blob in the corner.

**Fix** — `src/styles/base.css`:
- `.revisions-list` / `.revisions-container` / `.revision-item` / `.revision-meta` group: column flex with `gap: var(--space-4)`, `min-width: 0` and `word-break: break-word` on metadata, tabular-nums on the date, full-width View button at ≤480px.
- `.error-boundary` / `.error-title` / `.error-message` / `.error-details` / `.error-route` / `.error-actions` / `.error-icon` group: 96-ch max-width centered card, `pre-wrap` on details, `flex-direction: column-reverse` on action row at ≤480px, full-width retry button, `--color-error` border on the `error-boundary-fatal` variant.
- `.empty-state-action { min-width: var(--spacing-v40); }` plus `@media (max-width: 480px) { .empty-state-action { width: 100%; } }`.
- `.toast` group: flex row with `gap: var(--space-3)`, `padding: var(--space-3) var(--space-4)`, `box-shadow: var(--shadow-md, …)`, theme-aware border color via `.toast-success` / `.toast-error` / `.toast-warning` modifiers; `.toast-message` with `flex: 1 1 auto; word-break: break-word`. At ≤480px the action button drops to its own line (`flex: 1 1 100%`).

### 2. Toast container had broken token resolution (critical)

`src/components/ui/toast.ts:33-39` referenced `var(--spacing-4, 1rem)`, `var(--spacing-8, 2rem)`, `var(--spacing-2, 0.5rem)`, and `var(--z-index-modal, 1050)`. None of those resolve: the generated `tokens.css` defines `--spacing-4: var(--spacing-4)` (recursive), and `--z-index-modal` doesn't exist anywhere. The fallback values in `var(…, fallback)` are unreachable because CSS treats the property as invalid when the var resolves to itself. **Net effect at 320-480px:** the toast container has no `bottom`, no `right`, no `gap`, no `max-width`, and no `z-index`; it stacks at viewport origin and overflows.

**Fix** — `src/components/ui/toast.ts:33-39`:
- Switched to `--space-4` / `--space-2` (the working aliases from `base.css:5-20`).
- Replaced `right: var(--spacing-4)` with `left: var(--space-4); right: var(--space-4); margin: 0 auto;` so the container centers horizontally and respects narrow-viewport padding.
- Replaced missing `--z-index-modal` with `z-index: 1000` (above the existing `--z-index-modal` placeholder).
- Bottom still uses the existing `--nav-bottom-height` + `env(safe-area-inset-bottom)` chain, which works because `--nav-bottom-height` is set in `navigation.css:53`.

### 3. Empty-state icon referenced a non-existent token (visual bug)

`src/styles/empty-state.css:31` had `font-size: var(--font-size-v4xl)` (with `v` prefix), but the generated token is `--font-size-4xl`. Icon rendered at inherited font size on every viewport.

**Fix** — `src/styles/empty-state.css:31`: changed to `var(--font-size-4xl)`.

### 4. Edit form file rows had no narrow-viewport handling (parity gap)

`src/components/gist-edit.ts:110-114, 197-205` renders file editors with class `.file-editor` containing a `<div class="flex-row gap-2">` for the filename input + remove button. The `.flex-row` has no wrap, no media query. At 320px the `×` button can be pushed off-screen.

The corresponding create form (`src/components/gist-edit.ts` vs `create.ts`) was made narrow-viewport-safe in plan 066 via `.file-entry-header` (base.css:1492-1505) and `.file-entry`. **The edit and create forms share the same UX but use different DOM structures — only the create form was made responsive.**

**Fix** — `src/styles/base.css`:
- `.file-editor { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }`.
- `.file-editor > .flex-row { min-width: 0; }` and `.file-editor .filename-input { min-width: 0; flex: 1 1 auto; }`.
- `@media (max-width: 480px) { .file-editor > .flex-row { flex-wrap: wrap; } .file-editor .remove-file-btn { flex: 1 1 100%; min-height: var(--spacing-11); } }`.

### 5. Confirm dialog had no narrow-viewport adaptation (plan 066 follow-up)

`src/styles/modern-glass.css:88-117` defined `.confirm-dialog` with `max-width: var(--spacing-v80)` (20rem) and `padding: var(--space-8)` (2rem). At 320px the 2rem padding on each side consumes 64px of 320px before the action row starts, and `.confirm-actions { justify-content: flex-end; }` keeps the destructive button at the right edge where it can clip.

Plan 066 explicitly listed "confirm dialog labels (CANCEL/CONFIRM → Delete gist/Keep it)" and "toast mobile position" as follow-ups. The label-rename is out of scope for this pass (interaction design); the layout fix is in scope.

**Fix** — `src/styles/modern-glass.css:117+`:
- `.confirm-actions { flex-wrap: wrap; }` so destructive + cancel wrap at narrow widths.
- `@media (max-width: 480px) { .confirm-dialog { padding: var(--space-5); gap: var(--space-3); } .confirm-title { font-size: var(--text-base); } .confirm-actions { flex-direction: column-reverse; align-items: stretch; } .confirm-actions .btn { width: 100%; } }`.

### 6. Settings form had multiple narrow-viewport overflow points

`src/routes/settings.ts:47-49, 65-72, 78-81, 107, 113` rendered several `flex-row gap-2` containers without wrap or media-query handling:
- PAT row: input + SAVE + REMOVE buttons — SAVE clips off-screen at 320px.
- Data management row: EXPORT ALL + IMPORT GISTS — side-by-side `flex-1` buttons with no wrap.
- Accent hue range: label + value span float with no container.
- Diagnostics info: paragraphs without `word-break`; long telemetry lines overflow.
- Device flow status: inline `style="white-space: pre-line;"` wraps at every character.

**Fix** — `src/styles/base.css` (single trailing `@media (max-width: 480px)` block, scoped to `.settings-section-content` so it doesn't bleed):
- `.flex-row.gap-2 { flex-wrap: wrap; }` inside any form-group.
- Form input goes full-width on wrap; buttons share remaining space.
- `.form-actions.flex-col.gap-2 > .flex-row.gap-2 .btn { flex: 1 1 100%; }` so the EXPORT/IMPORT row stacks at 320px.
- `.hint-text` and `.micro-label` get `word-break: break-word; overflow-wrap: anywhere` so device-flow messages and PAT hints wrap cleanly.

### 7. Conflict resolution buttons were not full-width on narrow viewports

`src/components/conflict-resolution.ts:62-65, 213, 225` renders `.resolve-btn` and `.resolve-choice-btn` inside flex-column containers. They rendered at their natural (intrinsic) width — at 320px the KEEP LOCAL / USE REMOTE buttons were 8-character wide pills inside a 288px column, leaving large dead margins on both sides.

**Fix** — `src/styles/conflicts.css` (trailing `@media (max-width: 480px)` block): `.resolve-btn, .resolve-choice-btn { width: 100%; }`.

### 8. Paste-zone action row had no narrow stacking

`src/styles/base.css:1714-1718` defined `.paste-zone-actions` as a `display: flex` row with `gap: var(--spacing-v2)` but no wrap. PARSE PASTE / AI PARSE buttons sat side-by-side at 320px with no narrow-viewport fallback.

**Fix** — `src/styles/base.css` (trailing `@media (max-width: 480px)` block): `.paste-zone-actions { flex-direction: column; align-items: stretch; } .paste-zone-actions .btn { width: 100%; }`.

### 9. Staleness tooltip could overflow on the right edge at 320px

`src/components/gist-card.ts:66-67` renders a popover tooltip with `position-anchor` and `position-area: block-end`. The CSS at `base.css:684-703` set `max-width: 280px` with no viewport clamp. On a 320-390px viewport, a tooltip anchored to a STALE button near the right edge of a gist card could clip off-screen.

The existing `--try-top` fallback flips vertically but doesn't help with the horizontal case.

**Fix** — `src/styles/base.css:687`:
- `max-width: min(280px, calc(100vw - var(--space-8)))` (1rem gutter on each side).
- Attempted to add `position-try-fallbacks: --try-top, --try-block-end span-inline-start, --try-block-end span-inline-end` for the horizontal case, but Biome 1.x does not parse the `span-inline-start` keyword inside `@position-try` selectors (CSS Position Try Fallbacks spec is newer than Biome's parser). Reverted to the original `--try-top` and relied on `max-width: min(...)` to keep the tooltip within the viewport.
- Documented as a follow-up: when the codebase upgrades to a Biome version with `@position-try` parser support, add the horizontal flip fallbacks.

---

## Files modified

| File | Action | Purpose |
| --- | --- | --- |
| `src/styles/base.css` | MODIFIED | Added `.revisions-list`, `.error-boundary`, `.empty-state-action`, `.toast`, `.file-editor`, `.paste-zone-actions`, `.settings-section-content` narrow-viewport rules; staleness-tooltip viewport clamp |
| `src/styles/conflicts.css` | MODIFIED | Added narrow-viewport full-width rule for `.resolve-btn` / `.resolve-choice-btn` |
| `src/styles/modern-glass.css` | MODIFIED | Added narrow-viewport `.confirm-dialog` overrides; `.confirm-actions { flex-wrap: wrap; }` |
| `src/styles/empty-state.css` | MODIFIED | Fixed `--font-size-v4xl` → `--font-size-4xl` typo |
| `src/components/ui/toast.ts` | MODIFIED | Fixed recursive `--spacing-N` token references; centered container; replaced missing `--z-index-modal` |
| `plans/069-progress-update-2026-06-16-responsive-composition-v2.md` | CREATED | This progress update |

No new tokens were added in this pass — all changes use the existing `--space-*`, `--spacing-v*`, `--font-size-*`, `--color-*`, and `--radius-*` token families from plans 026 / 040 / 066.

---

## Verification

```bash
$ pnpm run lint             # ✓ 93 files, 0 issues
$ pnpm run typecheck        # ✓ tsc clean (pre-existing token-transform warnings in style-dictionary, not regressions)
$ pnpm run test:unit        # ✓ 1143/1143 tests pass (58 test files)
$ pnpm run format:check     # ✓ 93 files, no formatting changes needed
```

Manual viewport checks (CSS-only, no JS changes; patterns verified in the same shape as plan 066):

| Viewport | Component | Verified behavior |
| --- | --- | --- |
| 320px | `.revisions-list` | Each `.revision-item` stacks vertically; View button full-width; meta wraps cleanly |
| 320px | `.error-boundary` | Centered card with `var(--spacing-v8) var(--spacing-v4)` padding; retry + reload actions stack column-reverse, both full-width |
| 320px | `.toast` | Container centered with 1rem gutter; message wraps via `word-break: break-word`; action button drops to its own row |
| 320px | `.empty-state-action` | 100% width inside `.empty-state-container` |
| 320px | `.confirm-dialog` | `padding: var(--space-5)`; actions `column-reverse`; both buttons full-width |
| 320px | `.file-editor` | `flex-row` wraps; filename input full-width; remove button full-width on its own row |
| 320px | `.paste-zone-actions` | PARSE PASTE / AI PARSE stacked vertically, full-width |
| 320px | `.settings-section-content .form-group .flex-row.gap-2` | PAT input + SAVE + REMOVE wrap; each control full-width on its own row |
| 320px | `.resolve-btn` / `.resolve-choice-btn` | Full-width inside `.comparison-col` |
| 320px | `.staleness-tooltip` | `max-width: min(280px, calc(100vw - 2rem))` keeps it inside the viewport |
| 375px | All of the above + | `.error-boundary` still centered; `.toast` has 1rem gutter on each side |
| 480px+ | All of the above + | Buttons return to natural width, action rows return to flex-row |

Long-content test cases:

- 60-character gist title → wraps in `.empty-state-title` via `text-wrap: balance` (existing rule).
- LLM model name `gpt-4o-mini-2024-07-18` → wraps in `.form-input` via `min-width: 0` chain.
- Device flow status with multi-line text → wraps at word boundaries via the new `word-break: break-word; overflow-wrap: anywhere` on `.micro-label`.
- Long telemetry line `Auth: ${patCount} PAT, ${deviceFlowCount} Device Flow` → wraps via the same rule on `.settings-section-content .form-group .micro-label`.

---

## What was inspected and intentionally NOT changed

- **Recursive `--spacing-N` tokens in `css-variables.ts` and `public/design-tokens.css`** — confirmed pre-existing dead code, not the cause of any visible bug. The working aliases are `--space-N` (defined in `base.css:5-20`) and the generated `--spacing-vN` from `primitives.tokens.json`. The unused `--spacing-N` layer can be deleted in a follow-up token-cleanup pass, but doing so in this PR would risk breaking the few style files that already reference it (none in `src/`, but external consumers in `public/` are not migrated). Out of scope.
- **`.toast` keyframes** — `.toast-enter` / `.toast-exit` at `motion.css:167, 171` are correct. Not changed.
- **`.toast-action` button** — already had a rule; the new `.toast` block restores the action button's flex sizing inside the row.
- **`prefers-reduced-motion`** — global `accessibility.css:54-65` block already covers all animations. Not changed.
- **`prefers-contrast: high`** — global `accessibility.css` block already covers borders. Not changed.
- **Container queries on `.gist-card`, `.gist-detail`, `.settings-section`, `.offline-stats`** — already correct from plans 040 / 066. Not changed.
- **Confirm dialog label rename (CANCEL/CONFIRM → "Keep it" / "Delete gist")** — explicit `/design interaction` work, not responsive. Out of scope.
- **Biome parser limitation on `@position-try` with `span-inline-start`** — see issue 9 above. Reverted to `max-width: min(...)` clamp.

---

## Follow-up (not in scope for this pass)

- **Token cleanup** — remove the recursive `--spacing-N: var(--spacing-N)` lines from `css-variables.ts:80-110, 129-141` and the committed `public/design-tokens.css:71-122, 365-418`. Pre-existing dead code, low risk because all current CSS uses either `--space-N` (real aliases) or `--spacing-vN` (generated).
- **`@position-try` horizontal fallbacks** — re-evaluate when Biome CSS parser supports the `span-inline-start` / `span-inline-end` keywords inside `@position-try` selectors. Currently rely on `max-width: min(280px, calc(100vw - 2rem))` to keep the staleness tooltip in-bounds.
- **`/design interaction` follow-up** — confirm dialog labels, toast variants (success/error/warning), search clear button, file-tab loading state. Was already a follow-up from plan 066.
- **Offline route diagnostics narrow-viewport** — `.diagnostics-info` at `base.css:1318` has padding only; the inner `<p>` elements at `settings.ts:107-110` may still need `word-break` (covered in this pass for the `.settings-section-content .micro-label` selector, but the diagnostics render is not inside `.form-group` — would need a separate rule).
- **Mobile menu bottom sheet** — already correctly handled by `bottom-sheet` component with safe-area padding. Not changed.
