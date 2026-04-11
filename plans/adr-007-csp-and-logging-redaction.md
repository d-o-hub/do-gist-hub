# ADR-007: CSP and Logging Redaction

**Status**: Accepted  
**Date**: 2026  
**Deciders**: Architect, Security Agent  

## Context

We need to secure the app against:
- XSS attacks
- Token leakage
- Sensitive data exposure in logs

## Decision

1. **CSP**: Strict Content-Security-Policy headers
2. **Logging**: Redact all sensitive data (tokens, auth headers)
3. **Raw Content**: Careful rendering of gist content

### CSP Policy
```
default-src 'self'
script-src 'self'
style-src 'self' 'unsafe-inline'
img-src 'self' data: https:
connect-src 'self' https://api.github.com
```

## Tradeoffs

### Pros
- Reduced XSS risk
- No token leakage in logs
- Safer raw content handling

### Cons
- CSP may block legitimate scripts
- Redaction adds processing overhead
- Raw content rendering requires care

## Consequences

Must test CSP thoroughly before deployment.
Must audit all logging statements for sensitive data.

## Rollback Triggers

If CSP blocks critical functionality or redaction impacts debugging significantly.

---

*Created: 2026. Status: Active.*
