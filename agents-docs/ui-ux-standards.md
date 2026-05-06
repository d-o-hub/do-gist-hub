# UI/UX Production Standards

## Critical Rules

1. **No Unstyled Elements** - Every interactive element MUST have explicit CSS styling
2. **Mobile-First** - Base styles for mobile, enhance for desktop
3. **Tokens Only** - No hardcoded px/hex values outside token definitions
4. **Validate Before Commit** - Screenshots at 320px, 768px, 1536px

## Mobile-First CSS Patterns

**Navigation (Dual-mode)**

```css
/* Base: Mobile - hide sidebar, show bottom nav */
.sidebar-nav {
  display: none;
}
.bottom-nav {
  display: flex;
}

/* Desktop: show sidebar, hide bottom nav */
@media (min-width: 768px) {
  .sidebar-nav {
    display: flex;
  }
  .bottom-nav {
    display: none;
  }
}
```

**Layout (No Gaps)**

```css
/* App shell with dynamic viewport */
.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
}

/* Flex child with proper scrolling */
.app-main {
  flex: 1 0 auto;
  min-height: 0;
  padding: var(--spacing-4);
}
```

**Safe Areas (Notch Support)**

```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}

.app-header {
  padding-top: calc(var(--spacing-3) + var(--safe-area-top));
}
```

## Common Regressions to Prevent

| Issue                     | Prevention                                    |
| ------------------------- | --------------------------------------------- |
| Sidebar visible on mobile | Base style `display: none`                    |
| Unstyled buttons          | Always use `.btn` / `.nav-item` classes       |
| Layout gaps               | Use `flex: 1 0 auto` + `min-height: 0`        |
| Missing active states     | Define `.active` for all interactive elements |
| Hardcoded values          | Use CSS custom properties only                |

## 2026 Patterns

**View Transitions**

```typescript
import { withViewTransition } from '../utils/view-transitions';
withViewTransition(() => {
  /* navigation */
});
```

**Container Queries**

```css
.gist-card {
  container-type: inline-size;
  container-name: gist-card;
}
```

**Reduced Motion**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

## Validation

```bash
# Screenshot validation
agent-browser open http://localhost:5173
agent-browser set viewport 390 844
agent-browser screenshot analysis/responsive/390px.png

# Check for overflow
agent-browser eval "document.documentElement.scrollWidth <= window.innerWidth"
```

## References

- `patterns/dynamic-viewport-units.md`
- `patterns/mobile-first-navigation.md`
- `.agents/skills/design-token-system/references/mobile-layout-2026.md`
- `.agents/skills/design-token-system/references/production-ui-standards.md`
