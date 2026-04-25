<!-- Last Audit: 2026-04-25 -->
# Plan: UI/UX Modernization v3 - Comprehensive Responsive Optimization

**Status**: Implemented
**Date**: 2026-04-25
**Deciders**: UI/UX Agent, Accessibility Agent, Performance Engineer

## Overview

Comprehensive UI/UX modernization for d.o. Gist Hub based on screenshot analysis and reader-ui-ux skill v2. Addresses critical issues: full-viewport menu overlay, poor visual hierarchy, missing responsive adaptation, and lack of accessibility.

## Screenshot Analysis Summary

**Critical Issues Found:**
1. Full viewport overlay (100% screen takeover)
2. No visual grouping or hierarchy
3. Floating section headers without structure
4. Zero responsive breakpoint handling
5. Missing interactive states
6. Undersized touch targets
7. No safe area support
8. Hardcoded styling (no tokens)
9. Missing ARIA/semantic markup

## Phase 1: Navigation Modernization

### Mobile (320-767px) - Bottom Sheet Drawer

**Implementation:**
```css
.nav-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  transform: translateY(100%);
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 70vh;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  background: var(--color-background-elevated);
  box-shadow: var(--shadow-xl);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  z-index: var(--z-index-drawer);
}

.nav-drawer.open {
  transform: translateY(0);
}

.nav-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 250ms ease;
  z-index: calc(var(--z-index-drawer) - 1);
}

.nav-drawer-backdrop.open {
  opacity: 1;
}
```

**Structure:**
```
┌─────────────────────────────────────┐
│  Handle (drag indicator)            │
├─────────────────────────────────────┤
│  PRIMARY ACTIONS                    │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │  Home  │ │ Starred│ │ Create │  │
│  └────────┘ └────────┘ └────────┘  │
├─────────────────────────────────────┤
│  SECONDARY                          │
│  ├─ Offline Status                  │
│  └─ Sync Queue                      │
├─────────────────────────────────────┤
│  SYSTEM                             │
│  ├─ Preferences                     │
│  ├─ Data & Diagnostics              │
│  └─ Settings                        │
└─────────────────────────────────────┘
```

### Tablet (768-1023px) - Navigation Rail

**Implementation:**
```css
.rail-nav {
  position: fixed;
  left: 0;
  top: 0;
  width: 72px;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: calc(var(--spacing-4) + env(safe-area-inset-top, 0px));
  padding-bottom: calc(var(--spacing-4) + env(safe-area-inset-bottom, 0px));
  background: var(--color-background-elevated);
  border-right: 1px solid var(--color-border-default);
  z-index: var(--z-index-nav);
}

.rail-nav-item {
  width: 56px;
  height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-1);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  transition: all 150ms var(--ease-smooth);
}

.rail-nav-item:hover {
  background: var(--color-background-hover);
  color: var(--color-text-primary);
}

.rail-nav-item.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}
```

### Desktop (1024px+) - Persistent Sidebar

**Implementation:**
```css
.sidebar-nav {
  position: fixed;
  left: 0;
  top: 0;
  width: 240px;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-4);
  padding-top: calc(var(--spacing-4) + env(safe-area-inset-top, 0px));
  padding-bottom: calc(var(--spacing-4) + env(safe-area-inset-bottom, 0px));
  background: var(--color-background-elevated);
  border-right: 1px solid var(--color-border-default);
  overflow-y: auto;
  z-index: var(--z-index-nav);
}

@media (min-width: 1536px) {
  .sidebar-nav {
    width: 280px;
    padding: var(--spacing-6);
  }
}

.sidebar-section {
  margin-bottom: var(--spacing-6);
}

.sidebar-section-title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  padding: 0 var(--spacing-3);
  margin-bottom: var(--spacing-2);
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  height: 44px;
  padding: 0 var(--spacing-3);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  transition: all 150ms var(--ease-smooth);
}

.sidebar-nav-item:hover {
  background: var(--color-background-hover);
  color: var(--color-text-primary);
}

.sidebar-nav-item.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  font-weight: 500;
}
```

## Phase 2: Visual Hierarchy & Grouping

### Section Grouping Rules

