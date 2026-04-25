<!-- Last Audit: 2026-04-25 -->
# ADR-013: Request Deduplication Strategy

**Status**: Proposed
**Date**: 2026-04-25
**Deciders**: Architect, Performance Agent

## Context

The GitHub API client (`src/services/github/client.ts`) uses a global `AbortController` but does not deduplicate concurrent requests. Rapid user actions (e.g., double-clicking star, rapid filter changes) can spawn multiple identical in-flight requests.

## Decision

Implement request deduplication in the GitHub API client using an in-flight promise cache.

### Approach

```typescript
// In github/client.ts
const inFlightRequests = new Map<string, Promise<unknown>>();

async function deduplicatedFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}
```

### Key Design

- **Cache key**: `METHOD:URL` (e.g., `GET:https://api.github.com/gists/abc`)
- **Scope**: Per-request, cleared on completion/error
- **Abort handling**: If one caller aborts, all deduplicated callers receive `AbortError`
- **Memory safety**: Map automatically cleaned via `.finally()`

### Integration

Wrap existing fetch calls:
```typescript
export async function getGist(id: string): Promise<GitHubGist> {
  return deduplicatedFetch(`GET:gist:${id}`, async () => {
    const response = await fetch(`${BASE_URL}/gists/${id}`, await buildOptions());
    // ... existing logic
  });
}
```

## Tradeoffs

### Pros
- Reduces redundant API calls
- Saves rate limit budget
- Faster perceived performance (shared promise)
- Prevents race conditions in UI updates

### Cons
- Slightly more complex client code
- Shared `AbortError` may surprise callers
- Cache key design must be careful with query params

## Consequences

### Rate Limiting
- Fewer `checkIfStarred` calls when multiple components render simultaneously
- List gists deduplicated across rapid navigations

### Memory
- Bounded by concurrent request count (typically < 10)
- Automatically cleaned, no leak risk

## Rejected Alternatives

### Memoize with TTL
Cache responses for a time period — **Rejected** because it could serve stale data; deduplication only deduplicates in-flight, not completed requests.

### React Query / SWR
Use a data-fetching library — **Rejected** because it adds significant bundle size and complexity for our use case.

## Rollback Triggers

- Shared AbortError causes unexpected behavior
- Cache key collisions from query parameters
- Performance gain not measurable

## References

- `src/services/github/client.ts` — current client implementation
- `src/services/github/rate-limiter.ts` — rate limit tracking

---

*Created: 2026-04-25. Status: Proposed.*
