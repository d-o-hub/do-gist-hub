# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in d.o. Gist Hub, please report it responsibly.

**Please do NOT open a public issue** for security-related reports.

Instead, contact the maintainers directly:

- Open a [private security advisory](https://github.com/d-o-hub/do-gist-hub/security/advisories/new) on GitHub
- Or email: security@d-o-hub.dev (if available)

We aim to respond within **48 hours** and will work with you to assess the impact and coordinate a fix.

## Security Measures

### Personal Access Token (PAT) Handling

- PATs are **encrypted at rest** using AES-GCM via the Web Cryptography API.
- The encryption key is stored in IndexedDB and is **non-extractable** (`extractable: false`).
- PATs are **never logged** — all logs use automatic redaction (`[REDACTED]`).
- PATs are **never displayed in the UI** after initial entry.
- Bearer auth is used exclusively for GitHub API requests (`Authorization: Bearer <token>`).

### Content Security Policy (CSP)

The app enforces a strict CSP:

- `default-src 'self'`
- `connect-src 'self' https://api.github.com`
- `frame-ancestors 'none'`
- `object-src 'none'`
- No `unsafe-inline` or `unsafe-eval`

### Supply Chain Security

- All GitHub Actions workflows use **SHA-pinned action versions** (not floating tags).
- Dependencies are automatically scanned by Dependabot.
- Pre-commit hooks include secret scanning (gitleaks) and private key detection.

### Android

- Capacitor WebView uses `androidScheme: 'https'` with cleartext disabled.
- Planned: Migration to Android Keystore for key storage (v1.1+).

## Disclosure Policy

1. Reporter submits vulnerability via private advisory.
2. Maintainers acknowledge within 48 hours.
3. Investigation and fix development.
4. Coordinated disclosure after fix is released.

## Acknowledgments

We thank all security researchers who responsibly disclose vulnerabilities.
