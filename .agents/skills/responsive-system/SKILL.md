---
name: responsive-system
description: Define responsive behavior with 7 breakpoints, mobile-first design, fluid typography, and safe area support.
version: '0.1.0'
template_version: '0.1.0'
---

# Responsive-system Skill

Implement comprehensive responsive design system with 7 breakpoints and mobile-first approach.

## When to Use

- Setting up responsive layout
- Creating fluid typography
- Adapting components for different screen sizes
- Supporting safe areas on notched devices

## Breakpoint Definitions

```typescript
// src/tokens/responsive/breakpoints.ts
export const breakpoints = {
  phoneSmall: 320,    // Smallest phones
  phone: 390,         // Modern phones (iPhone 12/13/14)
  phoneLarge: 480,    // Large phones
  tabletPortrait: 768, // Portrait tablets
  tabletLandscape: 1024, // Landscape tablets
  desktop: 1280,      // Standard desktops
  desktopWide: 1536,  // Wide desktops
} as const;

export const breakpointQueries = {
  phoneSmall: '(min-width: 320px)',
  phone: '(min-width: 390px)',
  phoneLarge: '(min-width: 480px)',
  tabletPortrait: '(min-width: 768px)',
  tabletLandscape: '(min-width: 1024px)',
  desktop: '(min-width: 1280px)',
  desktopWide: '(min-width: 1536px)',
} as const;
```

## CSS Custom Properties

```css
/* src/styles/responsive.css */
:root {
  /* Container padding */
  --container-padding: 1rem;
  --container-max-width: 100%;

  /* Spacing density */
  --spacing-density: compact;
  --gap-size: 0.5rem;

  /* Font sizes */
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
}

@media (min-width: 390px) {
  :root {
    --container-padding: 1.25rem;
    --gap-size: 0.75rem;
    --font-size-base: 1rem;
  }
}

@media (min-width: 768px) {
  :root {
    --container-padding: 1.5rem;
    --container-max-width: 720px;
    --gap-size: 1rem;
    --font-size-base: 1.0625rem;
  }
}

@media (min-width: 1024px) {
  :root {
    --container-padding: 2rem;
    --container-max-width: 960px;
    --gap-size: 1.25rem;
    --font-size-base: 1.125rem;
  }
}

@media (min-width: 1280px) {
  :root {
    --container-max-width: 1200px;
    --gap-size: 1.5rem;
    --font-size-base: 1.125rem;
  }
}

@media (min-width: 1536px) {
  :root {
    --container-max-width: 1440px;
    --gap-size: 2rem;
    --font-size-base: 1.1875rem;
  }
}
```

## Fluid Typography

```css
/* src/styles/typography.css */
:root {
  --font-size-h1: clamp(1.5rem, 4vw + 0.5rem, 2.5rem);
  --font-size-h2: clamp(1.25rem, 3vw + 0.5rem, 2rem);
  --font-size-h3: clamp(1.125rem, 2vw + 0.5rem, 1.5rem);
  --font-size-body: clamp(1rem, 1vw + 0.5rem, 1.125rem);
  --font-size-small: clamp(0.875rem, 0.5vw + 0.5rem, 1rem);
}

h1 { font-size: var(--font-size-h1); }
h2 { font-size: var(--font-size-h2); }
h3 { font-size: var(--font-size-h3); }
body { font-size: var(--font-size-body); }
small { font-size: var(--font-size-small); }
```

## Safe Area Support

```css
/* src/styles/safe-area.css */
.app-shell {
  padding-top: env(safe-area-inset-top);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
}

/* Notch-aware navigation */
.navigation {
  padding-left: max(1rem, env(safe-area-inset-left));
  padding-right: max(1rem, env(safe-area-inset-right));
}

/* Bottom safe area for FABs and toolbars */
.bottom-toolbar {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

## Touch Target Requirements

```css
/* src/styles/touch-targets.css */
button,
a,
[role="button"],
input[type="submit"],
input[type="button"] {
  min-width: 44px;
  min-height: 44px;
}

/* Small icon buttons get padding to meet minimum */
.icon-button {
  padding: 12px;
  min-width: 44px;
  min-height: 44px;
}
```

## Responsive Component Pattern

```typescript
// src/components/responsive-container.ts
export function createResponsiveStyles() {
  return {
    container: `
      width: 100%;
      max-width: var(--container-max-width);
      margin-left: auto;
      margin-right: auto;
      padding-left: var(--container-padding);
      padding-right: var(--container-padding);
    `,
    grid: `
      display: grid;
      gap: var(--gap-size);
      grid-template-columns: 1fr;
    `,
  };
}

