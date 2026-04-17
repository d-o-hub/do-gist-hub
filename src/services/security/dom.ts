/**
 * DOM Security Utilities (2026)
 * Prevents XSS and ensures secure DOM manipulation.
 */

/**
 * Sanitize a string for HTML insertion
 * ⚡ Bolt: Fast regex-based escaping for security and performance
 */
export function sanitizeHtml(input: string): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
      // ✅ Sentinel: Recursively sanitize array elements
      sanitizedValue = value.map((v) => sanitizeHtml(String(v))).join('');
    } else {
      sanitizedValue = sanitizeHtml(String(value));
    }

    return acc + str + sanitizedValue;
  }, '');
}
