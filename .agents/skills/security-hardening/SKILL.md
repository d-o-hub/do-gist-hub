---
name: security-hardening
description: Implement security hardening with CSP, token redaction, input validation, and OWASP best practices.
---

# Security-hardening Skill

Implement comprehensive security hardening following OWASP guidelines.

## When to Use

- Initial app security setup
- Adding CSP headers
- Implementing token management
- Validating user input
- Preventing XSS attacks

## Content Security Policy

See `references/security-examples.md` for full CSP configuration with:
- `default-src 'self'`, `script-src 'self'`
- `connect-src 'self' https://api.github.com`
- No `unsafe-inline` for scripts
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)

## Token Management

See `references/security-examples.md` for:
- TokenManager class with IndexedDB storage
- Token encryption at rest
- Token redaction helper (`redactToken`)

## Input Validation

See `references/security-examples.md` for:
- Gist title validation (max 100 chars)
- Filename validation (alphanumeric, dots, dashes, underscores)
- File size validation (max 500KB per source file rule)

## XSS Prevention

See `references/security-examples.md` for:
- HTML sanitization (escape &, <, >, ", ')
- URL sanitization (allow http/https only)
- Safe external link creation with `rel="noopener noreferrer"`

## Safe Content Rendering

See `references/security-examples.md` for:
- GistContentViewer class using textContent (never innerHTML with user content)
- Safe markdown rendering with sanitization

## Gotchas

- **Never Log PAT**: Redact all authorization data
- **Token in Header**: Use Authorization header, never URL
- **HTTPS Only**: All remote endpoints must use HTTPS
- **Escape User Input**: Never render user content as HTML without sanitization
- **External Links**: Always use `rel="noopener noreferrer"`
- **CSP Strict**: No `unsafe-inline` for scripts
- **Least Privilege**: Request minimum required PAT scopes
- **Encryption at Rest**: Encrypt tokens in IndexedDB

## Required Outputs

- CSP headers configured in `vite.config.ts`
- `src/services/auth/token-manager.ts` - Token management
- `src/lib/validation/gist-validation.ts` - Input validation
- `src/lib/security/sanitize.ts` - XSS prevention
- `src/components/gist/gist-content-viewer.ts` - Safe content rendering
- Documented PAT scope requirements

## Verification

```bash
# Check CSP headers
curl -I http://localhost:5173 | grep Content-Security-Policy

# Run security tests
npm run test

# Lighthouse security audit
npx lighthouse http://localhost:4173 --only-categories=best-practices

# Manual security review
# Check for any console.log of tokens
# Check for innerHTML usage
```

## References

- https://cheatsheetseries.owasp.org/ - OWASP Cheat Sheets
- https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- `AGENTS.md` - Security rules
