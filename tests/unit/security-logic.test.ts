import test from 'node:test';
import assert from 'node:assert';
import { sanitizeHtml, html } from '../../src/services/security/dom.ts';

test('sanitizeHtml escapes special characters', () => {
  assert.strictEqual(sanitizeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.strictEqual(sanitizeHtml('a & b " c \' d'), 'a &amp; b &quot; c &#039; d');
});

test('html template tag sanitizes values', () => {
  const untrusted = '<img src=x onerror=alert(1)>';
  const result = html`<div>${untrusted}</div>`;
  assert.strictEqual(result, '<div>&lt;img src=x onerror=alert(1)&gt;</div>');
});

test('html template tag handles arrays', () => {
  const array = html`<ul>${['<li>1</li>', '<li>2</li>']}</ul>`;
  assert.strictEqual(array, '<ul>&lt;li&gt;1&lt;/li&gt;&lt;li&gt;2&lt;/li&gt;</ul>');
});
