import { beforeEach, describe, expect, it } from 'vitest';
import {
  getRateLimitState,
  getTimeUntilReset,
  isSafeToRequest,
  resetRateLimit,
  trackRateLimit,
} from '../../src/services/github/rate-limiter.ts';

describe('Rate Limiter', () => {
  beforeEach(() => {
    resetRateLimit();
  });

  function createMockResponse(headers: Record<string, string>): Response {
    return {
      headers: {
        get: (name: string) => headers[name.toLowerCase()] || null,
      },
    } as unknown as Response;
  }

  it('should initialize with default values', () => {
    const state = getRateLimitState();
    expect(state.limit).toBe(5000);
    expect(state.remaining).toBe(5000);
    expect(state.isLow).toBe(false);
    expect(state.isExceeded).toBe(false);
  });

  it('should update state from headers', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '4999',
      'x-ratelimit-reset': resetSecs.toString(),
      'x-ratelimit-used': '1',
    });

    trackRateLimit(res);

    const state = getRateLimitState();
    expect(state.limit).toBe(5000);
    expect(state.remaining).toBe(4999);
    expect(state.used).toBe(1);
    expect(state.resetAt).toBe(resetSecs * 1000);
    expect(state.isLow).toBe(false);
    expect(state.isExceeded).toBe(false);
  });

  it('should set isLow when remaining < 100', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '99',
      'x-ratelimit-reset': resetSecs.toString(),
      'x-ratelimit-used': '4901',
    });

    trackRateLimit(res);

    const state = getRateLimitState();
    expect(state.remaining).toBe(99);
    expect(state.isLow).toBe(true);
    expect(state.isExceeded).toBe(false);
  });

  it('should set isExceeded when remaining <= 0', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': resetSecs.toString(),
      'x-ratelimit-used': '5000',
    });

    trackRateLimit(res);

    const state = getRateLimitState();
    expect(state.remaining).toBe(0);
    expect(state.isLow).toBe(true);
    expect(state.isExceeded).toBe(true);
  });

  it('should reset state if reset time has passed', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs - 3600;

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': resetSecs.toString(),
      'x-ratelimit-used': '5000',
    });

    trackRateLimit(res);

    const state = getRateLimitState();
    expect(state.remaining).toBe(5000);
    expect(state.used).toBe(0);
    expect(state.isLow).toBe(false);
    expect(state.isExceeded).toBe(false);
  });

  it('isSafeToRequest should return false if exceeded', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': resetSecs.toString(),
    });
    trackRateLimit(res);

    expect(isSafeToRequest()).toBe(false);
  });

  it('isSafeToRequest should return false if remaining <= 10', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '10',
      'x-ratelimit-reset': resetSecs.toString(),
    });
    trackRateLimit(res);

    expect(isSafeToRequest()).toBe(false);
  });

  it('isSafeToRequest should return true if remaining > 10', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '11',
      'x-ratelimit-reset': resetSecs.toString(),
    });
    trackRateLimit(res);

    expect(isSafeToRequest()).toBe(true);
  });

  it('getTimeUntilReset should return 0 if reset passed', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs - 3600;

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': resetSecs.toString(),
    });
    trackRateLimit(res);

    expect(getTimeUntilReset()).toBe(0);
  });

  it('getTimeUntilReset should return > 0 if reset is in future', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': resetSecs.toString(),
    });
    trackRateLimit(res);

    const timeUntilReset = getTimeUntilReset();
    expect(timeUntilReset).toBeGreaterThan(0);
    expect(timeUntilReset).toBeLessThanOrEqual(3600000);
  });
});
