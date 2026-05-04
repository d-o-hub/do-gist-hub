## Performance Learnings (2026)

- **Efficient Rendering**: Use event delegation and HTML memoization for large lists. Prefer numeric timestamp comparisons (e.g., `Date.parse`) in sort loops over object instantiation.
- **Batch Updates**: Implement batch merge operations in data stores to reduce sorting overhead from O(M * N log N) to O(M + N log N).
- **Bundle Optimization**: Use dynamic `import()` for route-level code splitting. This ensures the initial payload remains lean even as view complexity grows.
- **CSS Purging**: Integrate `PurgeCSS` to automatically remove unused design tokens and styles from the production build, keeping the total CSS payload under 10KB.
- **CI Budgets**: Enforce bundle size limits in CI using a custom check script that validates actual gzipped sizes, preventing silent bloat over time.
- **Lifecycle Management**: Use route-scoped cleanup for long-lived subscriptions and async operations (e.g., `AbortController`) to prevent memory leaks and race conditions.
