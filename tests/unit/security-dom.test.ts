import { describe, it, expect } from 'vitest';
import { sanitizeHtml, html } from '../../src/services/security/dom';

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
