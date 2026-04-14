# Design Tokens Usage Guide

How to use the design token system for consistent, themeable interfaces.

## Token Architecture

### Three-Layer System

```
Primitive Tokens → Semantic Tokens → Component Tokens
```

### 1. Primitive Tokens

Fundamental values, never used directly in components.

### 2. Semantic Tokens

Contextual meanings, theme-aware.

### 3. Component Tokens

Component-specific overrides.

## CSS Custom Properties

### Generation

Tokens are generated as CSS custom properties and injected into the document.

### Injection

```typescript
export function initDesignTokens(): void {
  if (document.getElementById('design-tokens')) return;
  
  const style = document.createElement('style');
  style.id = 'design-tokens';
  style.textContent = generateCSSVariables();
  document.head.appendChild(style);
}
```

## Usage Patterns

### Basic Component Styling

```css
/* Always use semantic tokens */
.gist-card {
  background: var(--color-background-elevated);
  color: var(--color-foreground-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  padding: var(--spacing-4);
  box-shadow: var(--shadow-sm);
}
```

### Theme-Aware Components

```css
.button {
  background: var(--color-accent-primary);
  color: var(--color-foreground-inverse);
}

.button:hover {
  background: var(--color-accent-hover);
}
```

## Token Categories

### Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| color-bg-primary | gray-50 | gray-900 | Page background |
| color-bg-secondary | gray-100 | gray-800 | Sections |
| color-fg-primary | gray-900 | gray-50 | Primary text |
| color-accent | blue-600 | blue-500 | Actions |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| spacing-1 | 4px | Icon padding |
| spacing-2 | 8px | Tight gaps |
| spacing-4 | 16px | Component padding |
| spacing-6 | 24px | Section padding |

### Motion

| Token | Value | Usage |
|-------|-------|-------|
| duration-fast | 150ms | Hover states |
| duration-normal | 200ms | Transitions |
| ease-out | cubic-bezier(0, 0, 0.2, 1) | Enter animations |

## Best Practices

1. Never hardcode values - always use tokens
2. Use semantic tokens in components
3. Primitives are for token definitions only
4. Override at component level for variants
