# d.o. Gist Hub v0.1.0

A state-of-the-art, offline-first GitHub Gist management PWA with token-driven responsive UI, PAT authentication, and Capacitor Android packaging.

## Key Features

- **Token-Driven Design**: DTCG-aligned design tokens with 7 breakpoints (320px–1536px+).
- **Mobile-First**: Bottom sheet navigation, `100dvh` dynamic viewport, safe area support.
- **Command Palette**: Press `Ctrl+K` (or `Cmd+K`) for rapid navigation and actions.
- **Actionable Empty States**: Guided CTAs instead of dead ends — every empty state offers a next step.
- **Hardened Security**:
  - **AES-GCM Encryption**: Personal Access Tokens encrypted at rest (Web Cryptography API).
  - **Strict CSP**: No `unsafe-inline`, restricted origins.
  - **Auto-Redaction**: Sensitive data automatically redacted from logs and UI.
- **Resilient Architecture**:
  - **AbortController Lifecycle**: Auto-cleanup of subscriptions and cancellation of in-flight requests.
  - **Layered Error Boundaries**: No silent failures; graceful recovery.
  - **Offline-First**: IndexedDB source of truth, optimistic writes, sync queue with exponential backoff.

## Tech Stack

| Layer | Technology |
|-------|------------|
| App Shell | Vite + TypeScript 5.5+ (strict mode) |
| UI | Vanilla TS + DTCG-aligned CSS tokens |
| Storage | IndexedDB via `idb` library |
| Security | Web Cryptography API (AES-GCM) |
| HTTP | Native Fetch + AbortController |
| PWA | Service Worker + Manifest |
| Android | Capacitor 6 |
| Testing | Playwright (cross-browser, mobile emulation, offline) |

## Quick Start

```bash
# Install dependencies
pnpm install

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
