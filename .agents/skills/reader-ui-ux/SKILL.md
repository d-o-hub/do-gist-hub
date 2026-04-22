---
version: "2.0.0"
name: reader-ui-ux
description: >
  Build production-ready, accessible reader/admin UI with 2026 best practices: View Transitions API, sophisticated micro-interactions, fluid responsive layouts (7 breakpoints), semantic tokens, and mobile-first navigation. Use when creating/modifying UI components, implementing professional effects, optimizing responsive behavior, or modernizing existing interfaces. Triggers: "modernize UI", "responsive layout", "professional animations", "view transitions", "micro-interactions", "mobile navigation", "token-driven design", "accessible components".
category: workflow
template_version: "1.0.0"
---

# Reader UI/UX - 2026 Modern

Build intentional, accessible, visually sophisticated reader/admin UX with modern web platform capabilities.

## When to Run

- Creating or modifying reader/admin UI components, screens, or layout primitives
- Implementing professional effects: micro-interactions, transitions, motion design
- Building responsive layouts across 7 breakpoints (320px to 1536px+)
- Modernizing existing UI with View Transitions API, container queries, anchor positioning
- Adding navigation patterns: mobile bottom sheets, desktop sidebars, adaptive layouts
- Implementing accessibility improvements: focus management, screen readers, reduced motion
- Working with design tokens for consistent theming across light/dark modes

## 2026 Core Principles

1. **Progressive Enhancement**: Core content accessible without JS; enhanced with modern APIs
2. **View Transitions API**: Smooth page/element transitions where supported; graceful fallback
3. **Container Queries**: Component-level responsive behavior independent of viewport
4. **Semantic Motion**: Every animation serves a purpose; respect `prefers-reduced-motion`
5. **Token-Driven**: All visual properties derive from design tokens; no hardcoded values
6. **Mobile-First**: Design for 320px first, scale up with intention

## Workflow

### 1. Analyze Experience Requirements

Define viewport-specific layouts:

| Viewport         | Width   | Layout Pattern           | Navigation          |
| ---------------- | ------- | ------------------------ | ------------------- |
| Phone Small      | 320px   | Single column, stacked   | Bottom sheet/drawer |
| Phone            | 390px   | Single column, optimized | Bottom tab bar      |
| Phone Large      | 480px   | Single column, relaxed   | Bottom tab bar      |
| Tablet Portrait  | 768px   | Two-column capable       | Rail navigation     |
| Tablet Landscape | 1024px  | Multi-column             | Persistent sidebar  |
| Desktop          | 1280px  | Full layout              | Fixed sidebar       |
| Desktop Wide     | 1536px+ | Spacious layout          | Fixed sidebar       |

### 2. Implement Modern Layout Patterns

**Container Queries First**:

```css
/* Component-level responsiveness */
.gist-card {
  container-type: inline-size;
  container-name: gist-card;
}

@container gist-card (min-width: 400px) {
  .gist-card-header {
    flex-direction: row;
    align-items: center;
  }
}
```

**View Transitions API**:

```typescript
// Enable smooth page transitions
if (document.startViewTransition) {
  document.startViewTransition(() => updateContent());
} else {
  updateContent(); // Graceful fallback
}
```

### 3. Professional Motion Design

**Micro-interactions**:

- Hover: 150-200ms ease-out, subtle scale (1.02) or translateY(-2px)
- Active: 100ms ease-in, scale(0.98) for tactile feedback
- Focus: 200ms ease, visible ring with offset
- Loading: Skeleton screens with shimmer animation

**Easing Functions**:

```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-expo: cubic-bezier(0.7, 0, 0.84, 0);
--ease-elastic: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
```

**Reduced Motion Support**:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 4. Navigation Patterns

**Mobile (320-767px)**:

- Bottom tab bar: 72px height, safe area inset support
- Sheet drawers: Swipe to dismiss, backdrop blur
- FAB (Floating Action Button): Primary action, 56px touch target

**Tablet (768-1023px)**:

- Navigation rail: 72px width, icon + label
- Collapsible side panels: Slide from edge

**Desktop (1024px+)**:

- Persistent sidebar: 240px width
- Collapsible sections: `<details>` with smooth animation
- Command palette: Cmd+K for power users

### 5. Accessibility Implementation

**Focus Management**:

- Visible focus indicators on all interactive elements
- Focus traps for modals, drawers, sheets
- Skip links for keyboard navigation
- `tabindex="-1"` for programmatic focus targets

**ARIA Patterns**:

