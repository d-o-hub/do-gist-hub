# d.o. Gist Hub

A production-ready, web-first GitHub Gist management app with offline-first behavior, token-driven design, and Android packaging via Capacitor.

## Features

- **Full Gist CRUD**: Create, read, update, delete gists
- **Offline-First**: Read cached gists offline, queue writes for sync
- **Token-Driven Design**: Production-grade semantic token architecture
- **Responsive**: Mobile-first UI from 320px to 1536px+
- **Android Ready**: Packaged via Capacitor for Android devices
- **Secure**: PAT redaction, CSP headers, safe logging
- **Performant**: Web Vitals measurement, bundle budgets, code splitting

## Tech Stack

| Layer | Technology |
|-------|------------|
| App Shell | Vite + TypeScript |
| UI | Vanilla TS + Token-driven CSS |
| Storage | IndexedDB |
| Auth | Fine-grained GitHub PAT |
| HTTP | Native Fetch + AbortController |
| PWA | Service Worker + Manifest |
| Android | Capacitor |
| Testing | Playwright |

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Test
npm run test
```

## Documentation

- [AGENTS.md](AGENTS.md) - Agent instructions and conventions
- [Plans](plans/) - Architecture plans and ADRs
- [Skills](.agents/skills/) - Reusable agent skills

## License

MIT
