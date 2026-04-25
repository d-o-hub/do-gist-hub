# CSS Navigation Patterns

## Pattern: Mobile-First Navigation

### Rule
Always define base styles for mobile before desktop media queries.

### Correct
```css
/* Base: Mobile - hide sidebar */
.sidebar-nav {
  display: none;
}

/* Desktop: show sidebar */
@media (min-width: 768px) {
  .sidebar-nav {
    display: flex;
  }
}
```

### Incorrect
```css
/* Wrong: No base style, sidebar visible everywhere */
.sidebar-nav {
  display: flex;
}

@media (max-width: 767px) {
  .sidebar-nav {
    display: none;
  }
}
```

### Why
Mobile-first ensures elements are hidden by default on mobile, preventing
unstyled content from appearing during page load or if CSS fails.

### Detection
```bash
grep -n "\.sidebar-nav" src/styles/base.css | head -5
```

### Prevention
- Always add base `display: none` for elements hidden on mobile
- Use `display: none` not `visibility: hidden` for layout elements
- Place base styles before any media queries
