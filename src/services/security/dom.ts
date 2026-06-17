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

const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:'];

/**
 * Sanitize a URL to prevent XSS via dangerous protocols
 * Blocks javascript:, data:, and vbscript: protocols.
 */
export function sanitizeUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmedUrl = String(url).trim();

  // Strip leading control characters (U+0000-U+001F, U+007F-U+009F) and whitespace
  // to prevent bypass attempts like \x00javascript:alert(1)
  let start = 0;
  while (start < trimmedUrl.length) {
    const code = trimmedUrl.charCodeAt(start);
    // Control chars: 0x00-0x1F, 0x7F-0x9F, and whitespace (0x09-0x0D, 0x20)
    if (
      code <= 0x1f ||
      (code >= 0x7f && code <= 0x9f) ||
      code === 0x09 ||
      code === 0x0a ||
      code === 0x0d ||
      code === 0x20
    ) {
      start++;
    } else {
      break;
    }
  }

  const strippedUrl = trimmedUrl.slice(start).toLowerCase();
  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (strippedUrl.startsWith(protocol)) {
      return 'about:blank';
    }
  }

  return trimmedUrl;
}
