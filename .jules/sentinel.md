## 2025-05-15 - [Logging: Recursive Secret Redaction]
**Vulnerability:** Logging utilities (`safeLog`, `safeError`, `safeWarn`) only redacted secrets in top-level string arguments or Error messages. Sensitive data (GitHub PATs) could still be leaked if passed within nested objects or arrays.
**Learning:** Developers often log complex objects during debugging or for diagnostics. A flat redaction strategy is insufficient. A recursive approach with cycle detection and depth limiting is required to prevent DoS via stack overflow while ensuring security.
**Prevention:** Always use recursive redaction for any logging utility that might handle sensitive data. Implement `redactAny` with `WeakSet` for cycle detection.

## 2025-05-15 - [XSS: Unescaped Language Class]
**Vulnerability:** In `gist-detail.ts`, the `renderFileContent` function was using the `language` property from the Gist API directly in a class name without escaping. A malicious gist with a crafted language name could execute arbitrary JavaScript.
**Learning:** Even data that seems "safe" like a programming language name must be treated as untrusted input if it comes from an external API and is injected into the DOM.
**Prevention:** Always escape any value before using it in HTML attributes or class names, even if it's expected to be a simple string.
