# Production-Ready UI Standards

> Reference guide for implementing production-quality UI components with proper styling, responsive behavior, and accessibility.

## Golden Rule: No Unstyled Elements

Every interactive element MUST have explicit CSS styling. Default browser styles are unacceptable in production.

## Navigation Patterns

### Dual Navigation System (Mobile + Desktop)

The app uses a dual navigation pattern:
- **Mobile (< 768px)**: Bottom tab bar navigation
- **Desktop (>= 768px)**: Sidebar navigation

#### Required CSS Structure

```css
/* ========================================
   NAVIGATION - MOBILE FIRST
   ======================================== */

/* Base: Hide sidebar on mobile */
.sidebar-nav {
  display: none;
}

/* Bottom navigation - always visible on mobile */
.bottom-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  background-color: var(--color-background-elevated);
  border-top: 1px solid var(--color-border-default);
  padding: var(--spacing-2) var(--spacing-4);
  padding-bottom: calc(var(--spacing-2) + var(--safe-area-bottom));
  z-index: var(--z-index-fixed, 20);
  backdrop-filter: blur(12px);
}

/* Bottom nav items */
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-4);
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-foreground-muted);
  border-radius: var(--radius-full);
  min-width: 64px;
  min-height: 44px; /* Touch target size */
  transition: all var(--motion-duration-fast) var(--ease-out-expo);
}

.nav-item:hover {
  color: var(--color-foreground-secondary);
  background-color: var(--color-interactive-hover);
}

.nav-item.active {
  color: var(--color-foreground-inverse);
  background-color: var(--color-accent-primary);
  box-shadow: 0 2px 12px var(--color-accent-glow);
}

/* Desktop: Show sidebar, hide bottom nav */
@media (min-width: 768px) {
  .sidebar-nav {
    display: flex;
    flex-direction: column;
    grid-area: sidebar;
    background-color: var(--color-background-primary);
    border-right: 1px solid var(--color-border-default);
    padding: var(--spacing-4);
    padding-top: calc(var(--spacing-4) + var(--safe-area-top));
    gap: var(--spacing-1);
    position: sticky;
    top: 0;
    height: 100vh;
    height: 100dvh;
    overflow-y: auto;
    z-index: var(--z-index-fixed, 20);
  }

  .bottom-nav {
    display: none;
  }
}

/* Sidebar items - styled like buttons */
.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2-5) var(--spacing-3);
  border: none;
  background: transparent;
  text-align: left;
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--color-foreground-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  min-height: 40px;
  width: 100%;
  transition: all var(--motion-duration-fast) var(--ease-out-expo);
}

.sidebar-item:hover {
  background-color: var(--color-interactive-hover);
  color: var(--color-foreground-primary);
}

.sidebar-item.active {
  background-color: var(--color-accent-primary);
  color: var(--color-foreground-inverse);
  font-weight: var(--font-weight-semibold);
  box-shadow: 0 2px 8px var(--color-accent-glow);
}

.sidebar-item.active:hover {
  background-color: var(--color-accent-hover);
}

.sidebar-icon {
  font-size: 1.125rem;
  line-height: 1;
}

.sidebar-label {
  font-size: var(--font-size-sm);
}
```

## Common UI Components

### Button Pattern

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3) var(--spacing-6);
  border: none;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  min-height: 40px;
  transition: all var(--motion-duration-fast) var(--ease-out-expo);
}

.btn-primary {
  background-color: var(--color-accent-primary);
  color: var(--color-foreground-inverse);
  box-shadow: 0 2px 8px var(--color-accent-glow);
}

.btn-primary:hover {
  background-color: var(--color-accent-hover);
  box-shadow: 0 4px 16px var(--color-accent-glow);
  transform: translateY(-1px);
}

.btn-primary:active {
  background-color: var(--color-accent-active);
  transform: translateY(0);
}
```

### Card Pattern

```css
.card {
  container-type: inline-size;
  container-name: card;
  background-color: var(--color-background-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  padding: var(--spacing-4);
  transition: all var(--motion-duration-fast) var(--ease-out-expo);
}

.card:hover {
  border-color: var(--color-border-emphasis);
  box-shadow: var(--shadow-lg), 0 0 0 1px var(--color-accent-glow);
  transform: translateY(-2px);
}
```

### Input Pattern

```css
.input {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background-color: var(--color-background-primary);
  color: var(--color-foreground-primary);
  transition: all var(--motion-duration-fast) var(--ease-out-expo);
}

.input:focus {
  outline: none;
  border-color: var(--color-accent-primary);
  box-shadow: 0 0 0 3px var(--color-accent-subtle);
}
```

## Responsive Breakpoints

```css
/* Phone Small */
@media (min-width: 320px) { }

/* Phone */
@media (min-width: 390px) { }

/* Phone Large */
@media (min-width: 480px) { }

/* Tablet Portrait */
@media (min-width: 768px) { }

/* Tablet Landscape */
@media (min-width: 1024px) { }

/* Desktop */
@media (min-width: 1280px) { }

/* Desktop Wide */
@media (min-width: 1536px) { }
```

## Validation Checklist

Before committing UI changes:

- [ ] Screenshot at 320px, 768px, 1536px
- [ ] No unstyled default browser elements
- [ ] All interactive elements have hover/focus/active states
- [ ] Touch targets >= 44x44px on mobile
- [ ] No horizontal overflow at any breakpoint
- [ ] Sidebar hidden on mobile, visible on desktop
- [ ] Navigation items properly styled (not default buttons)
- [ ] Active state visually distinct
- [ ] All colors use CSS custom properties (no hardcoded hex)
- [ ] All spacing uses token values (no hardcoded px)

## Common Mistakes to Avoid

1. **Missing base styles**: Always define base styles before media query overrides
2. **Unstyled buttons**: Never use raw `<button>` without class styling
3. **Missing active states**: Every interactive element needs visual feedback
4. **Hardcoded values**: Use CSS custom properties for all visual values
5. **Incomplete responsive**: Test all 7 breakpoints, not just mobile/desktop
