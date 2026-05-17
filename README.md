# d.o. Gist Hub

[![Version](https://img.shields.io/badge/version-0.2.0-rc.1-blue.svg)](./VERSION)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

> A state-of-the-art, offline-first GitHub Gist management PWA with token-driven responsive UI, PAT authentication, and Capacitor Android packaging.

**Quick Links**: [Quick Start](#quick-start) · [Documentation](#documentation) · [Contributing](./CONTRIBUTING.md) · [Security](./SECURITY.md)

---

## What Is This?

**d.o. Gist Hub** is a production-ready Progressive Web App for managing GitHub Gists — built for developers who need their snippets available offline, on mobile, and across devices. It combines a strict token-driven design system with resilient offline-first architecture.

**Key Features**:

- ✓ **Token-Driven Design**: DTCG-aligned design tokens with 7 breakpoints (320px–1536px+).
- ✓ **Mobile-First**: Bottom sheet navigation, `100dvh` dynamic viewport, safe area support.
- ✓ **Command Palette**: Press `Ctrl+K` (or `Cmd+K`) for rapid navigation and actions.
- ✓ **Actionable Empty States**: Guided CTAs instead of dead ends — every empty state offers a next step.
- ✓ **Hardened Security**:
  - **AES-GCM Encryption**: Personal Access Tokens encrypted at rest (Web Cryptography API).
  - **Strict CSP**: No `unsafe-inline`, restricted origins.
  - **Auto-Redaction**: Sensitive data automatically redacted from logs and UI.
- ✓ **Resilient Architecture**:
  - **AbortController Lifecycle**: Auto-cleanup of subscriptions and cancellation of in-flight requests.
  - **Layered Error Boundaries**: No silent failures; graceful recovery.
  - **Offline-First**: IndexedDB source of truth, optimistic writes, sync queue with exponential backoff.
- ✓ **GitHub API Efficiency**:
  - **ETags**: Conditional GETs using IndexedDB-cached ETags to skip 304 payloads.
  - **Lazy Hydration**: Fetches metadata first, loads full gist content only on demand.
  - **Rate Limit Awareness**: Pauses background sync when API limits are critically low.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| App Shell | Vite 8 + TypeScript 6.x (strict mode) |
| UI | Vanilla TS + DTCG-aligned CSS tokens |
| Storage | IndexedDB via `idb` library |
| Security | Web Cryptography API (AES-GCM) |
| HTTP | Native Fetch + AbortController |
| PWA | Service Worker + Manifest |
| Android | Capacitor 8 |
| Testing | Playwright + Vitest (cross-browser, mobile emulation, offline) |

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ (with npm)
- [Git](https://git-scm.com/) 2.30+
- (Optional) [pnpm](https://pnpm.io/) for faster installs

### Installation

```bash
# Clone the repository
git clone https://github.com/d-o-hub/do-gist-hub.git
cd do-gist-hub

# Install dependencies
pnpm install

# Set up AI agent skills
./scripts/setup-skills.sh

# Start development server
pnpm run dev        # or: pnpm dev
```

### Verify

```bash
# Run all quality checks (typecheck + lint + format)
pnpm run check      # or: pnpm check

# Run the full quality gate
./scripts/quality_gate.sh
```

### Build & Package

```bash
# Production build
pnpm run build

# Package for Android
pnpm run build:android
```

---

## Usage Examples

### Basic: Create a Gist

1. Open the app and enter your GitHub PAT in Settings.
2. Tap **New Gist** (or press `Ctrl+K` → "Create Gist").
3. Add files, set description, choose public/secret.
4. Save — works offline, syncs when online.

### Advanced: Command Palette

Press `Ctrl+K` (or `Cmd+K`) to open the command palette. Type to filter:

- `create` — New gist
- `starred` — View starred gists
- `settings` — Open settings
- `export` — Backup all gists to JSON
- `import` — Restore from JSON backup

### Quality Gate (Automatic)

```bash
# Pre-commit hook runs automatically if installed
git commit -m "feat: add gist filtering"

# Or run manually
./scripts/quality_gate.sh
```

### Optional: Rehearse GitHub Actions Locally

Catch CI errors before pushing by running workflows locally with [`nektos/act`](https://github.com/nektos/act) and **Docker**:

```bash
# Run the default CI workflow locally
./scripts/run_act_local.sh

# Run only one job (for faster feedback)
ACT_JOB=quality-gate ./scripts/run_act_local.sh
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [AGENTS.md](./AGENTS.md) | Engineering principles, coding standards, and agent workflows |
| [QUICKSTART.md](./QUICKSTART.md) | 5-minute setup guide |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Development setup, code style, PR process |
| [SECURITY.md](./SECURITY.md) | Security policy and vulnerability reporting |
| [CHANGELOG.md](./CHANGELOG.md) | Version history and release notes |
| [Plans](./plans/) | Architecture decisions (ADRs) and roadmaps |
| [docs/2026-ui-ux-modernization.md](./docs/2026-ui-ux-modernization.md) | Deep dive into 2026 UI/UX implementations |

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Development environment setup
- Good first issues
- Code style and testing requirements
- Pull request process

---

## Community

- [Issue Tracker](https://github.com/d-o-hub/do-gist-hub/issues) — Report bugs
- [Discussions](https://github.com/d-o-hub/do-gist-hub/discussions) — Ask questions

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

**Built with AI agents. Maintained by humans.**
