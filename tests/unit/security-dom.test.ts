import { sanitizeHtml } from '../../src/services/security/dom.ts';
import assert from 'node:assert';
import test from 'node:test';

test('sanitizeHtml escapes special characters', () => {
  const input = '<script>alert("xss")</script> & " \'';
  const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot; &#039;';
  assert.strictEqual(sanitizeHtml(input), expected);
});

test('sanitizeHtml handles null/undefined', () => {
  assert.strictEqual(sanitizeHtml(null as any), '');
  assert.strictEqual(sanitizeHtml(undefined as any), '');
});

test('sanitizeHtml handles numbers', () => {
  assert.strictEqual(sanitizeHtml(123 as any), '123');
});
