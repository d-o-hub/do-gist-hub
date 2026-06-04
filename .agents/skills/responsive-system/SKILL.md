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
