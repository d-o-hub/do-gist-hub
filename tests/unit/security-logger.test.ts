import { test } from 'node:test';
import assert from 'node:assert';
import { redactAny, redactSecrets } from '../../src/services/security/logger.ts';

test('redactSecrets should redact various PAT patterns', () => {
  const input =
    'My token is ghp_1234567890abcdefghijklmnopqrstuvwxyz and fine-grained is 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7';
  const expected = 'My token is [REDACTED] and fine-grained is [REDACTED]';
  assert.strictEqual(redactSecrets(input), expected);
});

test('redactAny should handle strings', () => {
  assert.strictEqual(redactAny('ghp_1234567890abcdefghijklmnopqrstuvwxyz'), '[REDACTED]');
  assert.strictEqual(redactAny('safe string'), 'safe string');
});

test('redactAny should handle objects', () => {
  const obj = {
    token: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
    nested: {
      secret:
        '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7',
    },
    safe: 123,
  };
  const redacted = redactAny(obj) as { token: string; nested: { secret: string }; safe: number };
  assert.strictEqual(redacted.token, '[REDACTED]');
  assert.strictEqual(redacted.nested.secret, '[REDACTED]');
  assert.strictEqual(redacted.safe, 123);
});

test('redactAny should handle arrays', () => {
  const arr = [
    'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
    { key: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz' },
  ];
  const redacted = redactAny(arr) as [string, { key: string }];
  assert.strictEqual(redacted[0], '[REDACTED]');
  assert.strictEqual(redacted[1].key, '[REDACTED]');
});

test('redactAny should handle circular references', () => {
  const obj: Record<string, unknown> = { name: 'circular' };
  obj.self = obj;
  const redacted = redactAny(obj) as { name: string; self: string };
  assert.strictEqual(redacted.name, 'circular');
  assert.strictEqual(redacted.self, '[CIRCULAR]');
});

test('redactAny should handle Errors', () => {
  const err = new Error('Failed with ghp_1234567890abcdefghijklmnopqrstuvwxyz');
  const redacted = redactAny(err) as Error;
  assert.strictEqual(redacted.message, 'Failed with [REDACTED]');
  assert.ok(redacted.stack?.includes('[REDACTED]'));
});
