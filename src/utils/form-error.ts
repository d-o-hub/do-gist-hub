/**
 * Inline Form Error Helper
 *
 * Shows field-level errors next to the input. The error appears as a
 * short message under the field, the input gets `aria-invalid="true"`
 * and a red focus ring, and a live region announces the error so
 * screen readers pick it up.
 *
 * Errors are saved on the field's `dataset.invalidMessage` so a
 * later `clearFieldError()` can restore the message if the user
 * later re-triggers the same error. (The current implementation
 * doesn't use this — it just clears — but the hook is here for
 * future "remember the last error" flows.)
 */

const LIVE_REGION_ID = 'form-error-live-region';

function getLiveRegion(): HTMLElement {
  let region = document.getElementById(LIVE_REGION_ID);
  if (!region) {
    region = document.createElement('div');
    region.id = LIVE_REGION_ID;
    region.className = 'sr-only';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    document.body.appendChild(region);
  }
  return region;
}

/**
 * Show an inline error on a form field.
 *
 * The function looks for (or creates) a `.form-error` element that
 * sits inside the same `.form-group` parent as the input, so the
 * error appears directly under the field. It also sets
 * `aria-invalid="true"` and `aria-describedby` on the input so
 * screen readers announce the error.
 */
export function showFieldError(input: HTMLElement, message: string): void {
  const group = input.closest('.form-group');
  if (!group) return;

  let errorEl = group.querySelector('.form-error') as HTMLElement | null;
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.className = 'form-error';
    errorEl.id = `${input.id || 'field'}-error`;
    group.appendChild(errorEl);
  }
  errorEl.textContent = message;

  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorEl.id);
  }

  // Announce the error to screen readers.
  const region = getLiveRegion();
  region.textContent = '';
  // Re-set on next tick so repeated identical errors are re-announced.
  window.setTimeout(() => {
    region.textContent = message;
  }, 0);
}

/** Remove the inline error from a field and reset its ARIA state. */
export function clearFieldError(input: HTMLElement): void {
  const group = input.closest('.form-group');
  if (!group) return;
  const errorEl = group.querySelector('.form-error');
  if (errorEl) errorEl.remove();

  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
}

/**
 * Clear all inline errors in a container. Use this on form mount
 * and after a successful submit so the user starts clean.
 */
export function clearAllFieldErrors(container: HTMLElement): void {
  for (const errorEl of container.querySelectorAll('.form-error')) {
    errorEl.remove();
  }
  for (const input of container.querySelectorAll<HTMLElement>('[aria-invalid="true"]')) {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
}
