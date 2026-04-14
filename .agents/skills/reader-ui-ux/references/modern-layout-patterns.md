# Modern Layout Patterns (2026)

Modern CSS layout techniques for responsive, adaptive interfaces.

## Container Queries

Container queries enable component-level responsive behavior independent of viewport size.

### Basic Container Setup

```css
/* Define container on parent */
.gist-list-item {
  container-type: inline-size;
  container-name: gist-card;
}

/* Query based on container width */
@container gist-card (min-width: 400px) {
  .gist-card-header {
    flex-direction: row;
    align-items: center;
  }
}

@container gist-card (min-width: 600px) {
  .gist-card-actions {
    display: flex;
    gap: var(--spacing-2);
  }
}
```

### Container Types

| Type          | Behavior                           | Use Case           |
| ------------- | ---------------------------------- | ------------------ |
| `inline-size` | Responds to inline (width) changes | Cards, list items  |
| `size`        | Responds to both width and height  | Complex components |
| `normal`      | No containment (default)           | Static content     |

### Style Queries

```css
@container style(--card-variant: featured) {
  .gist-card {
    border-color: var(--color-accent-primary);
    box-shadow: var(--shadow-accent);
  }
}
```

## View Transitions API

Smooth transitions between page states and element changes.

### Page-Level Transitions

```typescript
// Enable view transitions for navigation
async function navigateTo(route: string) {
  if (!document.startViewTransition) {
    await performNavigation(route);
    return;
  }

  const transition = document.startViewTransition(() => {
    performNavigation(route);
  });

  await transition.finished;
}
```

### Element Transitions

```typescript
// Transition specific elements
function updateGistList() {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      renderNewGists();
    });
  } else {
    renderNewGists();
  }
}
```

### View Transition Names

```css
/* Assign names for morphing animations */
.gist-card {
  view-transition-name: gist-card;
}

.gist-detail {
  view-transition-name: gist-detail;
}

/* Customize transition animations */
::view-transition-old(gist-card) {
  animation: fade-out 200ms ease-out;
}

::view-transition-new(gist-detail) {
  animation: fade-in 300ms ease-out;
}
```

### Fallback Strategy

```typescript
function withViewTransition(callback: () => void): Promise<void> {
  if ("startViewTransition" in document) {
    return document.startViewTransition(callback).finished;
  }

  callback();
  return Promise.resolve();
}
```

## Anchor Positioning

Position elements relative to anchors (2026 emerging support).

```css
/* Define anchor */
.tooltip-trigger {
  anchor-name: --tooltip-anchor;
}

/* Position tooltip relative to anchor */
.tooltip {
  position: absolute;
  position-anchor: --tooltip-anchor;
  position-area: top;

  /* Fallback for unsupported browsers */
  inset-area: top;
}
```

## CSS Subgrid

Align nested grid items with parent grid.

```css
.gist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-4);
}

.gist-card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-row: span 3;
}

.gist-card-content {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
}
```

## Has() Selector

Parent selection without JavaScript.

```css
/* Style card when it contains a starred button */
.gist-card:has(.star-btn.starred) {
  border-color: var(--color-accent-primary);
}

/* Style list when any item is hovered */
.gist-list:has(.gist-card:hover) .gist-card:not(:hover) {
  opacity: 0.7;
}
```

## Logical Properties

Internationalization-friendly layout.

```css
.gist-card {
  margin-inline: var(--spacing-4); /* Left/Right in LTR */
  margin-block: var(--spacing-2); /* Top/Bottom */
  padding-inline-start: var(--spacing-3); /* Left in LTR, Right in RTL */
  border-inline-end: 1px solid var(--color-border);
}
```

## Aspect Ratio

Maintain consistent proportions.

```css
.gist-preview-image {
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.gist-avatar {
  aspect-ratio: 1;
  border-radius: var(--radius-full);
}
```

## Comparison: Media vs Container Queries

| Feature     | Media Queries     | Container Queries      |
| ----------- | ----------------- | ---------------------- |
| Based on    | Viewport size     | Parent container       |
| Use case    | Page layout       | Component layout       |
| Reusability | Context-dependent | Component-encapsulated |
| Performance | Single evaluation | Per-container          |

## Best Practices

1. **Use container queries for components**, media queries for page layout
2. **Provide fallbacks** for View Transitions API
3. **Name view transitions** for morphing animations
4. **Use logical properties** for internationalization
5. **Combine techniques**: Container queries + View transitions

## Browser Support (2026)

| Feature            | Chrome  | Safari   | Firefox    |
| ------------------ | ------- | -------- | ---------- |
| Container Queries  | ✅ 105+ | ✅ 16+   | ✅ 110+    |
| View Transitions   | ✅ 111+ | ✅ 18+   | 🚧 Nightly |
| Anchor Positioning | 🚧 Flag | 🚧 TP    | 🚧 Nightly |
| Has() Selector     | ✅ 105+ | ✅ 15.4+ | ✅ 121+    |
| Subgrid            | ✅ 117+ | ✅ 16+   | ✅ 71+     |
