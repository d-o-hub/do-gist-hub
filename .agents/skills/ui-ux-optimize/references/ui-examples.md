# UI/UX Optimization Code Examples

## Accessibility CSS

```css
/* src/styles/accessibility.css */

/* Focus indicators */
:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
}

/* Skip links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-background-inverse);
  color: var(--color-foreground-inverse);
  padding: 0.5rem 1rem;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* High contrast mode */
@media (forced-colors: active) {
  button {
    border: 1px solid ButtonText;
  }
}
```

## Accessible Button Creation

```typescript
// src/components/ui/button.ts
export function createButton(options: {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
}): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = options.label;
  button.addEventListener('click', options.onClick);

  if (options.variant) button.dataset.variant = options.variant;
  if (options.disabled) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
  }
  if (options.loading) {
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('aria-live', 'polite');
  }
  if (options.ariaLabel) button.setAttribute('aria-label', options.ariaLabel);

  return button;
}
```

## Token-Driven Component

```typescript
// src/components/ui/card.ts
export function createCard(options: {
  title: string;
  content: string;
  actions: Array<{ label: string; onClick: () => void }>;
}): HTMLElement {
  const card = document.createElement('article');
  card.classList.add('card');

  const title = document.createElement('h2');
  title.textContent = options.title;
  title.classList.add('card-title');

  const content = document.createElement('p');
  content.textContent = options.content;
  content.classList.add('card-content');

  const actions = document.createElement('div');
  actions.classList.add('card-actions');
  options.actions.forEach(action => {
    const btn = createButton({ label: action.label, onClick: action.onClick });
    actions.appendChild(btn);
  });

  card.appendChild(title);
  card.appendChild(content);
  card.appendChild(actions);

  return card;
}
```

## Toast Notifications

```typescript
// src/components/ui/toast.ts
export class ToastManager {
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('toast-container') || this.createContainer();
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'assertive');
    container.setAttribute('aria-atomic', 'true');
    container.style.cssText = `
      position: fixed;
      bottom: var(--spacing-4);
      right: var(--spacing-4);
      z-index: var(--z-toast);
    `;
    document.body.appendChild(container);
    return container;
  }

  show(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const toast = document.createElement('div');
    toast.setAttribute('role', 'alert');
    toast.classList.add('toast', `toast-${type}`);
    toast.textContent = message;
    this.container.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error'); }
}
```

## Offline Indicator

```html
<!-- src/components/network/offline-indicator.html -->
<div
  class="offline-indicator"
  role="status"
  aria-live="polite"
  aria-label="Connection status"
>
  <span class="offline-icon" aria-hidden="true">📡</span>
  <span class="offline-text">You are currently offline. Changes will sync when reconnected.</span>
</div>
```

## Motion and Transitions

```css
/* src/styles/motion.css */
:root {
  --motion-duration-fast: 150ms;
  --motion-duration-normal: 250ms;
  --motion-duration-slow: 400ms;
  --motion-ease-out: cubic-bezier(0, 0, 0.2, 1);
  --motion-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Button hover transition */
.button {
  transition:
    background-color var(--motion-duration-fast) var(--motion-ease-out),
    transform var(--motion-duration-fast) var(--motion-ease-out);
}

/* Card entrance animation */
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-enter-active {
  animation: card-enter var(--motion-duration-normal) var(--motion-ease-out);
}
```
