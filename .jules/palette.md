## 2026-06-25 - [Actionable UI & Universal Delegation]
**Learning:** Static empty states are missed opportunities. Combined with hardbound listeners, they create brittle UX. Actionable empty states (Icon/Title/CTA) paired with container-level event delegation (`data-route`/`data-action`) ensure a robust, accessible, and maintenance-free interface for dynamic content.
**Action:** Use `EmptyState` with context-specific CTAs. Implement all navigation/actions via delegation on the root container.

## 2026-06-15 - [Adaptive Layouts with Container Queries]
**Learning:** Container Queries (`@container`) are essential for component portability. They allow `GistCard` to adapt its layout to its actual container width, decoupling component responsiveness from global viewport breakpoints.
**Action:** Use Container Queries for component-internal responsive logic; Media Queries for the app shell only.

## 2026-06-15 - [Responsive Test Stability]
**Learning:** Responsive layouts often have duplicate functional elements (sidebar vs header). Use `.filter({ visible: true })` to avoid clicking hidden elements. Unique `data-testid` and avoiding duplicate HTML IDs in `App.ts` is critical for valid DOM selection.
**Action:** Always filter by visibility for responsive navigation elements and enforce ID uniqueness in components.

## UX/Accessibility Learnings (2026)

- **Actionable Empty States**: Guide users with a primary CTA, title, description, and icon in every empty state (e.g., "Create Gist" button when no gists are found).
- **Adaptive Layouts**: Prefer Container Queries for internal component responsive logic to allow fluid layouts regardless of sidebar visibility.
- **UI Label Normalization**: Use mixed-case/sentence case for UI labels rather than ALL-CAPS to improve readability and ensure compatibility with standard test assertions.
