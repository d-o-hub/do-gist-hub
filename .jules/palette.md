## 2026-06-15 - [Actionable Empty States]
**Learning:** Empty states are not just "no data" messages; they are opportunities to guide the user. Providing a primary CTA (e.g., "Create Gist") directly in the empty state significantly improves task completion rates compared to a static message.
**Action:** Every empty state must include a Title, Description, Icon, and a clear primary Action button.

## 2026-06-15 - [Adaptive Layouts with Container Queries]
**Learning:** Container Queries (`@container`) are superior to Media Queries for component-based architecture. They allow components like `GistCard` to adjust their internal layout (e.g., stacking header elements) based on their actual width on the screen, which is essential when the sidebar can be toggled or when using multi-column layouts.
**Action:** Prefer Container Queries for internal component responsive logic; use Media Queries only for the global app shell.

## 2026-06-20 - [Universal Navigation via Delegation]
**Learning:** Hardbinding navigation listeners to every dynamic element is prone to memory leaks and maintenance overhead. Implementing a single 'data-route' listener on the app container (with a guard to prevent multiple registrations) ensures all dynamic content, including empty states and list items, is interactive without extra code.
**Action:** Use 'data-route' and 'data-action' attributes combined with container-level event delegation for all navigation-heavy components.
