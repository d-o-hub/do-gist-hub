# Component Library Patterns

Reusable UI component patterns following 2026 best practices.

## Card Pattern

```css
.gist-card {
  background: var(--color-background-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  padding: var(--spacing-4);
  transition: all var(--motion-duration-fast) var(--ease-out);
}

.gist-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

## Button Pattern

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-full);
  font-weight: var(--font-weight-semibold);
  transition: all var(--motion-duration-fast) ease;
  min-height: 40px;
}

.button:active {
  transform: scale(0.98);
}
```

## Input Pattern

```css
.input {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  transition: border-color var(--motion-duration-fast) ease,
              box-shadow var(--motion-duration-fast) ease;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent-primary);
  box-shadow: 0 0 0 3px var(--color-accent-subtle);
}
```

## Toast Pattern

```typescript
interface ToastOptions {
  duration?: number;
  position?: 'top' | 'bottom' | 'top-right' | 'bottom-right';
  dismissible?: boolean;
}

toast.success('Message', options);
toast.error('Message', options);
toast.info('Message', options);
```

## Skeleton Pattern

```css
.skeleton {
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
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```