// Tablet and up
const tabletGrid = `
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

// Desktop and up
const desktopGrid = `
  @media (min-width: 1280px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;
```

## Narrow-Viewport Composition Patterns

These patterns were added in plan 066 (responsive recomposition) to fix
desktop layouts that were being squished or amputated at 320–480px viewports
instead of being recomposed.

### Pattern 1: Long content word-break on user input

Any element that can receive user input (titles, descriptions, file names,
URLs) must declare a wrapping strategy. The default browser behavior is to
allow overflow, which is a bug for app UI.

```css
.title,
.description,
.file-name {
  word-break: break-word;
  overflow-wrap: anywhere;
  min-width: 0;
  flex: 1 1 auto;
}

/* URL cells: break at any character to prevent horizontal overflow */
.file-info-left a {
  word-break: break-all;
}
```

### Pattern 2: Narrow-phone (≤389.98px) trim

The 480px breakpoint is too generous for iPhone SE (320px). Any row that
contains a flex-shrink candidate (title) plus right-aligned actions needs
a `(max-width: 389.98px)` block that tightens gap, padding, and font-size.

```css
/* Default: 480px+ gets larger padding */
@media (min-width: 480px) {
  .app-header { padding: var(--space-3) var(--space-4); }
  .app-title { font-size: var(--text-lg); }
}

/* Narrow phone: trim for 320-389px viewports */
@media (max-width: 389.98px) {
  .app-header {
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    /* Safe-area insets preserved at every width */
    padding-top: calc(var(--space-2) + env(safe-area-inset-top, 0px));
  }
  .app-title { font-size: var(--text-base); }
  .header-right { gap: var(--space-1); }
}
```

### Pattern 3: Action button rows collapse to 2-col grid

Action rows (detail actions, form actions, edit actions) must collapse to
a 2-column grid at ≤480px, with the primary action spanning full width.
On phones ≤767px, flip to `flex-direction: column-reverse` so the primary
action appears first (thumb-zone reachable, no need to scroll to the
bottom of a 3-row form to submit).

```css
.gist-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* ≤480px: 2-col grid, primary spans full row */
@media (max-width: 480px) {
  .gist-detail-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .gist-detail-actions .btn[data-action="star"] {
    grid-column: 1 / -1;
  }
}

/* Form actions: column-reverse for thumb reach */
@media (max-width: 767px) {
  .form-actions {
    flex-direction: column-reverse;
  }
  .form-actions .btn {
    width: 100%;
    justify-content: center;
  }
}
```

### Pattern 4: Sticky rail nav with safe-area bottom

`position: sticky; top: 0; height: 100dvh` must be paired with
`min-height: 100dvh`, `padding-bottom: calc(var(--space-N) + env(safe-area-inset-bottom))`,
and `overflow-y: auto` so content never clips under the iOS home
indicator. Rail items use `flex-direction: column` with `word-break: break-word`
so labels wrap or truncate consistently inside the 72px column.

```css
.rail-nav {
  position: sticky;
  top: 0;
  height: 100dvh;
  min-height: 100dvh;
  padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
  overflow-y: auto;
  overflow-x: hidden;
}

.rail-item {
  flex-direction: column;
  gap: var(--spacing-1);
  width: 100%;
  text-align: center;
  white-space: normal;
  word-break: break-word;
  hyphens: auto;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

### Pattern 5: Viewport-aware comparison grid

Conflict comparison grids and similar side-by-side surfaces should have
viewport-aware padding and gap values, not single values at all sizes.
Long filenames need `min-width: 0; flex: 1 1 auto` on the filename cell
and `flex-shrink: 0` on the secondary stat (file size, timestamp).

```css
.comparison-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  padding: var(--space-4);
}
@media (min-width: 768px) {
  .comparison-grid { gap: var(--space-6); padding: var(--space-6); }
}
@media (min-width: 1024px) {
  .comparison-grid {
    grid-template-columns: 1fr 1fr;
    padding: var(--space-6) var(--space-8);
  }
}
@media (min-width: 1280px) {
  .comparison-grid {
    padding: var(--space-8) var(--space-10);
    max-width: 1400px;
    margin: 0 auto;
  }
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1 1 auto;
}
.file-size {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
```

### Pattern 6: Filter header stacks on narrow phones

Any flex row that contains a flex-shrink candidate (filter chips) plus
a fixed-width control (sort select) must stack vertically at ≤480px so
neither element overflows.

```css
.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}
@media (max-width: 480px) {
  .filter-header {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }
  .filter-header #sort-select {
    width: 100%;
    min-width: 0;
  }
}
```

## Token-Driven Responsive Components

When adding a new component with responsive behavior, follow this order:

1. Add the breakpoint values to `src/tokens/responsive/breakpoints.ts` (only
   if the new breakpoint doesn't exist; 7 are already defined).
2. Add component dimensions to `src/tokens/component/<category>.ts` (e.g.
   `navigation.ts` for nav surfaces, `cards.ts` for cards).
3. Wire the token to a CSS custom property in `src/tokens/css-variables.ts`.
4. Reference the CSS custom property from your stylesheet. Never hardcode
   the breakpoint value or the component dimension in the stylesheet.
5. Run `pnpm run build` to regenerate `public/design-tokens.css`.
6. Run `pnpm exec vitest run tests/unit/css-variables.test.ts -u` to
   update the snapshot.

Example: adding a new responsive filter input

```typescript
// src/tokens/component/filter.ts (new file or existing)
export const filterTokens = {
  input: {
    minHeight: '44px',       // touch target
    minWidth: '120px',       // prevent squish at any viewport
    fullWidthBreakpoint: 480, // stack below this
  },
} as const;
```

```typescript
// src/tokens/css-variables.ts — add to the existing :root block
--filter-input-min-height: ${filterTokens.input.minHeight};
--filter-input-min-width: ${filterTokens.input.minWidth};
```

```css
/* src/styles/filter.css — no hardcoded values */
.filter-input {
  min-height: var(--filter-input-min-height);
  min-width: var(--filter-input-min-width);
}

@media (max-width: 480px) {
  .filter-input { width: 100%; }
}
```

## Project-Specific Breakpoint Reference

The breakpoint scale used by this project (`src/tokens/responsive/breakpoints.ts`):

| Name             | px  | Use case                                                |
| ---------------- | --- | ------------------------------------------------------- |
| `phone-small`    | 320 | iPhone SE — narrowest target viewport                   |
| `phone`          | 390 | Modern iPhone baseline                                  |
| `phone-large`    | 480 | Large phones — last narrow-column layout                |
| `tablet-small`   | 640 | Small tablets, phone landscape                          |
| `tablet-portrait`| 768 | iPad portrait — nav rail starts here                    |
| `tablet-landscape` | 1024 | iPad landscape — sidebar starts here                |
| `desktop`        | 1280 | Laptop — three-column gist grid                     |
| `desktop-wide`   | 1536 | Ultrawide — max container width                    |

CSS custom properties are generated as `--bp-{name}` in `public/design-tokens.css`
and exposed at runtime via `getComputedStyle(document.documentElement)`.


## Gotchas

- **Mobile First**: Design for 320px first, then scale up
- **No Horizontal Scroll**: Content must fit viewport width at all breakpoints
- **Fluid Over Discrete**: Use clamp() and smooth scaling over hard breakpoints
- **Density Shifts**: Adjust spacing and font sizes, not just layout
- **Safe Areas**: Test on notched devices (iPhone 12+, Android notched phones)
- **Touch Targets**: Minimum 44x44px on mobile, maintain at all sizes
- **Test Real Devices**: Emulation is helpful but test on actual devices

## Required Outputs

- `src/tokens/responsive/breakpoints.ts` - Breakpoint definitions
- `src/styles/responsive.css` - Responsive CSS variables
- `src/styles/typography.css` - Fluid typography
- `src/styles/safe-area.css` - Safe area support
- `src/styles/touch-targets.css` - Touch target requirements
- Responsive container/grid components

## Verification

```bash
# Test responsiveness
npm run dev

# Check on multiple viewports
# 320px, 390px, 768px, 1024px, 1280px, 1536px

# Run mobile tests
npm run test:mobile

# Verify no horizontal scroll
# Resize browser from 320px to 1536px+
```

## References

- `AGENTS.md` - Responsive design rules
- `design-token-system` skill - Token architecture
- https://web.dev/ - Web best practices
