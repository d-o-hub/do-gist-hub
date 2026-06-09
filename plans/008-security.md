<!-- Last Audit: 2026-05-11 -->
# Security

> **Status**: Complete
> **Type**: Plan
> **Created**: 2026-05-11
> **Updated**: 2026-05-11
> **Owner**: agent
> **Related**: adr-004, adr-007-csp-and-logging-redaction.md

## PAT Handling

Encrypted at rest using Web Cryptography API (AES-GCM). Redacted in logs and UI.

## CSP

Strict Content-Security-Policy implemented in `index.html`. Zero `unsafe-inline`.

## Input Validation

Sanitization of all user-controlled data via `sanitizeHtml` and `html` template tag.

---

*Created: 2026. Last Audit: 2026-05-11. Status: Verified — CSP, AES-GCM encryption, non-extractable runtime keys, export redaction, SHA-pinned CI actions all implemented.*
