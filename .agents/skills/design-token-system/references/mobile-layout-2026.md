# Mobile Layout Best Practices 2026

> Comprehensive guide for production-ready mobile app layouts using 2026 CSS standards.

## The 100dvh Revolution

### Problem with 100vh

On mobile browsers, `100vh` includes the address bar area, causing layouts to break when the address bar collapses/expands.

### Solution: Dynamic Viewport Units

```css
/* 2026 Best Practice: Use dvh (dynamic viewport height) */
.app-shell {
  min-height: 100vh; /* Fallback for older browsers */
  min-height: 100dvh; /* Dynamic viewport height */
}
```

### Viewport Unit Reference

| Unit  | Description                                         | Use Case                          |
| ----- | --------------------------------------------------- | --------------------------------- |
| `svh` | Small viewport height (address bar shown)           | Fixed elements that must fit      |
| `lvh` | Large viewport height (address bar hidden)          | Background images                 |
| `dvh` | Dynamic viewport height (changes as UI shows/hides) | **Primary choice for app shells** |
| `svw` | Small viewport width                                | Landscape orientation             |
| `lvw` | Large viewport width                                | Landscape orientation             |
| `dvw` | Dynamic viewport width                              | Responsive layouts                |

## App Shell Layout Pattern

### Complete 2026 Layout Structure

```css
/* ========================================
   APP SHELL LAYOUT (2026)
   Full-screen mobile app without gaps
   ======================================== */

:root {
  /* Safe area insets for notched devices */
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}

/* Main app container */
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* Fallback */
  min-height: 100dvh; /* Dynamic viewport height */
  max-width: 100vw;
  overflow-x: hidden;
  background-color: var(--color-background-primary);
}

/* Header - Sticky with safe area */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-3) var(--spacing-4);
  padding-top: calc(var(--spacing-3) + var(--safe-area-top));
  background-color: var(--color-background-primary);
  border-bottom: 1px solid var(--color-border-default);
  position: sticky;
  top: 0;
  z-index: var(--z-index-sticky, 10);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  flex-shrink: 0; /* Prevent header from shrinking */
}

/* Main content area - Fills available space */
.app-main {
  flex: 1 0 auto; /* Grow, don't shrink, auto basis */
  padding: var(--spacing-container, var(--spacing-4));
  padding-bottom: calc(var(--spacing-container) + 80px + var(--safe-area-bottom));
  overflow-y: auto;
  min-height: 0; /* Critical for flex child scrolling */
}

/* Bottom navigation - Fixed with safe area */
.bottom-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(72px + var(--safe-area-bottom));
  padding: var(--spacing-2) var(--spacing-4);
  padding-bottom: calc(var(--spacing-2) + var(--safe-area-bottom));
  background-color: var(--color-background-elevated);
  border-top: 1px solid var(--color-border-default);
  z-index: var(--z-index-fixed, 20);
  backdrop-filter: blur(12px);
}
```

## Critical CSS Rules for Mobile Layouts

### 1. Flex Child Minimum Height

```css
/* WRONG: Flex child won't scroll properly */
.flex-child {
  flex: 1;
  overflow-y: auto;
}

/* CORRECT: Explicit min-height allows scrolling */
.flex-child {
  flex: 1 0 auto;
  min-height: 0;
  overflow-y: auto;
}
```

### 2. Safe Area Insets

```css
/* Always include safe area fallbacks */
.element {
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Or with calc for additional spacing */
.element {
  padding: calc(var(--spacing-4) + env(safe-area-inset-top, 0px)) var(--spacing-4);
}
```

### 3. Fixed Element Height Calculation

```css
/* Fixed bottom element with safe area */
.fixed-bottom {
  position: fixed;
  bottom: 0;
  height: calc(72px + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

## Common Layout Pitfalls

### ❌ Gap Between Header and Content

```css
/* WRONG: Creates unwanted gap */
.app-main {
  flex: 1;
  margin-top: var(--spacing-4); /* Don't do this */
}
```

### ✅ Seamless Header-to-Content Flow

```css
/* CORRECT: Content starts immediately after header */
.app-main {
  flex: 1 0 auto;
  padding: var(--spacing-4);
  min-height: 0;
}
```

### ❌ Viewport Height Issues

```css
/* WRONG: Breaks on mobile when address bar hides */
.app-shell {
  height: 100vh;
}
```

### ✅ Dynamic Viewport Height

```css
/* CORRECT: Adapts to address bar changes */
.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
}
```

### ❌ Missing Safe Area Support

```css
/* WRONG: Content hidden by notch/dynamic island */
.app-header {
  padding: 16px;
}
```

### ✅ Safe Area Aware

```css
/* CORRECT: Respects device safe areas */
.app-header {
  padding: 16px;
  padding-top: calc(16px + env(safe-area-inset-top, 0px));
}
```

## Responsive Layout Grid

### 2026 Mobile-First Grid Pattern

```css
/* Base: Single column mobile */
.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-4);
}

/* Tablet: Two columns */
@media (min-width: 768px) {
  .content-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-6);
  }
}

/* Desktop: Three columns */
@media (min-width: 1280px) {
  .content-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## Validation Checklist

Before shipping mobile layouts, verify:

- [ ] Uses `100dvh` (with `100vh` fallback) for app shell
- [ ] Includes `min-height: 0` on flex children with overflow
- [ ] Safe area insets used for header/footer padding
- [ ] No gaps between header and content
- [ ] Bottom navigation accounts for safe area
- [ ] Tested on iOS Safari (address bar behavior)
- [ ] Tested on Android Chrome
- [ ] No horizontal overflow at any width
- [ ] Content scrolls properly within flex containers

## Browser Support

| Feature                  | Chrome | Safari | Firefox | Edge |
| ------------------------ | ------ | ------ | ------- | ---- |
| `dvh`/`dvw`              | 108+   | 15.4+  | 101+    | 108+ |
| `env(safe-area-inset-*)` | 69+    | 11.3+  | 63+     | 79+  |
| `backdrop-filter`        | 76+    | 9+     | 103+    | 79+  |

## Testing Commands

```bash
# Capture screenshots at key breakpoints
agent-browser open http://localhost:5173

# Mobile (iPhone 14 dimensions)
agent-browser set viewport 390 844
agent-browser screenshot analysis/responsive/mobile.png

# Check for layout issues
agent-browser eval "document.querySelector('.app-shell').scrollHeight"
agent-browser eval "window.innerHeight"
```

## Self-Learning: Layout Gap Fix

**Issue**: Gap visible between header and content area in mobile screenshots.

**Root Cause**: The `app-main` padding and flex behavior created unwanted spacing.

**Solution Applied**:

1. Changed `flex: 1` to `flex: 1 0 auto` for proper flex basis
2. Added `min-height: 0` to allow proper scrolling
3. Updated app shell to use `100dvh` for mobile viewport stability
4. Added proper safe area insets to bottom navigation

**Key Insight**: Mobile layouts require explicit `min-height: 0` on flex children to enable scrolling within flex containers.
