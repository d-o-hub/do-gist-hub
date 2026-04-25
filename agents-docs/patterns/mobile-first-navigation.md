# Pattern: Mobile-First Navigation

## Context
Standard responsive pattern for 2026 apps using multiple navigation modes (bottom nav, rail, sidebar).

## Good Pattern
Explicitly hide all navigation components in base styles (`display: none`) and selectively enable them using media queries. This prevents layout flickering and ensures only one navigation mode is active at any breakpoint.

```css
.sidebar-nav, .rail-nav, .bottom-nav {
  display: none;
}

@media (max-width: 767px) {
  .bottom-nav { display: flex; }
}
```

## Bad Pattern
Leaving components with `display: flex` or `display: block` at the top level and trying to hide them only in specific media queries. This leads to "flash of unstyled content" where multiple navs might appear simultaneously.
