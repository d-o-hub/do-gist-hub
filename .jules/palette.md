# Learnings & Patterns

## Navigation & Event Delegation
- **Container-level delegation** over per-element binding: Use `data-route` and `data-action` attributes with a single container listener (guard via `dataset.navBound`) — eliminates memory leaks and ensures all dynamic content (empty states, list items) is interactive without extra code.
- **Unique test IDs per nav location**: Each navigation target (sidebar, rail, header) must have a unique `data-testid` to prevent strict-mode violations in Playwright. Prefer `data-route` selectors in tests for resilience.
- **Clear pending debounces**: When handling `clear-search` or similar reset actions, always `clearTimeout()` before resetting state to avoid orphaned callbacks firing after the UI has been reset.

## CSS Token Architecture
- **No hardcoded px/rem values** outside `:root` token definitions. Every `max-width`, `padding`, `margin` must reference a semantic token (e.g., `--max-w-empty-state`, `--max-w-dialog`). Define tokens in `base.css` `:root` — never rely solely on fallback values.
- **Component buttons extend base classes**: `.empty-state-action` should not duplicate `.btn.btn-primary` styles; only add overrides that differ (e.g., `margin-top`). The component already applies both classes.

## Empty States (Actionable)
- Every empty state must include: Title, Description, Icon, and a clear primary Action button.
- Action buttons use `data-route` (for navigation) or `data-action` (for app logic like `clear-search`) so delegation handles them automatically.

## Playwright Test Stability
- **Always use `.first()`** for selectors that match multiple nav elements across sidebar/rail/header.
- **Wait for `networkidle`** after navigation clicks before asserting DOM state.
- **Open collapsed `<details>` sections** before interacting with elements inside them (e.g., "Data & Diagnostics" must be expanded before clicking `#export-data-btn`).
- **Prefer `@ts-expect-error`** over `@ts-ignore` for type suppression — it fails the build if the suppressed error no longer exists.

## PR CI Patterns
- **DeepSource JavaScript** failures are typically: unused vars, `any` types, catch-block unused params. Use `catch {}` (no param) when the error is unused.
- **Duplicate test IDs** cause strict-mode violations in Playwright on multi-nav layouts.
