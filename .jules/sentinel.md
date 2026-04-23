## Security Learnings (2025-2026)

- **Recursive Redaction**: Always use recursive redaction for logging utilities to ensure Personal Access Tokens (PATs) are not leaked within nested objects or arrays. Implement `redactAny` with cycle detection using `WeakSet`.
- **XSS Prevention**: Never trust external API data (e.g., Gist programming language names). Always escape values before injection into HTML attributes or CSS classes.
- **Encryption at Rest**: Store sensitive tokens encrypted using AES-GCM via the Web Cryptography API. Use device-bound keys persisted in IndexedDB metadata.
