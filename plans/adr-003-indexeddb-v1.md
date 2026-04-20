<!-- Last Audit: 2024-05-15 -->
# ADR-003: IndexedDB for V1 Local Storage

**Status**: Accepted  
**Date**: 2026  
**Deciders**: Architect, Data/Sync Agent  

## Context

We need offline-first local storage for:
- Caching gists and files
- Storing user settings
- Queuing pending operations
- Tracking sync state

Options considered:
1. IndexedDB
2. localStorage
3. SQLite via WASM
4. RxDB / PouchDB

## Decision

Use **IndexedDB** as the v1 local storage solution.

### Rationale
- Large storage capacity (vs localStorage 5MB limit)
- Native browser support (no WASM bundle)
- Transaction support
- Index-based queries
- Suitable for structured JSON data

### Schema Design
```typescript
// stores
const stores = {
  gists: 'id, updated_at, starred, owner',
  gistFiles: 'gist_id, filename',
  favorites: 'gist_id, created_at',
  drafts: 'id, created_at, updated_at',
  settings: 'key',
  syncState: 'entity_type, entity_id',
  pendingOperations: 'created_at, status',
  cachedRevisions: 'gist_id, version',
  searchCache: 'query, timestamp',
};
```

## Tradeoffs

### Pros
- No additional dependencies
- Large storage limits
- Good performance for structured data
- Works offline by design
- Well-documented API

### Cons
- Verbose callback-based API (wrap in promises)
- Browser implementation differences
- More complex than localStorage
- Requires migration strategy

## Consequences

### Implementation
- Need wrapper library or custom promise wrapper
- Must handle version migrations
- Need backup/recovery strategy
- Should implement cleanup for old data

### Testing
- Test on multiple browsers
- Verify storage limits
- Test migration paths
- Validate error handling

## Rejected Alternatives

### localStorage
**Rejected because**: 
- 5MB limit too small for gist caching
- Synchronous API blocks main thread
- String-only storage

### SQLite via WASM
**Rejected because**:
- Large bundle size (~500KB+)
- Unnecessary complexity for our use case
- Slower cold start

### RxDB / PouchDB
**Rejected because**:
- Overkill for single-user offline cache
- Bundle size impact
- Added complexity without clear benefit
- Can adopt later if sync complexity increases

## Rollback Triggers

Roll back if:
- IndexedDB support unreliable on target devices
- Performance unacceptable for large gist lists
- Team cannot manage schema migrations
- Storage quota issues on Android WebView

---

*Created: 2026. Status: Active.*
