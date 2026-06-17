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
  signal?: AbortSignal;
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
  // Uses DOM APIs (textContent + appendChild) to avoid innerHTML.
  const labelText = options.loading && options.loadingLabel ? options.loadingLabel : options.label;
  if (options.loading) {
    const spinner = document.createElement('span');
    spinner.className = 'btn-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    button.appendChild(spinner);
  }
  const labelSpan = document.createElement('span');
  labelSpan.className = 'btn-label';
  labelSpan.textContent = labelText;
  button.appendChild(labelSpan);

  const listenerOptions = options.signal ? { signal: options.signal } : undefined;
  button.addEventListener('click', options.onClick, listenerOptions);

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

/**
 * Set an existing button element to its busy/loading state.
 * Clears children, appends a spinner + label span using DOM APIs.
 * Use this for buttons created outside createButton() (e.g. from innerHTML).
 */
export function setButtonLoading(btn: Element, label: string): void {
  btn.replaceChildren();
  const spinner = document.createElement('span');
  spinner.className = 'btn-spinner';
  spinner.setAttribute('aria-hidden', 'true');
  btn.appendChild(spinner);
  const labelSpan = document.createElement('span');
  labelSpan.className = 'btn-label';
  labelSpan.textContent = label;
  btn.appendChild(labelSpan);
}

/**
 * Reset an existing button element to a plain text label.
 * Clears children and appends a single label span via DOM APIs.
 */
export function setButtonText(btn: Element, label: string): void {
  btn.replaceChildren();
  const labelSpan = document.createElement('span');
  labelSpan.className = 'btn-label';
  labelSpan.textContent = label;
  btn.appendChild(labelSpan);
}
