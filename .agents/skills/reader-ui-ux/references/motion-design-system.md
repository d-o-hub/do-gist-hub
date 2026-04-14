# Motion Design System (2026)

Professional motion design for modern web applications.

## Motion Philosophy

1. **Purposeful**: Every animation guides attention or provides feedback
2. **Performant**: 60fps using transform and opacity only
3. **Respectful**: Honor prefers-reduced-motion
4. **Consistent**: Unified timing and easing across the app

## Timing System

### Duration Tokens

| Token                          | Value | Use Case                         |
| ------------------------------ | ----- | -------------------------------- |
| `--motion-duration-instant`    | 0ms   | No animation                     |
| `--motion-duration-fast`       | 150ms | Hover states, micro-interactions |
| `--motion-duration-normal`     | 200ms | Button presses, toggles          |
| `--motion-duration-slow`       | 300ms | Page transitions, modals         |
| `--motion-duration-deliberate` | 400ms | Complex animations               |

### Duration Guidelines

- **Micro-interactions**: 150-200ms
- **UI state changes**: 200-300ms
- **Page transitions**: 300-500ms
- **Loading states**: 800-1200ms (loops)

## Easing System

### Easing Tokens

| Token             | Curve                                  | Use Case              |
| ----------------- | -------------------------------------- | --------------------- |
| `--ease-linear`   | linear                                 | Continuous animations |
| `--ease-smooth`   | cubic-bezier(0.4, 0, 0.2, 1)           | General purpose       |
| `--ease-out`      | cubic-bezier(0, 0, 0.2, 1)             | Elements entering     |
| `--ease-in`       | cubic-bezier(0.4, 0, 1, 1)             | Elements exiting      |
| `--ease-out-expo` | cubic-bezier(0.16, 1, 0.3, 1)          | Dramatic entrances    |
| `--ease-in-expo`  | cubic-bezier(0.7, 0, 0.84, 0)          | Quick exits           |
| `--ease-elastic`  | cubic-bezier(0.68, -0.55, 0.265, 1.55) | Playful interactions  |
| `--ease-spring`   | spring(1 100 10 0)                     | Physical feel         |

### Easing Guidelines

- **Entrances**: ease-out (decelerate into rest)
- **Exits**: ease-in (accelerate out)
- **State changes**: ease-smooth (balanced)
- **Playful elements**: ease-elastic (buttons, toggles)

## Micro-Interactions

### Hover States

```css
.interactive-element {
  transition:
    transform var(--motion-duration-fast) var(--ease-out-expo),
    box-shadow var(--motion-duration-fast) var(--ease-out-expo);
}

.interactive-element:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

### Active/Pressed States

```css
.interactive-element:active {
  transform: scale(0.98);
  transition-duration: 100ms;
}
```

### Focus States

```css
.interactive-element:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
  transition: outline-offset var(--motion-duration-fast) ease;
}
```

### Loading States

```css
.loading-skeleton {
  background: linear-gradient(
    90deg,
    var(--color-background-secondary) 25%,
    var(--color-border-default) 50%,
    var(--color-background-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

## Component Animations

### Button Press

```css
.btn {
  transition:
    transform 100ms var(--ease-out),
    background-color 150ms var(--ease-smooth);
}

.btn:hover {
  background-color: var(--color-interactive-hover);
}

.btn:active {
  transform: scale(0.96);
}
```

### Card Entrance (Staggered)

```css
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.gist-card {
  animation: card-enter 400ms var(--ease-out-expo) backwards;
}

/* Stagger children */
.gist-list .gist-card:nth-child(1) {
  animation-delay: 0ms;
}
.gist-list .gist-card:nth-child(2) {
  animation-delay: 50ms;
}
.gist-list .gist-card:nth-child(3) {
  animation-delay: 100ms;
}
/* ... continue pattern or use JS for dynamic lists */
```

### Toast Notification

```css
@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateY(100%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toast-exit {
  to {
    opacity: 0;
    transform: translateY(-20px);
  }
}

.toast {
  animation: toast-enter 300ms var(--ease-out-expo);
}

.toast.exiting {
  animation: toast-exit 200ms var(--ease-in) forwards;
}
```

### Modal/Dialog

```css
@keyframes modal-backdrop-enter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modal-content-enter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-backdrop {
  animation: modal-backdrop-enter 200ms var(--ease-out);
}

.modal-content {
  animation: modal-content-enter 300ms var(--ease-out-expo);
}
```

### Bottom Sheet

```css
.bottom-sheet {
  transform: translateY(100%);
  transition: transform 350ms var(--ease-out-expo);
}

.bottom-sheet.open {
  transform: translateY(0);
}

.bottom-sheet.dragging {
  transition: none;
}
```

## Page Transitions

### View Transitions API

```css
/* Default crossfade */
::view-transition-old(root) {
  animation: fade-out 200ms var(--ease-in);
}

::view-transition-new(root) {
  animation: fade-in 300ms var(--ease-out);
}

/* Custom group transitions */
::view-transition-group(gist-card) {
  animation-duration: 400ms;
}
```

### CSS-Only Page Transitions

```css
.page {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 300ms var(--ease-out),
    transform 300ms var(--ease-out-expo);
}

.page.active {
  opacity: 1;
  transform: translateY(0);
}
```

## Scroll-Triggered Animations

### Intersection Observer + CSS

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("animate-in");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 },
);
```

```css
.scroll-animate {
  opacity: 0;
  transform: translateY(30px);
  transition:
    opacity 600ms var(--ease-out),
    transform 600ms var(--ease-out-expo);
}

.scroll-animate.animate-in {
  opacity: 1;
  transform: translateY(0);
}
```

## Reduced Motion

### Media Query Approach

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Keep essential animations */
  .loading-spinner {
    animation-duration: 1s !important;
  }
}
```

### Custom Property Approach

```css
:root {
  --motion-duration: 1;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration: 0;
  }
}

.animated {
  transition: transform calc(200ms * var(--motion-duration)) ease;
}
```

## Performance Optimization

### GPU Acceleration

```css
.animated-element {
  /* Promote to GPU layer */
  will-change: transform, opacity;

  /* Use composited properties only */
  transform: translateZ(0);
}

/* Remove will-change after animation */
.animated-element.animation-complete {
  will-change: auto;
}
```

### CSS Containment

```css
.animation-container {
  contain: layout style paint;
}
```

### Avoid Layout Thrashing

```typescript
// Bad: Interleaving reads and writes
const height = element.offsetHeight; // Read
element.style.height = height + 10 + "px"; // Write
const newHeight = element.offsetHeight; // Read (forces reflow)

// Good: Batch reads and writes
const height = element.offsetHeight;
const newHeight = height + 10;
element.style.height = newHeight + "px";
```

## Animation Checklist

- [ ] Purpose defined: Why does this animation exist?
- [ ] Duration appropriate: Not too fast, not too slow
- [ ] Easing appropriate: Entrance vs exit distinction
- [ ] Reduced motion: Respects user preference
- [ ] 60fps: Uses transform and opacity only
- [ ] Will-change: Applied strategically
- [ ] Fallback: Works without animation
- [ ] Duration tokens: Uses design system values
