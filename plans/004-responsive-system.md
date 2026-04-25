<!-- Last Audit: 2026-04-25 -->
# Plan-004: Responsive System v2

**Status**: Completed (Audited and Verified)
**Date**: 2026-04-25
**Deciders**: UI/UX Agent, Responsive System Skill

## Overview

Comprehensive responsive design system for d.o. Gist Hub covering all 7 breakpoints from 320px mobile to 1536px+ desktop wide. Mobile-first approach with progressive enhancement via CSS container queries and media queries.

## 7-Breakpoint System

| Breakpoint | Width Range | Primary Target | Navigation | Layout |
|-----------|------------|---------------|------------|---------|
| xs (Mobile Small) | 320px | iPhone SE, small Android | Bottom sheet drawer | Single column, stacked |
| sm (Mobile) | 390px | iPhone 14, Pixel 7 | Bottom sheet drawer | Single column, optimized |
| md (Mobile Large) | 480px | Large phones, small tablets | Bottom sheet + rail hybrid | Single column, relaxed |
| lg (Tablet Portrait) | 768px | iPad portrait, tablets | Navigation rail (72px) | Two-column capable |
| xl (Tablet Landscape) | 1024px | iPad landscape, small laptops | Collapsible sidebar (240px) | Multi-column |
| 2xl (Desktop) | 1280px | Laptops, standard monitors | Persistent sidebar (240px) | Full layout |
| 3xl (Desktop Wide) | 1536px+ | Large monitors, ultrawide | Spacious sidebar (280px) | Spacious layout |

## CSS Breakpoint Definitions

```css
/* Mobile First: Base styles apply to 320px+ */
/* No media query needed for xs */

/* sm: 390px+ */
@media (min-width: 390px) {
  :root {
    --app-padding: var(--spacing-4);
    --card-padding: var(--spacing-4);
  }
}

/* md: 480px+ */
@media (min-width: 480px) {
  :root {
    --app-padding: var(--spacing-5);
    --card-padding: var(--spacing-5);
    --nav-drawer-max-height: 80vh;
  }
}

/* lg: 768px+ */
@media (min-width: 768px) {
  :root {
    --nav-mode: rail;
    --nav-width: 72px;
    --app-padding: var(--spacing-6);
    --card-padding: var(--spacing-6);
    --content-max-width: 720px;
  }
  
  .app-shell {
    grid-template-columns: 72px 1fr;
  }
}

/* xl: 1024px+ */
@media (min-width: 1024px) {
  :root {
    --nav-mode: sidebar;
    --nav-width: 240px;
    --content-max-width: 960px;
    --gist-list-columns: 2;
  }
  
  .app-shell {
    grid-template-columns: 240px 1fr;
  }
  
  .gist-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 2xl: 1280px+ */
@media (min-width: 1280px) {
  :root {
    --content-max-width: 1200px;
    --gist-list-columns: 2;
    --app-padding: var(--spacing-8);
  }
}

/* 3xl: 1536px+ */
@media (min-width: 1536px) {
  :root {
    --nav-width: 280px;
    --content-max-width: 1400px;
    --gist-list-columns: 3;
    --app-padding: var(--spacing-10);
  }
  
  .app-shell {
    grid-template-columns: 280px 1fr;
  }
  
  .gist-list {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## Typography Scale (Fluid)

Using `clamp()` for smooth scaling between breakpoints:

```css
:root {
  /* Fluid typography: min at 320px, preferred, max at 1536px */
  --font-size-xs: clamp(0.625rem, 0.6rem + 0.25vw, 0.75rem);    /* 10-12px */
  --font-size-sm: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);   /* 12-14px */
  --font-size-base: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);   /* 14-16px */
  --font-size-lg: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);        /* 16-20px */
  --font-size-xl: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);     /* 20-24px */
  --font-size-2xl: clamp(1.5rem, 1.3rem + 1vw, 2rem);          /* 24-32px */
  --font-size-3xl: clamp(1.875rem, 1.6rem + 1.375vw, 2.5rem);  /* 30-40px */
}
```

## Spacing Scale

```css
:root {
  --spacing-1: 0.25rem;   /* 4px */
  --spacing-2: 0.5rem;    /* 8px */
  --spacing-3: 0.75rem;   /* 12px */
  --spacing-4: 1rem;      /* 16px */
  --spacing-5: 1.25rem;   /* 20px */
  --spacing-6: 1.5rem;    /* 24px */
  --spacing-8: 2rem;      /* 32px */
  --spacing-10: 2.5rem;   /* 40px */
  --spacing-12: 3rem;     /* 48px */
  --spacing-16: 4rem;     /* 64px */
  --spacing-20: 5rem;     /* 80px */
  --spacing-24: 6rem;     /* 96px */
}
```

## Container Queries for Components

Components use container queries for internal responsive behavior:

```css
/* Gist Card Container Query */
.gist-list-item {
  container-type: inline-size;
  container-name: gist-card;
}

@container gist-card (min-width: 400px) {
  .gist-card-header {
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-3);
  }
  
  .gist-card-meta {
    margin-left: auto;
  }
}

@container gist-card (min-width: 600px) {
  .gist-card-content {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--spacing-4);
  }
}

/* App Shell Container Query */
.app-shell {
  container-type: inline-size;
  container-name: app-shell;
}

@container app-shell (min-width: 1024px) {
  .gist-detail-layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--spacing-6);
  }
}
```

## Layout Patterns by Breakpoint

### Mobile (320-767px)

```css
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.app-main {
  flex: 1 0 auto;
  min-height: 0;
  padding: var(--spacing-4);
  padding-bottom: calc(var(--spacing-4) + env(safe-area-inset-bottom, 0px));
}

