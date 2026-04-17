## 2026-05-20 - [Efficient List Rendering]
**Learning:** In a vanilla TypeScript application rendering large lists (like GitHub Gists), using Event Delegation and HTML memoization provides a measurable performance boost. Replacing `document.createElement` with regex-based escaping also reduces overhead during high-frequency renders (e.g., during search).
**Action:** Always prefer event delegation for lists and use a simple map-based cache for repeated HTML generation where data is identifiable by an ID and a timestamp.
## 2026-06-15 - [Lifecycle-Aware Resource Management]
**Learning:** Manual cleanup of AbortControllers and Event Listeners is error-prone. A centralized `LifecycleManager` that scopes resources to a "route" allows for reliable cleanup on navigation, preventing memory leaks and race conditions from zombie fetch requests.
**Action:** Use the `lifecycle.onRouteCleanup` pattern for all long-lived subscriptions and asynchronous operations initiated by specific views.

## 2026-04-17 - [Bulk Store Update Optimization]
**Learning:** In observable stores, performing individual record merges that include sorting in a loop is O(M * N log N). Batching the merges and performing a single sort at the end reduces this to O(M + N log N). Additionally, using `Date.parse()` in sort loops is significantly faster than instantiating `new Date()` objects.
**Action:** Always provide a 'skipSort' or similar flag for bulk operations in stores and prefer numeric timestamp comparisons.
