# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-28

### Added

- Initial release of d.o. Gist Hub
- PAT authentication with AES-GCM encryption at rest
- Offline-first gist CRUD with IndexedDB source of truth
- Optimistic writes with pending sync queue and exponential backoff
- Conflict detection with local-wins / remote-wins / manual strategies
- Full GitHub Gist REST API client with pagination and rate limiting
- DTCG-aligned design token system with 7 breakpoints
- Mobile-first responsive UI with bottom nav, rail, and sidebar modes
- Command palette (`Ctrl+K`) for rapid navigation
- PWA with service worker caching and offline fallback page
- Capacitor 6 Android packaging
- Export/import for full IndexedDB backup/restore
- Structured error taxonomy with recovery actions
- Memory leak prevention via AbortController and lifecycle cleanup
- Performance budgets with runtime monitoring and build-time enforcement
- Accessibility: skip links, ARIA landmarks, reduced motion, high contrast

[0.1.0]: https://github.com/d-o-hub/do-gist-hub/releases/tag/v0.1.0
