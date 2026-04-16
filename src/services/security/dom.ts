/**
 * DOM Security Utilities (2026)
 * Prevents XSS and ensures secure DOM manipulation.
 */

/**
 * Sanitize a string for HTML insertion
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Creates a secure HTML template string from a trusted template and untrusted values
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((acc, str, i) => {
    const value = values[i];
    let sanitizedValue = '';

    if (value === undefined || value === null) {
      sanitizedValue = '';
    } else if (Array.isArray(value)) {
      sanitizedValue = value.join('');
    } else {
      sanitizedValue = sanitizeHtml(String(value));
    }

    return acc + str + sanitizedValue;
  }, '');
}
