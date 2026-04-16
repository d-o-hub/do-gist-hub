## 2026-05-20 - [Efficient List Rendering]
**Learning:** In a vanilla TypeScript application rendering large lists (like GitHub Gists), using Event Delegation and HTML memoization provides a measurable performance boost. Replacing `document.createElement` with regex-based escaping also reduces overhead during high-frequency renders (e.g., during search).
**Action:** Always prefer event delegation for lists and use a simple map-based cache for repeated HTML generation where data is identifiable by an ID and a timestamp.
