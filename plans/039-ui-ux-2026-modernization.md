# 039 — UI/UX 2026 Modernization

> **Date**: 2026-05-16
> **Type**: Feature plan
> **Status**: 🟢 Complete — Phase A implemented, Phase B/C completed via plan 040
> **Related**: [adr-007-ui-ux-modernization.md](adr-007-ui-ux-modernization.md), [adr-022-2026-ui-trends-recommendations.md](adr-022-2026-ui-trends-recommendations.md), [038-codebase-audit-recommendations-2026-05-16.md](038-codebase-audit-recommendations-2026-05-16.md)

---

## Why now

ADR-022 (early 2026) shipped dark-mode-first, variable fonts, bento grid, glassmorphism, and spring physics. Browsers have moved further in the months since:

- **View Transitions Level 2 cross-document** — production-shippable in Chromium/Safari since May 2026.
- **Anchor positioning** (`anchor-name`, `position-anchor`, `position-try-fallbacks`) — broadly supported; allows tooltips & popovers without JS positioning libraries.
- **Popover API** (`popover` attribute + `:popover-open`) — top-layer, auto-dismiss; replaces dialog hacks.
- **OKLCH + `color-mix()`** — perceptually uniform color math; enables themeable accents without re-defining 20 stops.
- **Scroll-driven animations** (`animation-timeline: view()` / `scroll()`) — GPU, no JS, no Intersection Observers.
- **`@scope`** — locally scoped CSS without BEM gymnastics.
- **Speculation Rules** — paired with View Transitions, eliminates the perceived "blank skeleton" between routes.
- **`content-visibility: auto`** — measurable LCP wins on long gist lists (called out by TRIZ #3 in [037](037-progress-update-2026-07-18.md)).

This plan modernizes the look-and-feel **without** breaking the existing design-token contract.

---

## Goals & Non-Goals

### Goals

- Native, App-Store-class transitions between routes (home → detail → edit).
- Eliminate JS-side floating-UI logic; lean on anchor positioning + Popover API.
- Adopt OKLCH for the brand + accent ramp; expose a `--accent-h` user knob.
- Add scroll-driven reveal/parallax for the home bento grid.
- Reduce LCP on lists with `content-visibility: auto`.
- Maintain WCAG 2.2 AA, `prefers-reduced-motion`, and full keyboard support.
- Preserve dark-mode-first; no regressions to light theme.

### Non-Goals

- New components or routes (out of scope; see plan 038 F1–F7 for product work).
- Backend or auth changes (see [ADR-028](adr-028-github-app-vs-pat-2026.md)).
- Replacing variable fonts, removing glassmorphism, or rewriting tokens.

---

## Phase A — Shipped with this plan (focused, low-risk wins)

The following land in the same commit as this document:

| Change | File | Effect |
| --- | --- | --- |
| Cross-document view transitions opt-in | `src/styles/motion.css` | `@view-transition { navigation: auto; }` so SPA navigations animate by default. |
| `view-transition-name` on gist cards | `src/styles/motion.css` | Cards morph into the detail page hero on click (paired with existing `viewTransitionNames` in `src/utils/view-transitions.ts`). |
| OKLCH accent ramp + `color-mix()` | `src/styles/base.css` | New `--accent`, `--accent-soft`, `--accent-strong` derived from `--accent-h` (hue knob, default 220). |
| Scroll-driven header collapse | `src/styles/motion.css` | Header shrinks and gains contrast on scroll using `animation-timeline: scroll()`. |
| `content-visibility: auto` on cards | `src/styles/motion.css` | Off-screen gist cards skipped during paint. |
| Reduced-motion guard | `src/styles/motion.css` | All new motion gated by `@media (prefers-reduced-motion: no-preference)`. |
| `@supports` fallbacks | `src/styles/motion.css` | Safari/Firefox without scroll-timeline degrade to a static header. |

These are CSS-only; no test suites change, no API touched, biome + tsc clean.

---

## Phase B — Next sprint (P1)

| Item | Rationale | Effort |
| --- | --- | --- |
| Convert `command-palette` + tooltips to Popover API + anchor-positioning | -200 LOC JS; better a11y; auto top-layer | M |
| Speculation Rules `<script type="speculationrules">` for likely detail navigations | Pairs with cross-doc VT to remove skeleton flash | S |
| `@scope` blocks in `gist-card.css`, `bento.css` | Drops global selector collisions | M |
| User-selectable accent hue in Settings | One-line `--accent-h` knob; persisted in IndexedDB metadata | S |
| `text-wrap: pretty` + `text-wrap: balance` on headings/captions | Better typography for free | XS |
| Replace `box-shadow` ramps with `--shadow-{xs..2xl}` OKLCH values | More uniform depth in dark mode | M |

---

## Phase C — Stretch (P2, gated on Phase A telemetry)

| Item | Rationale | Effort |
| --- | --- | --- |
| Cross-document view transitions for **navigation outside the SPA** (e.g., GitHub deep links) | Premium native feel | M |
| 3D nested view-transition groups (VT2 §7) for card → modal morphs | Premium polish | L |
| `interpolate-size: allow-keywords` for height auto animations on accordions | New 2026 capability | S |
| `field-sizing: content` on token paste textarea | Native auto-resize | XS |
| Dynamic Viewport-anchored bento grid using `:has()` + container queries | Layout that adapts to content density | M |
| Color-scheme-aware `accent-color` for form controls | Free dark-mode polish | XS |

---

## Browser support strategy

```diagram
╭──────────────────────────────────────────────────╮
│ Capability                       │ Strategy      │
├──────────────────────────────────┼───────────────┤
│ @view-transition (cross-doc)     │ Progressive   │
│ anchor-name / position-anchor    │ Progressive   │
│ Popover API                      │ Polyfill OFF  │
│ OKLCH + color-mix()              │ Required *    │
│ animation-timeline: scroll/view  │ Progressive   │
│ content-visibility: auto         │ Progressive   │
│ @scope                           │ Progressive   │
╰──────────────────────────────────┴───────────────╯
* OKLCH is supported in all current Chromium, Safari 16.4+, Firefox 113+;
  fallback values listed below the OKLCH declaration via CSS cascade.
```

All Phase A changes are **gracefully degrading** — older browsers see today's design unchanged. CI Playwright runs against Chromium; cross-browser smoke (Firefox/WebKit) is gated to `main` per plan 038 D7.

---

## Accessibility checklist

- [x] All new animations live inside `@media (prefers-reduced-motion: no-preference)`.
- [x] Focus visible on cards before/after view transition; relies on browser default focus-visible preservation (VT spec §1.5).
- [ ] Tab order verified through morphing card → detail (Phase B test).
- [ ] Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text after OKLCH conversion (auto-checked by `pnpm test:a11y`).
- [ ] Popover-based tooltips announce via `aria-describedby`.

---

## Validation

```bash
pnpm run typecheck                       # tsc clean
pnpm run lint                            # biome clean
pnpm run test:unit                       # vitest
pnpm run test:a11y                       # playwright + axe
pnpm run analyze                         # bundle: must not grow
./scripts/quality_gate.sh                # all gates
```

Visual diffs via `pnpm run test:visual` on the home + detail routes; baseline updated in the same PR.

---

## Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| View transitions can hang in headless CI (already mitigated in `view-transitions.ts`). | Existing automated-environment detector still guards JS path; CSS path is opt-in via `@view-transition` and respects `prefers-reduced-motion`. |
| OKLCH visual drift vs hex baseline. | Phase A clamps OKLCH outputs to the existing token range; visual regression baseline updated only after side-by-side review. |
| Scroll-driven header animation could cause layout shift. | Use `transform` + `opacity` only — no layout-affecting properties; CLS budget enforced by Lighthouse CI (plan 038 B4). |
| Anchor-positioning fallback in Firefox 121 is still partial. | Use `position-try-fallbacks` with at-most two fallbacks; gracefully clip if unsupported. |

---

## Cross-references

- [ADR-022](adr-022-2026-ui-trends-recommendations.md) — set the original 2026 direction.
- [Plan 038](038-codebase-audit-recommendations-2026-05-16.md) — F3/F4 (staleness indicator + content-visibility) is implemented here.
- [ADR-007 (UI/UX)](adr-007-ui-ux-modernization.md) — design language baseline kept intact.
- `src/utils/view-transitions.ts` — JS API wrapper; unchanged in Phase A.

*Last updated: 2026-05-16*
