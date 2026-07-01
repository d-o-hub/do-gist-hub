# DESIGN.md — do-gist-hub UI Harness (2026)

> **Living document.** Every architectural UI decision lives here first.
> Last updated: 2026-07-01 | Baseline: `v0.2.1`

---

## 0. Guiding Principles

| # | Principle | Rationale |
|---|-----------|-----------|
| 1 | **Token-first** | Every visual value (colour, spacing, radius, shadow, motion) MUST originate from `src/tokens/`. No magic numbers in component files. |
| 2 | **Offline-first, then enhance** | UI state must be renderable from IndexedDB alone. Network is a progressive enhancement. |
| 3 | **WCAG 2.1 AA minimum** | Every interactive surface ships with keyboard navigation, visible focus, and ARIA semantics before visual polish. |
| 4 | **One nav surface per viewport** | Sidebar (≥ 1024 px), nav-rail (640 – 1023 px), bottom-nav (< 640 px) are mutually exclusive. No double-render. |
| 5 | **Progressive enhancement for CSS** | Experimental CSS (e.g. `position-anchor`, `anchor-name`) must ship with a bulletproof fallback. |
| 6 | **Skeleton before content** | Every async data boundary renders a shimmer skeleton, never an empty container. |

---

## 1. Token Architecture

src/tokens/
├── primitive/          # raw scale: color-50…950, space-1…20, radius-sm…full
├── semantic/           # purpose aliases: --color-surface, --color-on-surface
├── component/          # component-scoped: --gist-card-radius, --nav-rail-width
├── elevation/          # shadow scale: --elevation-0…5
├── motion/             # duration + easing: --motion-duration-fast, --motion-ease-standard
├── responsive/         # breakpoint tokens: --bp-sm, --bp-md, --bp-lg
├── components.tokens.json
├── css-variables.ts    # generated — DO NOT EDIT by hand
└── design-tokens.ts    # Style Dictionary config entrypoint

### Rules
- `primitive` tokens are **never used directly** in components — always via `semantic` or `component` aliases.
- `css-variables.ts` is **generated** by `pnpm tokens:build`. Never edit manually.
- New component tokens must be declared in `src/tokens/component/<component>.json` and referenced in `sd.config.ts`.

---

## 2. Navigation Architecture

### Breakpoint Contract

| Viewport | Surface | File |
|----------|---------|------|
| `< 640px` | `bottom-nav` + bottom sheet | `src/components/ui/bottom-sheet.ts` |
| `640px – 1023px` | `nav-rail` | `src/components/ui/nav-rail.ts` |
| `≥ 1024px` | `sidebar` (`<aside>`) | `src/components/app.ts` |

### CSS Exclusivity Pattern

```css
/* src/styles/navigation.css */
.sidebar        { display: none; }
.nav-rail       { display: none; }
.bottom-nav     { display: flex; }

@media (min-width: 640px) {
  .bottom-nav   { display: none; }
  .nav-rail     { display: flex; }
}

@media (min-width: 1024px) {
  .nav-rail     { display: none; }
  .sidebar      { display: flex; }
}
```

**Anti-pattern**: rendering all three surfaces and using `visibility: hidden` — this doubles DOM weight and causes screen reader confusion.

### Bottom Sheet Focus Trap
Every `bottomSheet.open()` call MUST activate a focus trap:
```typescript
// src/components/ui/bottom-sheet.ts
private trapFocus(container: HTMLElement): void {
  const focusable = container.querySelectorAll<HTMLElement>(
    'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  container.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
  first?.focus();
}
```

---

## 3. Gist Card Component Contract
File: `src/components/gist-card.ts`

### 3.1 Action Button Labels

| Button | Current | Required |
|--------|---------|----------|
| **Star** | text-only ★ / ☆ | SVG icon + `aria-label` (already correct) |
| **Delete** | `DELETE` (all-caps text) | SVG icon + `aria-label="Delete gist"` + visible label `Delete` (sentence-case) |
| **Sync badges** | `PENDING` / `CONFLICT` / `ERROR` | Keep uppercase — these are status codes, not action labels |

### 3.2 Code Preview Overflow
```css
/* src/styles/interactions.css */
.gist-preview-code {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  white-space: pre-wrap;
  word-break: break-all;
}
```
The 120-char JS slice in `gist-card.ts` should be removed in favour of pure CSS clamping so the full content is in the DOM for search/copy.

### 3.3 View Transition Names
`view-transition-name` must not be set via `style=""` attributes — they bypass the token pipeline and cause CSP `style-src` violations when `unsafe-inline` is removed.

Required pattern:
```typescript
// Assign via data attribute, resolve in CSS
card.dataset.vtName = escapeViewTransitionName(gist.id);
```
```css
/* src/styles/motion.css */
[data-vt-name] {
  view-transition-name: attr(data-vt-name type(<custom-ident>));
}
```
*Note: `attr()` for `view-transition-name` is part of CSS Values Level 5 and available in Chrome 117+, Firefox 128+. Ship with `@supports` guard.*

