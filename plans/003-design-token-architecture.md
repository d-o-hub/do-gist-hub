<!-- Last Audit: 2026-06-16 -->
# Design Token Architecture

> **Status**: Complete
> **Type**: Plan
> **Created**: 2024-05-15
> **Updated**: 2026-06-16
> **Owner**: agent
> **Related**: adr-001, adr-022, adr-034, 070-goap-design-token-system-audit-and-cleanup.md

## Token Layers

### 1. Primitive Tokens
Raw values without semantic meaning. Defined in `src/tokens/primitives.tokens.json` and TypeScript modules.

- **Colors**: Full palette (gray, zinc, blue, green, red, yellow, orange, purple, pink, teal, cyan) — 50-950 scales
- **Spacing**: 0–100 scale with 0.5 increments (4px base)
- **Typography**: font families, sizes (xs–9xl), weights (thin–black), line heights, letter spacings
- **Radius**: none, sm, md, lg, xl, 2xl, 3xl, full

### 2. Semantic Tokens
Meaningful names tied to use cases. Defined in `src/tokens/semantic.tokens.json`.

- **Background**: primary, secondary, tertiary, elevated
- **Foreground**: primary, secondary, muted, inverse
- **Accent**: primary, hover, active, subtle, glow
- **Border**: default, emphasis, strong, hover
- **Status**: success/error/warning/info (bg, fg, border, subtle)
- **Interactive**: hover, active, focus
- **Surface/Overlay**: overlay-surface, overlay-surface-medium, overlay-surface-heavy, nav-bg, header-bg, modal-bg
- **Skeleton**: shimmer-start, shimmer-mid
- **Dual theme**: full dark + light mode semantic sets

### 3. Component Tokens
Specific to UI components. Generated via Style Dictionary pipeline.

- **Button**: padding (sm/md/lg), font sizes (fluid clamp), min-heights, border-radius, transition
- **Navigation**: bottom-nav height, sidebar width, rail width, header padding, actions gap
- **Cards**: background, border-radius, padding, shadow, shadow-hover
- **UI**: backdrop (bg, blur), glass (bg, border, blur)

### 4. Responsive Tokens
Breakpoint-aware scaling. Defined in `src/tokens/responsive/breakpoints.ts`.

| Token | Width | Use Case |
| --- | --- | --- |
| `--bp-phone-small` | 320px | Small phone |
| `--bp-phone` | 390px | Standard phone |
| `--bp-phone-large` | 480px | Large phone |
| `--bp-tablet-small` | 640px | Small tablet |
| `--bp-tablet-portrait` | 768px | Tablet portrait |
| `--bp-tablet-landscape` | 1024px | Tablet landscape |
| `--bp-desktop` | 1280px | Desktop |
| `--bp-desktop-wide` | 1536px | Wide desktop |

Container query breakpoints: `--cq-sm` (400px) through `--cq-2xl` (800px).

### 5. Motion Tokens
Animation durations and easing curves. Defined in `src/tokens/motion/motion.ts`.

- **Durations**: instant (0ms), fast (150ms), normal (250ms), slow (400ms), deliberate (600ms), pulse (1.2s)
- **Easing**: linear, smooth, out, in, out-expo, in-expo, elastic, spring
- **Legacy aliases**: backward-compatible mappings for ease-in-out, ease-out, ease-in

### 6. Elevation Tokens
Shadows and z-index. Defined in `src/tokens/elevation/shadows.ts`.

- **Shadows**: none, xs, sm, md, lg, xl, 2xl, inner, accent, accent-lg
- **OKLCH shadows**: Enhanced ramp using OKLCH color space for perceptually uniform shadow depth
- **Component shadows**: command-palette, glass-hover
- **Dark/Light variants**: Separate shadow values per theme for correct contrast

## Pipeline

```
src/tokens/*.tokens.json  →  Style Dictionary  →  src/styles/generated/tokens.css
                                                →  src/tokens/generated/tokens.ts
```

1. JSON token definitions (`primitives.tokens.json`, `semantic.tokens.json`, `components.tokens.json`, `motion.tokens.json`, `elevation.tokens.json`, `responsive.tokens.json`)
2. Style Dictionary transforms and generates CSS custom properties + TypeScript exports
3. `base.css` imports `./generated/tokens.css` as the single CSS entry point
4. `css-variables.ts` provides the legacy/public `design-tokens.css` with theme overrides

## Theme System

- **Dark mode first**: `:root` defaults to dark semantic colors
- **Light mode**: `[data-theme="light"]` overrides to light semantic colors
- **OKLCH accent ramp**: `--accent-h`, `--accent-c` with user-tunable hue via settings
- **Accent tints**: `--accent-tint-12`, `--accent-tint-24` via `color-mix(in oklch, ...)`
- **`color-scheme`**: Properly toggled for native form control theming

## Token Aliases (base.css:7-55)

Legacy bridge aliases map short names to generated tokens:
- `--space-N` → `--spacing-vN`
- `--text-*` → `--font-size-*`
- `--shadow-*` → `--shadow-oklch-*`
- `--color-bg`, `--color-text`, `--color-accent` → semantic equivalents

## Known Issues

1. **Recursive `--spacing-N` tokens in css-variables.ts** — dead code where `--spacing-4: var(--spacing-4)` resolves to itself. Working aliases are `--space-N` (real) and `--spacing-vN` (generated). Token cleanup pass planned in GOAP 070.
2. **Biome CSS parser limitation** — `@position-try` with `span-inline-start` keywords not yet supported. Staleness tooltip uses `max-width: min(...)` fallback.

## Implementation Plan

1. ✅ Define token requirements based on UI components
2. ✅ Normalize to DTCG-style format (`$type`, `$value`, `$description`)
3. ✅ Generate CSS custom properties via Style Dictionary
4. ✅ Create TypeScript type definitions
5. ✅ Document token contracts
6. ✅ Validate accessibility (WCAG AA contrast)
7. ✅ Dark mode first with light mode overrides
8. ✅ OKLCH accent ramp with user-tunable hue
9. ✅ Component tokens (button, nav, card, UI)
10. ✅ Responsive container spacing
11. ✅ Reduced motion and high contrast support
12. Token cleanup (recursive aliases, dead code) — tracked in GOAP 070

---

*Created: 2024-05-15. Status: Complete (audited 2026-06-16).*
