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

## 2026-10-24 - [Auth: Secret Leakage via API Error Messages]
**Vulnerability:** The GitHub API error handler (`error-handler.ts`) was passing raw error messages and technical details (like HTTP status codes or GitHub's internal error descriptions) directly to the application. If a PAT was present in the request context or GitHub's response message, it could be leaked into diagnostic logs or the UI.
**Learning:** External API error messages are untrusted input. Even if the application redacts secrets before logging, the error handler itself must ensure that the `AppError` objects it produces are already scrubbed.
**Prevention:** Implement a mandatory redaction wrapper in the centralized error handler (`handleGitHubError`) to sanitize all user-facing messages and technical details.
