<!-- Last Audit: 2024-05-15 -->
# ADR-005: No Backend for V1

**Status**: Accepted  
**Date**: 2026  
**Deciders**: Architect, Data/Sync Agent  

## Context

We need to decide on backend architecture for:
- User authentication
- Data synchronization
- Conflict resolution
- Multi-device support

Options considered:
1. No backend (client-side only)
2. Backend sync server
3. BaaS (Firebase, Supabase)
4. Edge database (Turso)

## Decision

**No backend for v1**. All logic runs client-side.

### Architecture
```
┌─────────────┐      ┌──────────────┐
│   Client    │──────│   GitHub     │
│   (PWA)     │ REST │   API        │
└─────────────┘      └──────────────┘
       │
       ▼
┌─────────────┐
│ IndexedDB   │
│ (Local)     │
└─────────────┘
```

### Responsibilities
- Client handles all UI logic
- Client stores data in IndexedDB
- Client syncs directly with GitHub API
- No intermediate server

## Tradeoffs

### Pros
- Simple deployment (static hosting)
- No server maintenance
- Lower cost (no server running)
- Faster development
- Fewer failure points
- Better privacy (data only on device + GitHub)

### Cons
- No multi-device sync beyond GitHub
- Limited conflict resolution
- No offline collaboration
- Client bears full sync complexity
- Rate limits apply per user

## Consequences

### Development
- Focus on client-side code
- No API design for backend
- Simpler testing (no server mocks needed)

### Deployment
- Static hosting only (GitHub Pages, Netlify, Vercel)
- No environment variables for backend
- No server monitoring

### Limitations
- Each device has independent cache
- Conflicts resolved manually by user
- No push notifications
- No server-side search

## Rejected Alternatives

### Backend Sync Server
**Rejected because**:
- Adds significant complexity
- Requires server maintenance
- Increases cost
- Overkill for personal app v1
- Can add in v2 if needed

### BaaS (Firebase, Supabase)
**Rejected because**:
- Vendor lock-in
- Cost at scale
- Unnecessary for single-user focus
- Adds dependency on third party

### Edge Database (Turso)
**Rejected because**:
- Still requires backend logic
- Adds complexity without clear v1 benefit
- Can evaluate for v2 sync server

## Rollback Triggers

Roll back if:
- Users demand multi-device sync beyond GitHub
- Conflict resolution proves unworkable
- Team decides server is necessary for other features
- Rate limiting becomes critical issue

---

*Created: 2026. Status: Active.*