```css
.nav-section {
  margin-bottom: var(--spacing-6);
}

.nav-section:not(:last-child)::after {
  content: '';
  display: block;
  height: 1px;
  background: var(--color-border-default);
  margin: var(--spacing-4) var(--spacing-3) 0;
}

.nav-section-title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
  padding: var(--spacing-2) var(--spacing-4);
  margin-bottom: var(--spacing-1);
}
```

### Hierarchy Levels

| Level | Element | Font Size | Weight | Color |
|-------|---------|-----------|--------|-------|
| 1 | Section Title | xs (11px) | 600 | text-tertiary |
| 2 | Nav Item | sm (14px) | 400 | text-secondary |
| 3 | Active Item | sm (14px) | 500 | accent |
| 4 | Icon | 20-24px | - | currentColor |

## Phase 3: Motion Design System

### Easing Functions

```css
:root {
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-expo: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-elastic: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Animation Specifications

| Animation | Duration | Easing | Properties |
|-----------|----------|--------|------------|
| Drawer open | 300ms | out-expo | transform, opacity |
| Drawer close | 250ms | in-expo | transform, opacity |
| Backdrop fade | 200ms | smooth | opacity |
| Nav item hover | 150ms | smooth | background, color, transform |
| Nav item active | 100ms | in-expo | transform |
| Rail expand | 200ms | smooth | width |
| Section expand | 200ms | out-expo | height, opacity |
| Focus ring | 200ms | smooth | box-shadow |
| Page transition | 400ms | out-expo | opacity, transform |

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  .nav-drawer,
  .rail-nav,
  .sidebar-nav,
  .nav-item,
  .backdrop {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

## Phase 4: Accessibility Implementation

### ARIA Structure

```html
<nav role="navigation" aria-label="Main navigation">
  <!-- Section: Primary -->
  <div role="group" aria-labelledby="nav-primary-title">
    <div id="nav-primary-title" class="nav-section-title">Primary</div>
    <ul role="menubar">
      <li role="none">
        <a role="menuitem" 
           href="/" 
           aria-current="page"
           class="nav-item active">
          <svg aria-hidden="true">...</svg>
          <span>Home</span>
        </a>
      </li>
      <!-- ... -->
    </ul>
  </div>
</nav>
```

### Keyboard Navigation

```typescript
// src/utils/nav-keyboard.ts
export class NavKeyboardHandler {
  private items: HTMLElement[];
  private currentIndex = 0;

  constructor(container: HTMLElement) {
    this.items = Array.from(
      container.querySelectorAll('[role="menuitem"]')
    );
    this.setupListeners();
  }

  private setupListeners() {
    this.items.forEach((item, index) => {
      item.addEventListener('keydown', (e) => {
        switch(e.key) {
          case 'ArrowDown':
            e.preventDefault();
            this.focusItem(index + 1);
            break;
          case 'ArrowUp':
            e.preventDefault();
            this.focusItem(index - 1);
            break;
          case 'Home':
            e.preventDefault();
            this.focusItem(0);
            break;
          case 'End':
            e.preventDefault();
            this.focusItem(this.items.length - 1);
            break;
          case 'Escape':
            this.closeDrawer();
            break;
        }
      });
    });
  }

  private focusItem(index: number) {
    if (index >= 0 && index < this.items.length) {
      this.currentIndex = index;
      this.items[index].focus();
    }
  }
}
```

### Focus Trap for Drawer

```typescript
// src/utils/focus-trap.ts
export class FocusTrap {
  private container: HTMLElement;
  private previousActiveElement: Element | null;

  activate(container: HTMLElement) {
    this.container = container;
    this.previousActiveElement = document.activeElement;
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (focusable[0] as HTMLElement)?.focus();
  }

  deactivate() {
    (this.previousActiveElement as HTMLElement)?.focus();
  }
}
```

## Phase 5: Component Specifications

### Bottom Sheet Component

```typescript
// src/components/ui/bottom-sheet.ts
export class BottomSheet extends HTMLElement {
  private backdrop: HTMLElement;
  private drawer: HTMLElement;
  private focusTrap: FocusTrap;

