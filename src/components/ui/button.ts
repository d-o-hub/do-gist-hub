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
  loadingLabel?: string;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaControls?: string;
  ariaDescribedby?: string;
}): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn';
  if (options.variant) {
    button.classList.add(`btn-${options.variant}`);
  }

  // Render the label inside a `.btn-label` span so the CSS can dim
  // it during the busy state. The optional `loadingLabel` lets the
  // consumer surface what's actually happening ("Saving…" vs "Save").
  const labelText = options.loading && options.loadingLabel ? options.loadingLabel : options.label;
  const spinnerHtml = options.loading ? '<span class="btn-spinner" aria-hidden="true"></span>' : '';
  button.innerHTML = `${spinnerHtml}<span class="btn-label">${escapeHtml(labelText)}</span>`;

  button.addEventListener('click', options.onClick);

  // Disabled state
  if (options.disabled) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
  }

  // Loading state — disable interaction, set busy semantics, and
  // append a polite live region message so screen readers announce
  // the action is in progress without re-announcing the label.
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
  if (options.ariaDescribedby) {
    button.setAttribute('aria-describedby', options.ariaDescribedby);
  }

  return button;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
