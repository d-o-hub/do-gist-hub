/**
 * GitHub API Rate Limit Tracking
 * Monitors X-RateLimit-* headers from GitHub API responses.
 * Authenticated users get 5000 requests/hour.
 */

export interface RateLimitState {
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp (ms)
  used: number;
  /** Whether we're approaching the rate limit (< 100 remaining) */
  isLow: boolean;
  /** Whether we've hit the rate limit */
  isExceeded: boolean;
  /** Server-directed retry delay from Retry-After header (ms) */
  retryAfterMs: number;
  /** Last updated timestamp */
  updatedAt: number;
}

let rateLimit: RateLimitState = {
  limit: 5000,
  remaining: 5000,
  resetAt: 0,
  used: 0,
  isLow: false,
  isExceeded: false,
  retryAfterMs: 0,
  updatedAt: 0,
};

/**
 * Update rate limit state from response headers.
 * Call this after every API response.
 */
export function trackRateLimit(response: Response): void {
  const limit = response.headers.get('x-ratelimit-limit');
  const remaining = response.headers.get('x-ratelimit-remaining');
  const reset = response.headers.get('x-ratelimit-reset');
  const used = response.headers.get('x-ratelimit-used');
  const retryAfter = response.headers.get('retry-after');

  rateLimit.retryAfterMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : 0;

  if (remaining && reset) {
    rateLimit.remaining = Number.parseInt(remaining, 10);
    rateLimit.resetAt = Number.parseInt(reset, 10) * 1000; // Convert to ms
    rateLimit.isLow = rateLimit.remaining < 100;
    rateLimit.isExceeded = rateLimit.remaining <= 0;
    rateLimit.updatedAt = Date.now();

    if (limit) {
      rateLimit.limit = Number.parseInt(limit, 10);
    }
    if (used) {
      rateLimit.used = Number.parseInt(used, 10);
    }
  }
}

/**
 * Get current rate limit state.
 */
export function getRateLimitState(): RateLimitState {
  // Check if we've passed the reset time
  if (rateLimit.resetAt > 0 && Date.now() > rateLimit.resetAt) {
    rateLimit.remaining = rateLimit.limit;
    rateLimit.used = 0;
    rateLimit.isLow = false;
    rateLimit.isExceeded = false;
  }

  return { ...rateLimit };
}

/**
 * Check if it's safe to make a request.
 * Returns false if rate limit is exceeded or very low.
 */
export function isSafeToRequest(): boolean {
  const state = getRateLimitState();
  return !state.isExceeded && state.remaining > 10;
}

/**
 * Get time until rate limit resets (in ms).
 * Returns 0 if not tracking or already reset.
 */
export function getTimeUntilReset(): number {
  if (rateLimit.resetAt <= 0) return 0;
  const remaining = rateLimit.resetAt - Date.now();
  return Math.max(0, remaining);
}

/**
 * Get server-directed retry delay from Retry-After header (ms).
 * Returns 0 if no Retry-After was set.
 */
export function getRetryAfterMs(): number {
  return rateLimit.retryAfterMs;
}

/**
 * Reset rate limit state (e.g., on logout).
 */
export function resetRateLimit(): void {
  rateLimit = {
    limit: 5000,
    remaining: 5000,
    resetAt: 0,
    used: 0,
    isLow: false,
    isExceeded: false,
    retryAfterMs: 0,
    updatedAt: 0,
  };
}
