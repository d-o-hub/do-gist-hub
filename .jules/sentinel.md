## 2025-05-15 - [Logging: Recursive Secret Redaction]
**Vulnerability:** Logging utilities (`safeLog`, `safeError`, `safeWarn`) only redacted secrets in top-level string arguments or Error messages. Sensitive data (GitHub PATs) could still be leaked if passed within nested objects or arrays.
**Learning:** Developers often log complex objects during debugging or for diagnostics. A flat redaction strategy is insufficient. A recursive approach with cycle detection and depth limiting is required to prevent DoS via stack overflow while ensuring security.
**Prevention:** Always use recursive redaction for any logging utility that might handle sensitive data. Implement `redactAny` with `WeakSet` for cycle detection.

## 2025-05-15 - [XSS: Unescaped Language Class]
**Vulnerability:** In `gist-detail.ts`, the `renderFileContent` function was using the `language` property from the Gist API directly in a class name without escaping. A malicious gist with a crafted language name could execute arbitrary JavaScript.
**Learning:** Even data that seems "safe" like a programming language name must be treated as untrusted input if it comes from an external API and is injected into the DOM.
**Prevention:** Always escape any value before using it in HTML attributes or class names, even if it's expected to be a simple string.

## 2026-06-15 - [Encryption at Rest with Web Cryptography API]
**Learning:** Storing sensitive tokens (PATs) in cleartext in IndexedDB is a security risk. AES-GCM encryption using the Web Cryptography API provides a robust way to protect this data on the device without requiring external libraries.
**Action:** Always encrypt Personal Access Tokens before persisting to browser storage. Use a device-bound key where possible.

## 2026-06-20 - [Auth: Bypassing Encryption Layer]
**Vulnerability:** The GitHub API client (`client.ts`) was directly reading the `github-pat` key from IndexedDB, bypassing the encryption/decryption logic and migration path in `auth.ts`.
**Learning:** Decoupling authentication logic from the API client is critical. Direct database access for secrets bypasses security controls like encryption at rest and migration logic for legacy tokens.
**Prevention:** Always use a centralized authentication service (`auth.ts`) to retrieve secrets. Components and other services must never access raw secret storage directly.

## 2026-05-22 - [Quality: Automated Commit Validation Failures]
**Issue:** Automated "Update SKILL.md" commits failed Commitlint CI.
**Learning:** Strict conventional commit enforcement can block automated documentation/state updates. Dual-layered ignores (linter config + CI job condition) provide a secure yet flexible way to handle both human and bot contributions.
**Action:** Implement `ignores` in `commitlint.config.mjs` and actor-based conditions in `.github/workflows/commitlint.yml`.
