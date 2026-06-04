/**
 * Accessible Button Component
 * ARIA-compliant button with variant support and loading states
 */

export function createButton(options: {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaControls?: string;
}): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = options.label;
  button.type = 'button';
  button.className = 'btn';
  if (options.variant) {
    button.classList.add(`btn-${options.variant}`);
  }
  button.addEventListener('click', options.onClick);

  // Disabled state
  if (options.disabled) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
  }

  // Loading state
  if (options.loading) {
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('aria-live', 'polite');
    button.disabled = true;
  }

  // Accessibility
  if (options.ariaLabel) {
    button.setAttribute('aria-label', options.ariaLabel);
  }
  if (options.ariaExpanded !== undefined) {
    button.setAttribute('aria-expanded', String(options.ariaExpanded));
  }
  if (options.ariaControls) {
    button.setAttribute('aria-controls', options.ariaControls);
  }

  return button;
}
