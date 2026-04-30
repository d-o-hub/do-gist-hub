import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../../src/services/security/dom';

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
});