- Navigation: `role="navigation"`, `aria-label` for multiple navs
- Buttons: `aria-label` for icon-only buttons
- Live regions: `aria-live="polite"` for dynamic updates
- Expanded states: `aria-expanded` for collapsible sections

**Screen Reader Optimization**:

- Semantic HTML: `<main>`, `<nav>`, `<article>`, `<aside>`
- Heading hierarchy: Single H1, logical order
- Alt text: Descriptive for images, empty for decorative
- Form labels: Explicit association with `for` attribute

### 6. Design Token Integration

**Token Layers**:

1. **Primitive**: Colors, spacing, typography, radius, elevation
2. **Semantic**: Background, foreground, border, accent
3. **Component**: Button, card, input, navigation tokens

**Usage Pattern**:

```css
.gist-card {
  background: var(--color-background-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  padding: var(--spacing-4);
  box-shadow: var(--shadow-sm);
}
```

### 7. Performance Optimization

**CSS Containment**:

```css
.gist-list {
  contain: layout style paint;
  content-visibility: auto;
}
```

**Will-Change Strategy**:

- Add before animation: `element.style.willChange = 'transform'`
- Remove after animation: `element.style.willChange = 'auto'`
- Never apply permanently to many elements

**Intersection Observer**:

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        loadContent(entry.target);
      }
    });
  },
  { rootMargin: "100px" },
);
```

## 2026 Component Patterns

### Cards with Depth

```css
.gist-card {
  background: var(--color-background-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  transition: all var(--motion-duration-fast) var(--ease-out-expo);
}

.gist-card:hover {
  transform: translateY(-2px);
  box-shadow:
    var(--shadow-lg),
    0 0 0 1px var(--color-accent-glow);
}
```

### Skeleton Loading States

```css
.loading-skeleton {
  background: linear-gradient(
    90deg,
    var(--color-background-secondary) 25%,
    var(--color-border-default) 50%,
    var(--color-background-secondary) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

### Toast Notifications

```typescript
// Stacked toast system with auto-dismiss
toast.success("Gist created", {
  duration: 4000,
  position: "bottom-right",
  dismissible: true,
});
```

### Bottom Sheet (Mobile)

```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  transform: translateY(100%);
  transition: transform var(--motion-duration-normal) var(--ease-out-expo);
}

.bottom-sheet.open {
  transform: translateY(0);
}
```

## Checklist

### Layout & Responsive

- [ ] Container queries for component-level responsiveness
- [ ] View Transitions API with fallback for unsupported browsers
- [ ] All 7 breakpoints tested: 320, 390, 480, 768, 1024, 1280, 1536px
- [ ] Safe area insets respected (`env(safe-area-inset-*)`)
- [ ] Touch targets minimum 44x44px on mobile

### Motion & Effects

- [ ] Micro-interactions: hover, active, focus states
- [ ] Reduced motion media query respected
- [ ] Will-change applied strategically, not permanently
- [ ] CSS containment for performance
- [ ] No layout thrashing (batch DOM reads/writes)

### Navigation

- [ ] Mobile: Bottom tab bar or drawer navigation
- [ ] Tablet: Rail or collapsible sidebar
- [ ] Desktop: Persistent sidebar with collapsible sections
- [ ] Current route visually indicated
- [ ] Keyboard navigation support (Tab, Escape, Enter)

### Accessibility

- [ ] Focus visible on all interactive elements
- [ ] Focus traps for modals/drawers
- [ ] ARIA labels on icon buttons
- [ ] Semantic HTML structure
- [ ] Color contrast ≥ 4.5:1 for text
- [ ] Screen reader tested with NVDA/VoiceOver

### Tokens & Theming

- [ ] No hardcoded values; all from design tokens
- [ ] Light/dark mode support via `data-theme`
- [ ] CSS custom properties for runtime theming
- [ ] High contrast mode support (`prefers-contrast: high`)

## References

- `references/modern-layout-patterns.md` - Container queries, View Transitions, anchor positioning
- `references/motion-design-system.md` - Easing, durations, micro-interactions
- `references/navigation-patterns.md` - Mobile, tablet, desktop navigation
- `references/accessibility-2026.md` - Modern ARIA patterns, focus management
- `references/design-tokens-usage.md` - Token architecture, semantic layers
- `references/component-library.md` - Card, button, input, toast patterns

## Quick Reference

```bash
# Initialize design tokens
pnpm run init:design

# Test responsive at specific breakpoint
pnpm run test:responsive -- --viewport=768

# Check accessibility
pnpm run test:a11y
```
