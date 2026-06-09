<!-- Last Audit: 2026-05-11 -->
# Global Error Handling

> **Status**: Complete
> **Type**: Plan
> **Created**: 2026-05-11
> **Updated**: 2026-05-11
> **Owner**: agent
> **Related**: adr-006, adr-009

## Error Taxonomy

Implemented structured error classes: Fatal, Recoverable, Auth, Validation.

## Boundaries

- **GlobalErrorBoundary**: Catches uncaught UI errors.
- **RouteBoundary**: Integrated into navigation to clear state and catch routing errors.
- **AsyncErrorBoundary**: Wrapped around GitHub API calls.

## User Messages

Safe, actionable messages via Toast and ErrorBoundary UI. Stack traces redacted.

---

*Created: 2026. Last Audit: 2026-05-11. Status: Verified — ErrorBoundary component, error taxonomy, and toast notifications all implemented.*
