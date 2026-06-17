import { describe, expect, it } from 'vitest';
import { html, sanitizeHtml, sanitizeUrl } from '../../src/services/security/dom';

describe('sanitizeHtml', () => {
  it('escapes special characters', () => {
    const input = '<script>alert("xss")</script> & " \'';
    const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot; &#039;';
    expect(sanitizeHtml(input)).toBe(expected);
  });

  it('handles null/undefined', () => {
    expect(sanitizeHtml(null as unknown as string)).toBe('');
    expect(sanitizeHtml(undefined as unknown as string)).toBe('');
  });

  it('handles numbers', () => {
    expect(sanitizeHtml(123 as unknown as string)).toBe('123');
  });

  it('handles objects by converting to string', () => {
    const obj = { toString: () => 'custom' };
    expect(sanitizeHtml(obj as unknown as string)).toBe('custom');
  });
});

describe('html tagged template', () => {
  it('returns plain string when no interpolations', () => {
    const result = html`<div>hello</div>`;
    expect(result).toBe('<div>hello</div>');
  });

  it('sanitizes interpolated string values', () => {
    const name = '<script>alert("xss")</script>';
    const result = html`<div>${name}</div>`;
    expect(result).toBe('<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>');
  });

  it('sanitizes interpolated number values', () => {
    const count = 42;
    const result = html`<span data-count="${count}">${count}</span>`;
    expect(result).toBe('<span data-count="42">42</span>');
  });

  it('renders empty string for null/undefined values', () => {
    const result = html`<p>${null}${undefined}</p>`;
    expect(result).toBe('<p></p>');
  });

  it('sanitizes each element in an array', () => {
    const items = ['<b>bold</b>', '<script>evil</script>'];
    const result = html`<ul>${items}</ul>`;
    expect(result).toBe(
      '<ul>&lt;b&gt;bold&lt;/b&gt;&lt;script&gt;evil&lt;/script&gt;</ul>',
    );
  });

  it('handles empty array', () => {
    const items: string[] = [];
    const result = html`<ul>${items}</ul>`;
    expect(result).toBe('<ul></ul>');
  });

  it('handles multiple interpolations', () => {
    const title = 'Hello & Welcome';
    const body = '<p>content</p>';
    const result = html`<h1>${title}</h1><div>${body}</div>`;
    expect(result).toBe(
      '<h1>Hello &amp; Welcome</h1><div>&lt;p&gt;content&lt;/p&gt;</div>',
    );
  });

  it('sanitizes boolean-like values', () => {
    const result = html`<input disabled="${true}" />`;
    expect(result).toBe('<input disabled="true" />');
  });
});

// ── sanitizeHtml fast-path (PR: single-pass fast-path optimization) ──────────

describe('sanitizeHtml fast-path', () => {
  it('returns the string unchanged when it contains no special characters', () => {
    const clean = 'Hello World';
    const result = sanitizeHtml(clean);
    expect(result).toBe(clean);
  });

  it('returns an empty string unchanged via fast-path', () => {
    const result = sanitizeHtml('');
    expect(result).toBe('');
  });

  it('returns alphanumeric strings unchanged', () => {
    const input = 'abc123XYZ';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it('returns strings with spaces and punctuation (no special chars) unchanged', () => {
    const input = 'Hello, world! How are you?';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it('escapes & even when it is the only special character (bypasses fast-path)', () => {
    expect(sanitizeHtml('a&b')).toBe('a&amp;b');
  });

  it('escapes < even when it is the only special character (bypasses fast-path)', () => {
    expect(sanitizeHtml('a<b')).toBe('a&lt;b');
  });

  it('escapes > even when it is the only special character (bypasses fast-path)', () => {
    expect(sanitizeHtml('a>b')).toBe('a&gt;b');
  });

  it('escapes " even when it is the only special character (bypasses fast-path)', () => {
    expect(sanitizeHtml('say "hi"')).toBe('say &quot;hi&quot;');
  });

  it("escapes ' even when it is the only special character (bypasses fast-path)", () => {
    expect(sanitizeHtml("it's")).toBe('it&#039;s');
  });

  it('escapes ` even when it is the only special character (bypasses fast-path)', () => {
    expect(sanitizeHtml('`')).toBe('&#096;');
  });

  it('returns a long clean string unchanged via fast-path (regression)', () => {
    const longClean = 'a'.repeat(10000);
    const result = sanitizeHtml(longClean);
    expect(result).toBe(longClean);
    expect(result.length).toBe(10000);
  });

  it('correctly escapes a string that starts with clean chars and ends with special chars', () => {
    const input = 'clean prefix <dangerous>';
    expect(sanitizeHtml(input)).toBe('clean prefix &lt;dangerous&gt;');
  });
});

describe('sanitizeUrl', () => {
  it('allows safe protocols', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    expect(sanitizeUrl('mailto:user@example.com')).toBe('mailto:user@example.com');
    expect(sanitizeUrl('tel:+123456789')).toBe('tel:+123456789');
  });

  it('allows relative paths', () => {
    expect(sanitizeUrl('/path/to/resource')).toBe('/path/to/resource');
    expect(sanitizeUrl('path/to/resource')).toBe('path/to/resource');
    expect(sanitizeUrl('./path')).toBe('./path');
    expect(sanitizeUrl('../path')).toBe('../path');
  });

  it('blocks javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('  javascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('\x01javascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('\x00javascript:alert(1)')).toBe('about:blank');
  });

  it('blocks data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('about:blank');
    expect(sanitizeUrl('DATA:image/png;base64,...')).toBe('about:blank');
  });

  it('blocks vbscript: protocol', () => {
    expect(sanitizeUrl('vbscript:msgbox("hello")')).toBe('about:blank');
    expect(sanitizeUrl('VBSCRIPT:alert(1)')).toBe('about:blank');
  });

  it('handles null, undefined and empty strings', () => {
    expect(sanitizeUrl(null)).toBe('');
    expect(sanitizeUrl(undefined)).toBe('');
    expect(sanitizeUrl('')).toBe('');
    expect(sanitizeUrl('   ')).toBe('');
  });

  it('blocks URLs with leading control characters', () => {
    expect(sanitizeUrl('\x19javascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('\x01  javascript:alert(1)')).toBe('about:blank');
  });
});
