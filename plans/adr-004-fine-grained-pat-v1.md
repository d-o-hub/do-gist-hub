# ADR-004: Fine-Grained PAT for V1 Authentication

**Status**: Accepted  
**Date**: 2026  
**Deciders**: Architect, GitHub API Agent, Security Agent  

## Context

We need authentication for GitHub API access. Options:
1. Fine-grained Personal Access Token (PAT)
2. OAuth Device Flow
3. Classic PAT
4. GitHub App installation

## Decision

Use **fine-grained Personal Access Tokens (PAT)** for v1 authentication.

### Required Scopes
For fine-grained PAT:
- `gists` - Read/write user gists
- No other scopes needed for v1

### User Flow
1. User opens Settings
2. User enters PAT (paste from GitHub)
3. App validates token with test request
4. Token stored in IndexedDB (encrypted if possible)
5. Token redacted in UI after save
6. User can wipe/reset token anytime

## Tradeoffs

### Pros
- Simple implementation
- No backend required
- User controls token scope
- Easy to revoke
- Works in PWA and Android
- No redirect URI configuration

### Cons
- User must manually create token
- Token expires (user must regenerate)
- Less secure than OAuth (token can be copied)
- No refresh token mechanism
- User experience friction

## Consequences

### Security
- Must never log token
- Must redact from diagnostics
- Should provide token wipe flow
- Must use HTTPS for all API calls

### UX
- Need clear instructions for token creation
- Should link to GitHub token settings
- Must show validation feedback
- Should indicate token expiration

### Future
- Can migrate to OAuth device flow in v2
- Token storage strategy may change
- Consider encrypted storage options

## Rejected Alternatives

### OAuth Device Flow
**Rejected because**:
- Requires registered OAuth app
- More complex implementation
- Needs backend for client secret (or public client registration)
- Overkill for personal app v1

### Classic PAT
**Rejected because**:
- Broader scopes than needed
- Less secure than fine-grained
- GitHub recommends fine-grained

### GitHub App
**Rejected because**:
- Requires backend for webhook handling
- More complex setup
- Overkill for single-user app

## Rollback Triggers

Roll back if:
- Users report unacceptable friction
- Security concerns require OAuth
- GitHub deprecates PAT for this use case
- Team decides backend is necessary for other reasons

---

*Created: 2026. Status: Active.*
