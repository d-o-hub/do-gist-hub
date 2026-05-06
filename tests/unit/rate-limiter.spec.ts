import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  trackRateLimit,
  getRateLimitState,
  isSafeToRequest,
  getTimeUntilReset,
  resetRateLimit
} from '../../src/services/github/rate-limiter.ts';

describe('Rate Limiter', () => {
  beforeEach(() => {
    resetRateLimit();
  });

  function createMockResponse(headers: Record<string, string>): Response {
    return {
      headers: {
        get: (name: string) => headers[name.toLowerCase()] || null
      }
    } as unknown as Response;
  }

  test('should initialize with default values', () => {
    const state = getRateLimitState();
    assert.equal(state.limit, 5000);
    assert.equal(state.remaining, 5000);
    assert.equal(state.isLow, false);
    assert.equal(state.isExceeded, false);
  });

  test('should update state from headers', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600; // 1 hour from now

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '4999',
      'x-ratelimit-reset': resetSecs.toString(),
      'x-ratelimit-used': '1'
    });

    trackRateLimit(res);

    const state = getRateLimitState();
    assert.equal(state.limit, 5000);
    assert.equal(state.remaining, 4999);
    assert.equal(state.used, 1);
    assert.equal(state.resetAt, resetSecs * 1000);
    assert.equal(state.isLow, false);
    assert.equal(state.isExceeded, false);
  });

  test('should set isLow when remaining < 100', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '99',
      'x-ratelimit-reset': resetSecs.toString(),
      'x-ratelimit-used': '4901'
    });

    trackRateLimit(res);

    const state = getRateLimitState();
    assert.equal(state.remaining, 99);
    assert.equal(state.isLow, true);
    assert.equal(state.isExceeded, false);
  });

  test('should set isExceeded when remaining <= 0', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': resetSecs.toString(),
      'x-ratelimit-used': '5000'
    });

    trackRateLimit(res);

    const state = getRateLimitState();
    assert.equal(state.remaining, 0);
    assert.equal(state.isLow, true);
    assert.equal(state.isExceeded, true);
  });

  test('should reset state if reset time has passed', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs - 3600; // 1 hour ago

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': resetSecs.toString(),
      'x-ratelimit-used': '5000'
    });

    trackRateLimit(res); // updates state

    // getRateLimitState should notice the time has passed and reset values
    const state = getRateLimitState();
    assert.equal(state.remaining, 5000);
    assert.equal(state.used, 0);
    assert.equal(state.isLow, false);
    assert.equal(state.isExceeded, false);
  });

  test('isSafeToRequest should return false if exceeded', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': resetSecs.toString(),
    });
    trackRateLimit(res);

    assert.equal(isSafeToRequest(), false);
  });

  test('isSafeToRequest should return false if remaining <= 10', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '10',
      'x-ratelimit-reset': resetSecs.toString(),
    });
    trackRateLimit(res);

    assert.equal(isSafeToRequest(), false);
  });

  test('isSafeToRequest should return true if remaining > 10', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600;

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '11',
      'x-ratelimit-reset': resetSecs.toString(),
    });
    trackRateLimit(res);

    assert.equal(isSafeToRequest(), true);
  });

  test('getTimeUntilReset should return 0 if reset passed', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs - 3600; // 1 hour ago

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': resetSecs.toString(),
    });
    trackRateLimit(res);

    assert.equal(getTimeUntilReset(), 0);
  });

  test('getTimeUntilReset should return > 0 if reset is in future', () => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const resetSecs = nowSecs + 3600; // 1 hour from now

    const res = createMockResponse({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': resetSecs.toString(),
    });
    trackRateLimit(res);

    const timeUntilReset = getTimeUntilReset();
    assert.ok(timeUntilReset > 0);
    assert.ok(timeUntilReset <= 3600000);
  });
});
