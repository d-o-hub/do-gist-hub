import { describe, it, expect } from 'vitest';
import { redactAny, redactSecrets } from '../../src/services/security/logger.ts';

describe('security logger', () => {
  it('should redact various PAT patterns', () => {
    const input =
      'My token is ghp_1234567890abcdefghijklmnopqrstuvwxyz and fine-grained is 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7';
    const expected = 'My token is [REDACTED] and fine-grained is [REDACTED]';
    expect(redactSecrets(input)).toBe(expected);
  });

  it('should handle strings', () => {
    expect(redactAny('ghp_1234567890abcdefghijklmnopqrstuvwxyz')).toBe('[REDACTED]');
    expect(redactAny('safe string')).toBe('safe string');
  });

  it('should handle objects', () => {
    const obj = {
      token: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
      nested: {
        secret:
          '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7',
      },
      safe: 123,
    };
    const redacted = redactAny(obj) as { token: string; nested: { secret: string }; safe: number };
    expect(redacted.token).toBe('[REDACTED]');
    expect(redacted.nested.secret).toBe('[REDACTED]');
    expect(redacted.safe).toBe(123);
  });

  it('should handle arrays', () => {
    const arr = [
      'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
      { key: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz' },
    ];
    const redacted = redactAny(arr) as [string, { key: string }];
    expect(redacted[0]).toBe('[REDACTED]');
    expect(redacted[1].key).toBe('[REDACTED]');
  });

  it('should handle circular references', () => {
    const obj: Record<string, unknown> = { name: 'circular' };
    obj.self = obj;
    const redacted = redactAny(obj) as { name: string; self: string };
    expect(redacted.name).toBe('circular');
    expect(redacted.self).toBe('[CIRCULAR]');
  });

  it('should handle Errors', () => {
    const err = new Error('Failed with ghp_1234567890abcdefghijklmnopqrstuvwxyz');
    const redacted = redactAny(err) as Error;
    expect(redacted.message).toBe('Failed with [REDACTED]');
    expect(redacted.stack?.includes('[REDACTED]')).toBe(true);
  });
});
