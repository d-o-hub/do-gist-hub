## Performance Learnings (2026)

- **Efficient Rendering**: Use event delegation and HTML memoization for large lists. Prefer numeric timestamp comparisons (e.g., `Date.parse`) in sort loops over object instantiation.
- **Batch Updates**: Implement batch merge operations in data stores to reduce sorting overhead from O(M * N log N) to O(M + N log N).
- **Lifecycle Management**: Use route-scoped cleanup for long-lived subscriptions and async operations (e.g., `AbortController`) to prevent memory leaks and race conditions.

## 2026-05-07 - Persistent Timestamp Caching
**Learning:** Local Map-based caches within render functions (e.g., for Date.parse) are ineffective across renders. Moving the cache to module or static scope significantly improves sorting performance for large lists by avoiding redundant O(N log N) parsing.
**Action:** Always prefer module-level or static class-level persistent caches for expensive data transformations used in sort loops. Use the source string itself as the key to ensure cache validity.

## 2026-05-08 - Schwartzian Transform & Cache Coherency
**Learning:** Even with timestamp caching, $O(N \log N)$ sorting still performs $N \log N$ Map lookups. Implementing a Schwartzian Transform reduces this to exactly $N$ lookups. Also, UI component caches (like gist cards) must include ALL mutable state (e.g., `starred`) in the cache key, as local optimistic updates might change state without updating the `updatedAt` timestamp.
**Action:** Use Schwartzian Transform for all critical-path sort operations. Ensure UI cache keys represent the full visual state, not just server timestamps.
