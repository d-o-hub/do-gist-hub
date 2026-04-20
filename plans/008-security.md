<!-- Last Audit: 2024-05-15 -->
# Security

## PAT Handling

Encrypted at rest using Web Cryptography API (AES-GCM). Redacted in logs and UI.

## CSP

Strict Content-Security-Policy implemented in `index.html`. Zero `unsafe-inline`.

## Input Validation

Sanitization of all user-controlled data via `sanitizeHtml` and `html` template tag.

---

*Created: 2026. Status: Completed (Audited and Verified) (Missing Playwright coverage).*
