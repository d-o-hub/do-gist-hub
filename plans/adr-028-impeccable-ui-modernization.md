# ADR-028: Impeccable UI Modernization

**Status:** complete  
**Date:** 2026-06-27  
**Tool:** [pbakaus/impeccable](https://github.com/pbakaus/impeccable) v3.1.0 (installed at `.agents/skills/impeccable/`)

## Context

Ran `npx impeccable detect src/` and performed a manual audit against all 44 Impeccable deterministic rules plus the SKILL.md design guidance. The CLI found 1 programmatic issue; manual analysis against Impeccable guidelines surfaced 7 additional design concerns.

## Audit Findings

### CLI Detector (1 finding)

| # | Rule | File | Line | Severity |
|---|------|------|------|----------|
| 1 | `bounce-easing` | `src/styles/generated/tokens.css` | 77 | warning |

The `--motion-easing-elastic: cubic-bezier(0.68, -0.55, 0.265, 1.55)` token is defined but **never consumed** in any CSS rule. Dead code.

### Manual Audit (Impeccable SKILL.md criteria)

| # | Issue | Impeccable Rule | Severity | Scope |
|---|-------|-----------------|----------|-------|
| 2 | **Arbitrary z-index values** (100, 899, 900, 9999) | "Build a semantic z-index scale" | medium | 5 files, 9 declarations |
| 3 | **Inter as body font** | "Don't use overused fonts (Inter, system defaults)" | medium | Global via `--font-body` |
| 4 | **Glassmorphism as decorative default** | "Blurs and glass cards used decoratively — rare and purposeful, or nothing" | high | `modern-glass.css`, navigation (blur 80px on cards, 20px on nav) |
| 5 | **Infinite glow-pulse on active nav** | Dated "dark glow" AI tell | medium | `motion.css` line 109 |
| 6 | **Uppercase overuse** (20 declarations) | "Tiny uppercase tracked eyebrow" anti-pattern | low-medium | 5 CSS files |
| 7 | **No body text line-length cap** | "Cap body line length at 65–75ch" | medium | No `max-width: *ch` anywhere |
| 8 | **Dead elastic easing token** | Dead code / technical debt | low | `tokens.css` + `css-variables.ts` |

### Clean Areas (no issues)

- ✅ Letter-spacing: -0.01 to -0.02em (above -0.04em floor)
- ✅ No gradient text (`background-clip: text`)
- ✅ No side-stripe borders
- ✅ No bounce/elastic easing in use
- ✅ Comprehensive `prefers-reduced-motion` support
- ✅ OKLCH color system with perceptual uniformity
- ✅ Container queries for component-level responsiveness
- ✅ Scroll-driven animations with graceful degradation
- ✅ View Transitions API integration
- ✅ `text-wrap: balance` / `pretty` progressive enhancement
- ✅ 44px minimum touch targets on coarse pointers
- ✅ Forced-colors / high-contrast media support

---

## Modernization Plan

### Phase 1: Quick Wins (Low Risk, High Impact)

#### 1.1 Remove dead elastic easing token
- Delete `--motion-easing-elastic` from `src/tokens/css-variables.ts` and the generated tokens
- Resolves the only CLI detector finding

#### 1.2 Add prose line-length cap
- Add `max-width: 65ch` to `.gist-card-description`, `.confirm-message`, `.error-message`, `.form-error`, and any prose container
- Already has `max-width` on `--spacing-v80` for some elements but not in `ch` units for proper typographic measure

#### 1.3 Semantic z-index scale
- Define token-based z-index ramp in design tokens:
  ```
  --z-sticky: 10;
  --z-dropdown: 20;
  --z-overlay: 30;
  --z-modal-backdrop: 40;
  --z-modal: 50;
  --z-toast: 60;
  --z-tooltip: 70;
  ```
- Replace all 9 arbitrary z-index declarations with semantic tokens
- Map current values: header/bottom-nav (100→`--z-sticky`), backdrop (899→`--z-modal-backdrop`), command-palette/bottom-sheet (900→`--z-modal`), scroll-progress/confirm/skip-link (9999→`--z-toast`)

#### 1.4 Kill glow-pulse on active nav
- Remove `animation: glow-pulse 3s ease-in-out infinite` from `.nav-item.active`
- Replace with a subtle accent border or solid `box-shadow: 0 0 0 1px var(--color-accent)` — functional, not decorative

### Phase 2: Design System Refinement (Medium Risk)

#### 2.1 Reduce glassmorphism to purposeful use
- **Keep** backdrop-filter on:
  - Command palette backdrop (overlay — purposeful occlusion)
  - Confirm overlay (modal — purposeful occlusion)
- **Remove/reduce** backdrop-filter on:
  - `.glass-card` default: replace `blur(80px)` with a solid `background: var(--color-surface)` with subtle border. 80px blur is GPU-expensive and purely decorative for card surfaces.
  - Navigation header: reduce from `blur(20px)` to `blur(8px)` (enough for legibility over scroll, not a decorative statement)
  - Bottom nav / rail-nav / sidebar-nav: remove blur entirely — these are fixed chrome, not overlays. Use solid `background: var(--color-nav-bg)`.
- Net result: backdrop-filter stays for overlays (2 uses), removed from 6 decorative uses

#### 2.2 Reduce uppercase overuse
- Audit all 20 `text-transform: uppercase` declarations
- Keep for: filter chips, micro-labels (functional "badge" role), section headers in nav
- Remove from: `.gist-card-title`, `.detail-title`, `.conflict-item-title`, `.confirm-title`, `.empty-state-title` — these are display headings and should use Anton's natural case for readability
- Target: reduce from 20 → ~10 declarations (only where uppercase serves a clear labeling function)

#### 2.3 Consider Inter replacement (evaluate, not mandate)
- Inter is flagged as overused but is well-suited for product UI
- **Option A (conservative):** Keep Inter but add a `config.json` note acknowledging the choice is deliberate
- **Option B (modernize):** Swap to a less saturated alternative:
  - `Geist` (Vercel's system, excellent for developer tools)
  - `General Sans` (humanist, pairs well with mono)
  - `Plus Jakarta Sans` (geometric but distinctive)
- Decision: defer to user preference. The font pairing (Inter body + Anton display) does provide contrast axis (geometric + grotesque display), which Impeccable approves.

### Phase 3: Advanced Polish (Lower Priority)

#### 3.1 Font loading optimization
- Currently loaded via `@fontsource-variable/*` packages (JS imports in main.ts)
- Add `font-display: swap` declaration if not already present in fontsource output
- Consider preloading the primary weight via `<link rel="preload">` in index.html for FOIT reduction

#### 3.2 Motion refinement
- The card stagger cascade and scroll-driven animations are well-implemented
- Consider adding `content-visibility: auto` check on the glow-pulse removal (already has `content-visibility` for cards)

---

## Decision

All three phases implemented in a single pass on 2026-06-27:

- **Phase 1** ✅ Dead elastic token removed, 65ch line caps added, semantic z-index tokens adopted, glow-pulse replaced with solid indicator.
- **Phase 2** ✅ Glassmorphism removed from cards/nav (kept for overlays only), uppercase removed from 6 display headings, color palette tinted toward brand hue (220°).
- **Phase 3** ✅ `font-display: swap` already set by @fontsource; `content-visibility: auto` already in place; no further action needed.
- **Inter font**: kept — it provides a genuine contrast axis with Anton display, and the deliberate choice is documented in `DESIGN.md`.
- `npx impeccable detect src/` passes with **0 findings**.
- `DESIGN.md` created as the project's design language document.

## Consequences

- Removes AI design "tells" per Impeccable criteria
- Improves GPU performance by removing 80px blur on default card surfaces
- Better typographic readability with ch-based line-length caps
- Semantic z-index prevents stacking context bugs
- Preserves the existing design system's strengths (tokens, OKLCH, container queries, a11y)