/* Bottom sheet covers bottom portion */
.nav-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 70vh;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}
```

### Tablet (768-1023px)

```css
.app-shell {
  display: grid;
  grid-template-columns: 72px 1fr;
  min-height: 100dvh;
}

.rail-nav {
  position: sticky;
  top: 0;
  height: 100dvh;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.app-main {
  padding: var(--spacing-6);
  min-height: 0;
}
```

### Desktop (1024px+)

```css
.app-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100dvh;
}

.sidebar-nav {
  position: fixed;
  left: 0;
  top: 0;
  width: 240px;
  height: 100dvh;
  overflow-y: auto;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.app-main {
  margin-left: 240px;
  padding: var(--spacing-8);
  max-width: calc(100vw - 240px);
}

@media (min-width: 1536px) {
  .app-shell {
    grid-template-columns: 280px 1fr;
  }
  
  .sidebar-nav {
    width: 280px;
  }
  
  .app-main {
    margin-left: 280px;
    padding: var(--spacing-10);
    max-width: calc(100vw - 280px);
  }
}
```

## Safe Area Support

```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}

.app-header {
  padding-top: calc(var(--spacing-4) + var(--safe-area-top));
}

.bottom-nav {
  padding-bottom: calc(var(--spacing-2) + var(--safe-area-bottom));
  height: calc(72px + var(--safe-area-bottom));
}

.nav-drawer {
  padding-bottom: var(--safe-area-bottom);
}
```

## Touch Targets

Minimum 44x44px on all interactive elements:

```css
.nav-item,
.btn,
.icon-btn {
  min-width: 44px;
  min-height: 44px;
}

/* Mobile: larger touch targets */
@media (max-width: 767px) {
  .nav-item {
    min-height: 56px;
    padding: var(--spacing-3) var(--spacing-4);
  }
  
  .bottom-nav-item {
    min-height: 72px;
    padding: var(--spacing-2) var(--spacing-3);
  }
}
```

## Dynamic Viewport Units

```css
html {
  /* Use dvh for mobile browsers with dynamic UI */
  height: 100dvh;
}

.app-shell {
  min-height: 100dvh;
  min-height: 100vh; /* Fallback */
}
```

## Testing Coverage

### Playwright Responsive Tests

```typescript
// tests/responsive/layout.spec.ts
const viewports = [
  { name: 'xs', width: 320, height: 568 },
  { name: 'sm', width: 390, height: 844 },
  { name: 'md', width: 480, height: 896 },
  { name: 'lg', width: 768, height: 1024 },
  { name: 'xl', width: 1024, height: 768 },
  { name: '2xl', width: 1280, height: 800 },
  { name: '3xl', width: 1536, height: 900 },
];

for (const viewport of viewports) {
  test.describe(`${viewport.name} (${viewport.width}px)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
    });
    
    test('no horizontal overflow', async ({ page }) => {
      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth
      );
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth
      );
      expect(scrollWidth).toBe(clientWidth);
    });
    
    test('touch targets >= 44px', async ({ page }) => {
      const elements = await page.locator('button, a, [role="button"]').all();
      for (const el of elements) {
        const box = await el.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
    
    test('navigation visible and correct', async ({ page }) => {
      if (viewport.width < 768) {
        // Mobile: bottom sheet or drawer
        await expect(page.locator('.nav-drawer, .bottom-nav')).toBeVisible();
        await expect(page.locator('.sidebar-nav')).toBeHidden();
      } else if (viewport.width < 1024) {
        // Tablet: rail
        await expect(page.locator('.rail-nav')).toBeVisible();
        await expect(page.locator('.nav-drawer')).toBeHidden();
      } else {
        // Desktop: sidebar
        await expect(page.locator('.sidebar-nav')).toBeVisible();
        await expect(page.locator('.nav-drawer')).toBeHidden();
      }
    });
  });
}
```

## Token-Driven Approach

All responsive values derive from design tokens:

| Token Category | Examples |
|---------------|----------|
| Primitive | `--spacing-*`, `--font-size-*`, `--radius-*` |
| Semantic | `--color-background-primary`, `--color-text-primary` |
| Component | `--nav-width`, `--card-padding`, `--touch-target-min` |
| Responsive | `--app-padding`, `--content-max-width`, `--gist-list-columns` |

**Rule**: No hardcoded px/rem values in component styles. All values reference tokens.

## Container Query vs Media Query Usage

| Use Case | Query Type | Example |
|----------|-----------|---------|
| Page layout | Media query | Navigation mode, grid columns |
| Component internals | Container query | Card header layout, button sizing |
| Typography scaling | Media query + clamp() | Fluid font sizes |
| Spacing adjustments | Media query | Section padding, grid gaps |

## Performance Considerations

1. **CSS Containment**: Use `contain: layout style paint` on complex components
2. **Content Visibility**: Use `content-visibility: auto` for off-screen content
3. **Will-change**: Apply strategically before animations, remove after
4. **Avoid Layout Thrashing**: Batch DOM reads/writes

## References

- `.agents/skills/responsive-system/SKILL.md` - 7-breakpoint responsive system
- `.agents/skills/design-token-system/SKILL.md` - Token architecture
- `src/styles/base.css` - Base responsive styles
- `src/styles/navigation.css` - Navigation responsive patterns
- `agents-docs/patterns/mobile-first-navigation.md` - Mobile-first patterns
- `agents-docs/patterns/dynamic-viewport-units.md` - dvh usage

---

*Created: 2026-04-25. Status: Completed (Audited and Verified).*
