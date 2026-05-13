/**
 * Unit tests for src/services/github/rate-limiter.ts
 * Vitest port of rate-limiter.spec.ts (which used node:test and was never picked up)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  trackRateLimit,
  getRateLimitState,
  isSafeToRequest,
  getTimeUntilReset,
  resetRateLimit,
} from '../../src/services/github/rate-limiter';

function createMockResponse(headers: Record<string, string>): Response {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as Response;
}

describe('RateLimiter', () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it('initializes with default values', () => {
    const state = getRateLimitState();
    expect(state.limit).toBe(5000);
    expect(state.remaining).toBe(5000);
    expect(state.isLow).toBe(false);
    expect(state.isExceeded).toBe(false);
  });

  it('updates state from response headers', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    trackRateLimit(
      createMockResponse({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4999',
        'x-ratelimit-reset': resetSecs.toString(),
        'x-ratelimit-used': '1',
      })
    );

    const state = getRateLimitState();
    expect(state.limit).toBe(5000);
    expect(state.remaining).toBe(4999);
    expect(state.used).toBe(1);
    expect(state.resetAt).toBe(resetSecs * 1000);
    expect(state.isLow).toBe(false);
    expect(state.isExceeded).toBe(false);
  });

  it('sets isLow when remaining < 100', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    trackRateLimit(
      createMockResponse({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '99',
        'x-ratelimit-reset': resetSecs.toString(),
        'x-ratelimit-used': '4901',
      })
    );

    const state = getRateLimitState();
    expect(state.remaining).toBe(99);
    expect(state.isLow).toBe(true);
    expect(state.isExceeded).toBe(false);
  });

  it('sets isExceeded when remaining <= 0', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    trackRateLimit(
      createMockResponse({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': resetSecs.toString(),
        'x-ratelimit-used': '5000',
      })
    );

    const state = getRateLimitState();
    expect(state.remaining).toBe(0);
    expect(state.isLow).toBe(true);
    expect(state.isExceeded).toBe(true);
  });

  it('resets state if reset time has passed', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs - 3600; // 1 hour ago

    trackRateLimit(
      createMockResponse({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': resetSecs.toString(),
        'x-ratelimit-used': '5000',
      })
    );

    const state = getRateLimitState();
    expect(state.remaining).toBe(5000);
    expect(state.used).toBe(0);
    expect(state.isLow).toBe(false);
    expect(state.isExceeded).toBe(false);
  });

  it('isSafeToRequest returns false if exceeded', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    trackRateLimit(
      createMockResponse({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': resetSecs.toString(),
      })
    );

    expect(isSafeToRequest()).toBe(false);
  });

  it('isSafeToRequest returns false if remaining <= 10', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    trackRateLimit(
      createMockResponse({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '10',
        'x-ratelimit-reset': resetSecs.toString(),
      })
    );

    expect(isSafeToRequest()).toBe(false);
  });

  it('isSafeToRequest returns true if remaining > 10', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    trackRateLimit(
      createMockResponse({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '11',
        'x-ratelimit-reset': resetSecs.toString(),
      })
    );

    expect(isSafeToRequest()).toBe(true);
  });

  it('getTimeUntilReset returns 0 if reset passed', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs - 3600;

    trackRateLimit(
      createMockResponse({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': resetSecs.toString(),
      })
    );

    expect(getTimeUntilReset()).toBe(0);
  });

  it('getTimeUntilReset returns > 0 if reset is in future', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    trackRateLimit(
      createMockResponse({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': resetSecs.toString(),
      })
    );

    const timeUntilReset = getTimeUntilReset();
    expect(timeUntilReset).toBeGreaterThan(0);
    expect(timeUntilReset).toBeLessThanOrEqual(3600000); // 1 hour
  });
});
