## 2026-06-25 - [Actionable UI & Universal Delegation]
**Learning:** Static empty states are missed opportunities. Combined with hardbound listeners, they create brittle UX. Actionable empty states (Icon/Title/CTA) paired with container-level event delegation (`data-route`/`data-action`) ensure a robust, accessible, and maintenance-free interface for dynamic content.
**Action:** Use `EmptyState` with context-specific CTAs. Implement all navigation/actions via delegation on the root container.

## 2026-06-15 - [Adaptive Layouts with Container Queries]
**Learning:** Container Queries (`@container`) are essential for component portability. They allow `GistCard` to adapt its layout to its actual container width, decoupling component responsiveness from global viewport breakpoints.
**Action:** Use Container Queries for component-internal responsive logic; Media Queries for the app shell only.
