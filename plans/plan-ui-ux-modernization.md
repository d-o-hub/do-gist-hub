<!-- Last Audit: 2024-05-15 -->
# Plan: UI/UX Modernization with Reader UI/UX Skill v2

## Overview

Modernize d.o. Gist Hub UI/UX using the updated `reader-ui-ux` skill v2.0.0 with 2026 best practices: View Transitions API, container queries, sophisticated motion design, and comprehensive accessibility.

## Goals

1. Implement modern layout patterns (container queries, View Transitions)
2. Enhance navigation (mobile sheet, rail, sidebar)
3. Add professional motion design (micro-interactions, skeleton screens)
4. Improve accessibility (focus management, ARIA, screen readers)
5. Update design tokens (motion, elevation, component tokens)

## Dependencies

- `design-token-system` skill (for token architecture)
- `responsive-system` skill (for breakpoint alignment)
- `memory-leak-prevention` skill (for AbortController patterns)

## Phase 1: Design Token Updates

### 1.1 Motion Tokens

**Status:** Completed
**Files:** `src/tokens/motion/motion.ts`, `src/tokens/css-variables.ts`

Add comprehensive motion tokens:

```typescript
export const motion = {
  duration: {
    instant: "0ms",
    fast: "150ms",
    normal: "200ms",
    slow: "300ms",
    deliberate: "400ms",
  },
  easing: {
    linear: "linear",
    smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    outExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
    inExpo: "cubic-bezier(0.7, 0, 0.84, 0)",
    elastic: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },
};
```

### 1.2 Elevation Tokens

**Status:** Completed
**Files:** `src/tokens/elevation/shadows.ts`

Add glow/accent shadows:

```typescript
export const shadows = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px rgba(0, 0, 0, 0.15)",
  accent: "0 2px 8px var(--color-accent-glow)",
  accentLg: "0 4px 16px var(--color-accent-glow)",
};
```

## Phase 2: CSS Modernization

### 2.1 Container Queries for Gist Cards

**Status:** Completed
**Files:** `src/styles/base.css`

Add container query support:

```css
.gist-list-item {
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

### 2.2 Reduced Motion Support

**Status:** Completed
**Files:** `src/styles/motion.css` (new file)

Create motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 2.3 Professional Micro-interactions

**Status:** Completed
**Files:** `src/styles/interactions.css`

Update hover/active states with easing:

```css
.interactive {
  transition:
    transform 150ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 150ms cubic-bezier(0.16, 1, 0.3, 1);
}

.interactive:hover {
  transform: translateY(-2px);
}

.interactive:active {
  transform: scale(0.98);
}
```

## Phase 3: Navigation Enhancement

### 3.1 Bottom Sheet Component

**Status:** Completed
**Files:** `src/components/ui/bottom-sheet.ts` (new)

Implement mobile bottom sheet:

- Touch drag handling
- Backdrop with blur
- Focus trap
- ARIA attributes

### 3.2 Navigation Rail (Tablet)

**Status:** Completed
**Files:** `src/components/app.ts`, `src/styles/base.css`

Add tablet rail navigation (768-1023px):

```css
@media (min-width: 768px) and (max-width: 1023px) {
  .rail-nav {
    /* 72px width */
  }
}
```

### 3.3 Command Palette

**Status:** Completed
**Files:** `src/components/ui/command-palette.ts` (new)

Implement Cmd+K command palette:

- Search filtering
- Keyboard navigation
- ARIA live regions
- Focus trap

## Phase 4: Component Updates

### 4.1 Skeleton Screens

**Status:** Completed
**Files:** `src/components/app.ts`, `src/styles/base.css`

Enhanced skeleton with shimmer:

```css
.loading-skeleton {
  background: linear-gradient(90deg, ...);
  animation: shimmer 1.5s ease-in-out infinite;
}
```

### 4.2 Toast Notifications

**Status:** Completed
**Files:** `src/components/ui/toast.ts`

Update with proper motion:

- Entry animation (slide + fade)
- Exit animation
- Stacked layout

### 4.3 View Transitions Integration

**Status:** Completed
**Files:** `src/components/app.ts`

Add View Transitions API:

```typescript
if (document.startViewTransition) {
  document.startViewTransition(() => {
    this.updateContent();
  });
}
```

## Phase 5: Accessibility Improvements

### 5.1 Focus Management

**Status:** Completed
**Files:** `src/utils/focus-trap.ts` (new)

Implement focus trap utility:

```typescript
export class FocusTrap {
  activate(container: HTMLElement): void;
  deactivate(): void;
}
```

### 5.2 ARIA Live Regions

**Status:** Completed
**Files:** `src/utils/announcer.ts` (new)

Screen reader announcements:

```typescript
export class Announcer {
  announce(message: string, priority: "polite" | "assertive"): void;
}
```

### 5.3 Skip Links

**Status:** Completed
**Files:** `index.html`, `src/styles/accessibility.css`

Add skip to content link.

## Implementation Order

1. Design tokens (motion, elevation) - Foundation
2. CSS utilities (reduced motion, interactions) - Base styles
3. Skeleton screens - Immediate UX improvement
4. Navigation enhancements - Major layout change
5. View Transitions - Progressive enhancement
6. Command palette - Power user feature
7. Accessibility polish - Compliance

## Success Criteria

- [x] All 7 breakpoints render correctly
- [x] Container queries work for gist cards
- [x] View Transitions API with fallback
- [x] Reduced motion respected
- [x] Lighthouse accessibility score ≥ 95
- [x] All interactive elements have focus states
- [x] Screen reader tested with NVDA/VoiceOver

## References

- `.agents/skills/reader-ui-ux/SKILL.md` - Updated skill
- `.agents/skills/reader-ui-ux/references/` - Implementation guides
