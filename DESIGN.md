# DESIGN.md

> Design language for d.o. Gist Hub — an offline-first GitHub Gist management PWA.

## Register

**Product UI** — design serves the product. The interface is a developer tool for managing code snippets. Clarity, speed, and information density take priority over visual expression.

## Color

### Strategy: Restrained

Tinted neutrals + one accent ≤ 10%. The accent (blue, hue 220°) is used for interactive affordances and focus indicators only.

### Dark Mode (Default)

| Role | Value | Notes |
|------|-------|-------|
| Background primary | `#0b0e14` | Blue-tinted near-black (OKLCH L≈0.07, C≈0.01, H≈220) |
| Background secondary | `#0f1219` | Subtle elevation step |
| Background tertiary | `#151a23` | Cards, code blocks |
| Background elevated | `#1c2230` | Popovers, dropdowns |
| Foreground primary | `#eef2f7` | Body text — cool white |
| Foreground muted | `#6b7a8d` | Secondary info, timestamps |
| Accent primary | `#5b9cf5` | Links, active states, buttons |
| Accent hover | `#82b6f8` | Hover lift |
| Border default | `#1e2736` | Subtle separation |
| Border emphasis | `#2d3a4d` | Section dividers |

### Light Mode

| Role | Value | Notes |
|------|-------|-------|
| Background primary | `#f8f9fc` | Cool off-white |
| Background secondary | `#f0f2f7` | Subtle tint for sections |
| Background elevated | `#ffffff` | Cards, modals |
| Foreground primary | `#0c1322` | Near-black with blue cast |
| Foreground muted | `#5a6b82` | Labels, meta |
| Accent primary | `#2563eb` | Blue-600 |
| Border default | `#dde3ef` | Cool gray border |

### Rules

- All neutrals carry 0.005–0.015 chroma toward brand hue (220°). No pure gray/black.
- `color-scheme: dark` / `light` set on `:root` / `[data-theme="light"]`.
- OKLCH used for accent ramp and color-mix operations.
- Status colors: green (success), red (error), yellow (warning), blue (info) — unambiguous.

## Typography

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| Body | Inter Variable | 400–500 | Geometric sans; readable at small sizes |
| Display | Anton | 900 | Tight grotesque for headings; natural case (no uppercase) |
| Mono | JetBrains Mono Variable | 400–700 | Code, stats, file names |

### Rules

- Display headings use natural case — not `text-transform: uppercase`.
- `uppercase` reserved for functional labels: chips, badges, form labels, nav section titles.
- Body text capped at `max-width: 65ch` for readability.
- `text-wrap: balance` on h1–h3; `text-wrap: pretty` on prose.
- `letter-spacing` on display: -0.01em to -0.02em max (above -0.04em floor).
- Font sizes use fluid `clamp()` with viewport-relative middle value.

## Spacing

Token-driven via `--spacing-v{n}` scale (0.125rem increments). Responsive container padding via `--spacing-container` media queries.

- Base unit: 4px (0.25rem)
- Scale: 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 60, 80, 96

## Layout

- **Mobile-first**: single column, bottom nav (320–767px)
- **Tablet**: rail nav (768–1023px), grid layout
- **Desktop**: sidebar nav (1024px+), 3-column gist grid
- Grid uses `display: grid` with `grid-template-columns` at breakpoints
- Container queries (`container-type: inline-size`) on cards, settings, detail views
- `100dvh` for app shell height
- `env(safe-area-inset-*)` for notch/gesture-bar devices

## Elevation

- No decorative glassmorphism. Cards use solid `background: var(--color-surface)` with `border` and `box-shadow`.
- `backdrop-filter: blur()` reserved exclusively for overlays: command palette, confirm dialog, bottom sheet backdrop.
- Shadow ramp uses OKLCH alpha via `@supports (color: oklch(0 0 0))`.
- Z-index uses semantic scale tokens: `--z-index-sticky` (1100) → `--z-index-tooltip` (1800).

## Motion

- Easing: exponential out (`cubic-bezier(0.16, 1, 0.3, 1)`) for exits, smooth (`cubic-bezier(0.4, 0, 0.2, 1)`) for standard, spring (`linear()`) for interactive feedback.
- No bounce/elastic easing.
- Stagger cascade on card lists (20ms base, capped at 280ms).
- Scroll-driven animations (`animation-timeline: view()`) for card reveals.
- View Transitions API for route changes.
- `@media (prefers-reduced-motion: reduce)` kills spatial motion; keeps opacity fades and spinners.
- `content-visibility: auto` for long lists.

## Components

### Buttons

- Min 44×44px touch target (coarse pointer)
- Spring physics press feedback (`scale(0.97)`)
- `aria-busy="true"` spinner state
- Variants: default, primary, ghost, danger

### Cards (`.glass-card`)

- Solid background, no blur
- Hover lift on `(hover: hover)` devices only
- Container queries for internal layout adaptation
- `view-transition-name` for route morphs

### Navigation

- Bottom nav (mobile), rail (tablet), sidebar (desktop)
- Solid backgrounds — no transparency or blur
- Active indicator: `box-shadow: inset 0 -2px 0 var(--color-accent-primary)`
- `::after` scale indicator on active bottom-nav items

### Empty States

- Centered, padded container with icon, title, description, action buttons
- Stagger animation on action buttons
- `text-wrap: balance` on title

## Accessibility

- WCAG 2.2 AA target
- Focus: `outline: 2px solid accent` + `box-shadow` ring
- Skip link (`.skip-link`)
- `prefers-reduced-motion` fully supported
- `prefers-contrast: high` increases border widths
- `forced-colors: active` uses system colors
- Touch targets min 44px on coarse pointers
- `aria-live="polite"` on result counts and status changes

## Anti-Patterns (Banned)

Per Impeccable guidelines — refuse and rewrite if these appear:

- ❌ Decorative glassmorphism on cards/nav
- ❌ Infinite glow/pulse animations
- ❌ Bounce/elastic easing
- ❌ `text-transform: uppercase` on display headings
- ❌ Arbitrary z-index values (use semantic tokens)
- ❌ `backdrop-filter` on non-overlay elements
- ❌ Pure gray/black without brand tint
- ❌ Side-stripe borders, gradient text
- ❌ Purple-to-blue gradients
