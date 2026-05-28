/**
 * DOM Security Utilities (2026)
 * Prevents XSS and ensures secure DOM manipulation.
 */

const ESCAPE_LOOKUP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
  '`': '&#096;',
};

/**
 * Sanitize a string for HTML insertion
 * ⚡ Bolt: Fast single-pass regex-based escaping for maximum performance.
 * Includes a fast-path for strings that do not contain any special characters.
 */
export function sanitizeHtml(input: string): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  if (!/[&<>"'`]/.test(str)) return str;
  return str.replace(/[&<>"'`]/g, (match) => ESCAPE_LOOKUP[match]!);
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
