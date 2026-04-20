<!-- Last Audit: 2024-05-15 -->
# ADR-009: AbortController and Lifecycle Cleanup

**Status**: Accepted  
**Date**: 2026  
**Deciders**: Architect, Memory Safety Agent  

## Context

We need to prevent memory leaks from:
- Uncancelled fetch requests
- Uncleared timers/intervals
- Unremoved event listeners
- Undisconnected observers

## Decision

1. **AbortController**: Required for all fetch requests
2. **Cleanup**: All timers/listeners/observers must be cleaned up
3. **Lifecycle**: Clear route-scoped resources on navigation

### Pattern
```typescript
const controller = new AbortController();
try {
  const response = await fetch(url, { signal: controller.signal });
} finally {
  // Controller aborts automatically on scope exit
  // or call controller.abort() explicitly
}
```

## Tradeoffs

### Pros
- Prevents memory leaks
- Cancelable requests improve UX
- Clear resource ownership

### Cons
- Additional boilerplate
- Must remember cleanup in all paths
- Testing complexity

## Consequences

Code review must check for proper cleanup.
Memory profiling should be part of QA.

## Rollback Triggers

If AbortController causes compatibility issues or cleanup proves unmanageable.

---

*Created: 2026. Status: Active.*