---

## 4. Staleness Tooltip — CSS Anchor Positioning Fallback
`renderStalenessTooltip()` uses `anchor-name` / `position-anchor` / `position-area` which is only Baseline 2025 (Chrome 125+, Safari 18.2+, Firefox 130+).

Required fallback pattern:
```css
/* src/styles/interactions.css */

/* Modern: CSS Anchor Positioning */
@supports (anchor-name: --x) {
  .staleness-wrapper {
    anchor-name: var(--anchor-id);
  }
  .staleness-tooltip {
    position: fixed;
    position-anchor: var(--anchor-id);
    position-area: block-end;
  }
}

/* Fallback: absolute positioning */
@supports not (anchor-name: --x) {
  .staleness-wrapper {
    position: relative;
  }
  .staleness-tooltip {
    position: absolute;
    top: calc(100% + var(--space-1));
    left: 0;
    z-index: var(--z-tooltip);
  }
}
```
The inline `style="anchor-name: ..."` and `style="position-anchor: ..."` strings in `gist-card.ts` must be replaced with `data-anchor-id` attributes resolved by the CSS above.

---

## 5. Sync Indicator
File: `src/components/app.ts` — `updateSyncIndicator()`

Current state: a coloured dot with `<span class="sr-only">` text.

Required state:
```html
<!-- data-status drives CSS colour via attribute selector -->
<div id="sync-indicator" data-status="syncing" aria-live="polite" aria-atomic="true">
  <span class="sync-dot" aria-hidden="true"></span>
  <span class="sync-label">Syncing 3</span>   <!-- visible, not sr-only -->
</div>
```
```css
/* src/styles/navigation.css */
#sync-indicator .sync-label { display: inline; font-size: var(--text-xs); }

@media (max-width: 639px) {
  #sync-indicator .sync-label { display: none; } /* dot only on mobile */
}
```

---

## 6. Empty State & Loading Skeleton Contract
Files: `src/styles/empty-state.css`, `src/components/gist-list.ts`

Every async list boundary MUST render one of:

| State | Component |
|-------|-----------|
| **Loading** (first paint) | `<gist-card-skeleton>` × 3 (shimmer) |
| **Empty** (authenticated, no gists) | `<empty-state>` with CTA |
| **Empty** (unauthenticated) | Redirect to `/login` |
| **Error** | `<error-boundary>` with retry |

### Skeleton CSS
```css
/* src/styles/empty-state.css */
.skeleton-card {
  background: linear-gradient(
    90deg,
    var(--color-surface-variant) 25%,
    var(--color-surface-variant-bright) 50%,
    var(--color-surface-variant) 75%
  );
  background-size: 200% 100%;
  animation: shimmer var(--motion-duration-slow) var(--motion-ease-standard) infinite;
  border-radius: var(--gist-card-radius);
  height: 120px;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-card { animation: none; opacity: 0.6; }
}
```

---

## 7. Accessibility Checklist (per component)

- [ ] All interactive elements reachable by Tab / Shift+Tab
- [ ] Visible `:focus-visible` ring using `--color-focus-ring` token
- [ ] `aria-label` or visible text label on every icon-only button
- [ ] Modal / sheet: focus trap active on open, focus restored on close
- [ ] `aria-live="polite"` on dynamic status regions (sync, toast)
- [ ] Colour contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- [ ] No information conveyed by colour alone (use icon + text)
- [ ] `prefers-reduced-motion` respected for all animations

---

## 8. CSS Layer Order
```css
/* src/styles/base.css — @layer declaration (must be first) */
@layer reset, tokens, base, layout, components, utilities, overrides;
```
All new stylesheets must declare their layer membership. Unlayered styles win over all layers — avoid them.

---

## 9. Commit & PR Conventions for UI Changes

| Type | Scope example | When to use |
|------|---------------|-------------|
| **feat(ui):** | `feat(ui): add skeleton loading to gist list` | New visible UI |
| **fix(ui):** | `fix(ui): correct focus trap in bottom sheet` | Bug in existing UI |
| **refactor(ui):** | `refactor(ui): migrate inline styles to token pipeline` | No behaviour change |
| **style(tokens):** | `style(tokens): add --gist-card-radius to component tokens` | Token-only change |
| **a11y:** | `a11y: add aria-live to sync indicator` | Accessibility fix |
| **docs(design):** | `docs(design): update DESIGN.md with nav contract` | This file |

---

## 10. Related Issues

- [ ] #TBD — Nav surface exclusivity (CSS media query pattern)
- [ ] #TBD — Gist card: sentence-case labels + SVG icon buttons
- [ ] #TBD — Code preview: remove JS slice, add CSS line-clamp
- [ ] #TBD — Staleness tooltip: CSS Anchor Positioning fallback
- [ ] #TBD — Sync indicator: visible text label
- [ ] #TBD — Mobile bottom sheet: WCAG focus trap
- [ ] #TBD — Inline styles → design token pipeline
