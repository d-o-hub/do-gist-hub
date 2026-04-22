# d.o. Gist Hub (2026 Edition)

A state-of-the-art, web-first GitHub Gist management application. Built with 2026 best practices for security, performance, and responsive design.

## Key 2026 Features

- **Adaptive UI**: Powered by **Container Queries** and a 7-breakpoint responsive system.
- **Fluid Transitions**: Native feel with **View Transitions API** for all routing.
- **Power User Tools**: Integrated **Command Palette (Cmd+K)** for rapid navigation and action.
- **Mobile-First Experience**: Innovative **Bottom Sheet** navigation and gesture-friendly interactions.
- **Hardened Security**:
  - **Encryption at Rest**: Personal Access Tokens are encrypted with AES-GCM (Web Cryptography API).
  - **Strict CSP**: Zero `unsafe-inline`, restricted origins.
  - **Auto-Redaction**: Sensitive data is automatically redacted from logs and UI.
- **Resilient Architecture**:
  - **Lifecycle Management**: Auto-cleanup of subscriptions and cancellation of in-flight requests.
  - **Layered Error Boundaries**: No silent failures; graceful recovery for fatal and non-fatal errors.
  - **Offline-First**: Reliable performance in low-connectivity with IndexedDB and optimistic sync.

## Tech Stack

| Layer | Technology |
|-------|------------|
| App Shell | Vite + TypeScript 5.5+ |
| UI | Vanilla TS + Token-driven CSS |
| Storage | IndexedDB (idb) |
| Security | Web Cryptography API |
| HTTP | Native Fetch + AbortController |
| PWA | Service Worker + Manifest |
| Android | Capacitor 6 |
| Testing | Playwright (Cross-browser + Mobile) |

## Quick Start

```bash
# Install dependencies
ppnpm install

# Start dev server
pnpm dev

# Run quality checks (Lint, Type, Format)
pnpm check

# Build and package
pnpm build
```

## Advanced Usage

- **Command Palette**: Press `Ctrl+K` (or `Cmd+K`) to search and execute commands.
- **Diagnostics**: Export app state for debugging from Settings.
- **Backups**: Full IndexedDB export/import support.

## Documentation

- [AGENTS.md](AGENTS.md) - Engineering principles and Agent workflows
- [Plans](plans/) - Architecture decisions (ADRs) and roadmaps
- [Modern Patterns](agent-docs/2026-patterns.md) - Deep dive into 2026 implementations

## License

MIT
