---
version: '0.1.0'
name: reader-ui-ux
description: >
  Build production-ready, accessible reader/admin UI with 2026 best practices: View Transitions API, sophisticated micro-interactions, fluid responsive layouts (7 breakpoints), semantic tokens, and mobile-first navigation. Use when creating/modifying UI components, implementing professional effects, optimizing responsive behavior, or modernizing existing interfaces. Triggers: "modernize UI", "responsive layout", "professional animations", "view transitions", "micro-interactions", "mobile navigation", "token-driven design", "accessible components".
category: workflow
template_version: '0.1.0'
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
if (document.startViewTransition) {
  document.startViewTransition(() => updateContent());
} else {
  updateContent(); // Graceful fallback
}
```

### 3. Navigation Patterns

**Mobile (320-767px)**: Bottom tab bar (72px), sheet drawers, FAB (56px touch target)

**Tablet (768-1023px)**: Navigation rail (72px), collapsible side panels

**Desktop (1024px+)**: Persistent sidebar (240px), collapsible sections, Cmd+K palette

### 4. Accessibility

- Visible focus on all interactive elements, focus traps for modals
- ARIA: `role="navigation"`, `aria-label`, `aria-expanded`, `aria-live="polite"`
- Semantic HTML: `<main>`, `<nav>`, `<article>`, proper heading hierarchy
- Color contrast ≥ 4.5:1, screen reader tested

### 5. Design Token Integration

```css
.gist-card {
  background: var(--color-background-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  padding: var(--spacing-4);
}
```

## Checklist

See `references/checklist.md` for full accessibility, responsive, motion, navigation, and token checklists.

## References

- `references/modern-layout-patterns.md` - Container queries, View Transitions
- `references/motion-design-system.md` - Easing, micro-interactions
- `references/navigation-patterns.md` - Mobile/tablet/desktop navigation
- `references/accessibility-2026.md` - Modern ARIA patterns
- `references/design-tokens-usage.md` - Token architecture

## Quick Reference

```bash
npm run init:design          # Initialize design tokens
npm run test:responsive -- --viewport=768  # Test breakpoint
npm run test:a11y            # Check accessibility
```