  open() {
    this.backdrop.classList.add('open');
    this.drawer.classList.add('open');
    this.focusTrap.activate(this.drawer);
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.backdrop.classList.remove('open');
    this.drawer.classList.remove('open');
    this.focusTrap.deactivate();
    document.body.style.overflow = '';
  }

  // Touch drag handling
  private setupDrag() {
    let startY = 0;
    let currentY = 0;

    this.drawer.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    });

    this.drawer.addEventListener('touchmove', (e) => {
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      if (diff > 0) {
        this.drawer.style.transform = `translateY(${diff}px)`;
      }
    });

    this.drawer.addEventListener('touchend', () => {
      const diff = currentY - startY;
      if (diff > 100) {
        this.close();
      } else {
        this.drawer.style.transform = '';
      }
    });
  }
}
```

### Navigation Rail Component

```typescript
// src/components/ui/nav-rail.ts
export class NavRail extends HTMLElement {
  private expanded = false;

  toggle() {
    this.expanded = !this.expanded;
    this.classList.toggle('expanded', this.expanded);
    
    // Animate width change
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        this.style.width = this.expanded ? '240px' : '72px';
      });
    } else {
      this.style.width = this.expanded ? '240px' : '72px';
    }
  }
}
```

## Phase 6: Testing Strategy

### Responsive Testing Matrix

| Breakpoint | Device | Nav Type | Tests |
|-----------|--------|----------|-------|
| 320px | iPhone SE | Bottom sheet | Open/close, touch targets, scroll |
| 390px | iPhone 14 | Bottom sheet | Safe areas, 5-item grid |
| 480px | Pixel 7 Pro | Bottom sheet | Expanded sections |
| 768px | iPad Portrait | Rail | Rail visible, sidebar hidden |
| 1024px | iPad Landscape | Sidebar | Collapsible, keyboard nav |
| 1280px | MacBook | Sidebar | Persistent, all sections |
| 1536px | Desktop | Wide sidebar | 280px width, 3-col grid |

### Accessibility Checklist

- [ ] Keyboard navigation works (Tab, Arrows, Enter, Escape)
- [ ] Focus indicators visible (2px outline, offset)
- [ ] Screen reader announces landmarks
- [ ] ARIA attributes correct (role, aria-label, aria-current)
- [ ] Color contrast ≥ 4.5:1 for text
- [ ] Touch targets ≥ 44x44px
- [ ] Reduced motion respected
- [ ] Skip links functional

## Phase 7: Performance Budget

| Metric | Budget | Target |
|--------|--------|--------|
| First Contentful Paint | < 1.5s | 1.0s |
| Largest Contentful Paint | < 2.5s | 1.8s |
| Cumulative Layout Shift | < 0.1 | 0.05 |
| Navigation CSS | < 10KB | 8KB |
| Navigation JS | < 5KB | 3KB |
| Animation frame rate | 60fps | 60fps |

## Files to Create/Modify

### New Files
- `src/components/ui/bottom-sheet.ts` - Mobile bottom sheet
- `src/components/ui/nav-rail.ts` - Tablet rail navigation
- `src/utils/nav-keyboard.ts` - Keyboard navigation handler
- `tests/responsive/navigation.spec.ts` - Responsive nav tests
- `tests/accessibility/navigation.spec.ts` - A11y nav tests

### Modified Files
- `src/styles/navigation.css` - Complete rewrite
- `src/styles/base.css` - Safe area, dvh support
- `src/styles/motion.css` - Animation tokens
- `src/styles/accessibility.css` - Focus states
- `src/components/app.ts` - Navigation structure
- `src/tokens/css-variables.ts` - Nav tokens

## Rollback Criteria

- Performance regression > 100ms first paint
- Accessibility audit score < 95
- User complaints > 5% about navigation
- Test failure rate > 2%

## References

- `plans/017-ui-ux-navigation-overhaul.md` - Detailed navigation plan
- `plans/004-responsive-system.md` - 7-breakpoint system
- `.agents/skills/reader-ui-ux/SKILL.md` - Skill patterns
- `agents-docs/patterns/mobile-first-navigation.md` - Navigation patterns

---

*Created: 2026-04-25. Status: In Progress.*
