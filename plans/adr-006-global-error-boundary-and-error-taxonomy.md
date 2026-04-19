<!-- Last Audit: 2024-05-15 -->
# ADR-006: Global Error Boundary and Error Taxonomy

**Status**: Accepted  
**Date**: 2026  
**Deciders**: Architect, Reliability Agent  

## Context

We need a comprehensive error handling strategy that:
- Catches all errors (no silent failures)
- Provides user-safe messages
- Offers recovery actions where possible
- Redacts sensitive data from logs

## Decision

Implement a layered error boundary system with structured error taxonomy.

### Error Classes
- Fatal (app cannot continue)
- Recoverable (user can retry)
- Auth (token/permission issues)
- Validation (client-side validation)

### Boundaries
1. GlobalErrorBoundary - catches fatal render errors
2. RouteBoundary - per-route error handling
3. AsyncErrorBoundary - handles promise rejections

## Tradeoffs

### Pros
- No silent failures
- Clear user messaging
- Structured logging
- Recovery paths defined

### Cons
- Additional code complexity
- Must maintain error message catalog
- Testing overhead for error states

## Consequences

All async operations must return structured errors.
All UI must handle loading, success, and error states.

## Rollback Triggers

If error handling proves too complex or impacts performance significantly.

---

*Created: 2026. Status: Active.*
