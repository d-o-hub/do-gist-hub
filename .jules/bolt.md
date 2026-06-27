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

## 2026-05-09 - Cross-Component Cache Consolidation
**Learning:** Duplicate caches for the same data (e.g., ISO date timestamps) across different modules (store, route, component) waste memory and redundant 'first-miss' parsing. Consolidating into a single utility utility utility utility with a shared cache ensures maximum efficiency app-wide.
**Action:** Identify shared data transformation patterns and centralize them in a utility with a shared cache to eliminate redundant processing across different layers of the application.

## 2026-05-10 - Redundant Module Resolution in Event Handlers
**Learning:** Using dynamic `await import()` within frequently-triggered event handlers (e.g., Star button, file tab switching) adds microtask overhead and redundant module resolution logic. In mobile-first apps, these micro-delays aggregate to noticeable interaction latency.
**Action:** Use static imports for core dependencies (like stores) within component files. Reserve dynamic imports only for heavy, infrequently-used routes or truly optional feature modules to ensure interaction delight remains instantaneous.

## 2026-05-11 - Consolidating Redundant O(N) Passes in Rendering
**Learning:** Dividing list processing into separate functions for "counting" and "rendering" leads to redundant O(N) iterations and extra array allocations. Consolidating filtering, searching, and sorting into a single update function improves both performance and state consistency.
**Action:** Avoid separate passes for UI metadata (like result counts) and the actual item list. Process the collection once and use the derived results for all UI elements.

## 2026-05-12 - Consolidating Hot-Path Iterations
**Learning:** Chaining functional array methods (filter/map/sort) in UI render loops causes multiple O(N) passes and redundant array allocations. Consolidating these into a single manual 'for' loop and skipping sorting entirely when the default order is already present significantly reduces CPU and memory pressure on the main thread.
**Action:** Identify hot-path render functions with multiple filter/sort passes. Consolidate into a single unified iteration. Ensure unit tests mock raw data rather than processing methods to allow for such refactors without breaking test suites.
