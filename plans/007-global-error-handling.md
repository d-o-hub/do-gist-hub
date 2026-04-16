# Global Error Handling

## Error Taxonomy

Implemented structured error classes: Fatal, Recoverable, Auth, Validation.

## Boundaries

- **GlobalErrorBoundary**: Catches uncaught UI errors.
- **RouteBoundary**: Integrated into navigation to clear state and catch routing errors.
- **AsyncErrorBoundary**: Wrapped around GitHub API calls.

## User Messages

Safe, actionable messages via Toast and ErrorBoundary UI. Stack traces redacted.

---

*Created: 2026. Status: Completed.*
