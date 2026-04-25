<!-- Last Audit: 2026-04-25 -->
# ADR-014: Exponential Backoff for Sync Queue

**Status**: Proposed
**Date**: 2026-04-25
**Deciders**: Architect, Offline-First Agent

## Context

The sync queue (`src/services/sync/queue.ts`) uses a fixed 1-second delay (`RETRY_DELAY_MS = 1000`) between retry attempts. This is suboptimal for:
- Rate limit recovery (needs longer waits)
- Network flakiness (should back off progressively)
- Battery life on mobile (avoids aggressive polling)

## Decision

Replace fixed retry delay with exponential backoff with jitter.

### Formula

```typescript
function calculateDelay(attempt: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const exponential = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // 0-1s jitter
  return Math.min(exponential + jitter, maxDelay);
}
```

### Retry Schedule

| Attempt | Base Delay | With Jitter | Max Cumulative |
|---------|-----------|-------------|----------------|
| 1 | 2s | 2-3s | ~3s |
| 2 | 4s | 4-5s | ~8s |
| 3 | 8s | 8-9s | ~17s |
| 4+ | 16s | 16-17s | Capped at 30s |

### Implementation

Update `SyncQueue` class:
```typescript
private static calculateBackoff(attempt: number): number {
  const base = RETRY_BACKOFF_MS;
  const max = 30000;
  const exp = base * Math.pow(2, attempt);
  const jitter = Math.random() * base;
  return Math.min(exp + jitter, max);
}

// In processQueue, replace fixed delay:
await SyncQueue.delay(SyncQueue.calculateBackoff(write.retryCount));
```

### Rate Limit Integration

If a rate limit response includes `Retry-After` header, use that value instead of calculated backoff:
```typescript
if (error.status === 429 && error.retryAfter) {
  return error.retryAfter * 1000; // Respect server directive
}
```

## Tradeoffs

### Pros
- Respects GitHub rate limits
- Reduces server load during outages
- Better mobile battery life
- Industry-standard pattern

### Cons
- Slightly longer worst-case sync delay
- Jitter makes timing non-deterministic (harder to test)
- Need to store `lastAttemptAt` more precisely

## Consequences

### User Experience
- Offline operations may take longer to sync initially
- But overall success rate improves
- Rate limit errors become rare

### Testing
- Unit tests should mock `Math.random()` for deterministic jitter
- Integration tests need to verify backoff timing (or use fake timers)

## Rejected Alternatives

### Linear backoff (1s, 2s, 3s, ...)
**Rejected**: Doesn't back off fast enough for rate limits or extended outages.

### Fixed intervals with rate limit header only
**Current approach — Rejected**: Doesn't handle general network flakiness well.

## Rollback Triggers

- Sync operations feel too slow to users
- Exponential growth causes excessive delays
- Testing complexity becomes burdensome

## References

- `src/services/sync/queue.ts` — current sync queue
- `src/services/github/rate-limiter.ts` — rate limit tracking
- `src/services/github/error-handler.ts` — error categorization

---

*Created: 2026-04-25. Status: Proposed.*
