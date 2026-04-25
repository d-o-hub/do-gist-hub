## Performance Learnings (2026)

- **Efficient Rendering**: Use event delegation and HTML memoization for large lists. Prefer numeric timestamp comparisons (e.g., `Date.parse`) in sort loops over object instantiation.
- **Batch Updates**: Implement batch merge operations in data stores to reduce sorting overhead from O(M * N log N) to O(M + N log N).
- **Lifecycle Management**: Use route-scoped cleanup for long-lived subscriptions and async operations (e.g., `AbortController`) to prevent memory leaks and race conditions.
