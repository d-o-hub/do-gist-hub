# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0]

### Added

- CSP violation reporting endpoint (plan 038 F2)
- Stryker mutation testing configuration (plan 038 D6)
- Dependency review CI workflow (plan 038 B6)
- ProGuard CI smoke check workflow (plan 038 F6)
- Conflict-resolution UI E2E walkthrough tests (plan 038 F1)
- Release Please automated release workflow (plan 038 E3)
- Postinstall hook for automatic commit-msg installation (plan 038 E2)
- Self-hosted variable fonts (Inter Variable, JetBrains Mono Variable) per ADR-022
- Scroll-driven animations with CSS `animation-timeline: view()`
- Copy-to-clipboard feature in gist detail view
- Build-time service worker generation from TypeScript template (ADR-010)
- Navigation rail component for tablet breakpoint (ADR-017)
- Bulk operations support and selection store
- CodeRabbit AI code review configuration
- ETag-based conditional GETs for GitHub API efficiency (ADR-016)
- Lazy gist hydration (metadata-first, content on demand)
- Rate limit awareness (pauses background sync when limits critically low)
- Pre-write conflict detection with `expectedRemoteVersion` in sync queue
- Background Sync API integration in service worker
- Export data security: sensitive metadata redaction
- Visual regression testing project
- Bundle analysis CI job with artifact upload
- Reactive auth-store and ui-store singletons
- Capacitor 8 upgrade with Android SDK 35 targeting
- Gradle 8.5 wrapper for Java 21 bytecode compatibility

### Changed

- **BREAKING**: Migrated from npm to pnpm exclusively
- **BREAKING**: Replaced ESLint + Prettier with Biome for linting and formatting
- Upgraded TypeScript to 6.x (strict mode, `ignoreDeprecations: "6.0"`)
- Upgraded Vite to 8.x
- Upgraded Vitest to 4.x
- Upgraded Playwright to 1.49+
- Upgraded Capacitor from 6 to 8
- Dark mode first: default theme is now dark per ADR-022
- Removed emojis from buttons, implemented token-driven button styles
- Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- Crypto key: re-imported as non-extractable for runtime to prevent XSS exfiltration
- Token redaction: unconditional `[REDACTED]` in logs
- Service worker: GitHub API requests never cached, offline.html serves first
- All GitHub Actions SHA-pinned and migrated to node24-native

### Fixed

- Android: excluded kotlin-stdlib-jdk7/jdk8 to resolve duplicate class conflicts
- Android: bumped compileSdk and targetSdk to 35 for Capacitor 8 compatibility
- CI: resolved TypeScript 6 deprecation warnings
- CI: fixed yamllint, commitlint, and shellcheck failures
- CI: bumped Android build JDK from 17 to 21
- Playwright: fixed navigation test failures with proper IndexedDB initialization
- Playwright: fixed visual regression timeouts and brittle tests
- Auth service: corrected unit test mocks and cache clearing
- CD workflow: graceful skip when GitHub Pages not enabled

### Documentation

- Added ADR-021 merge strategy
- Added ADR-022 2026 UI trends recommendations
- Added ADR-026 Phase A modernization GoAP
- Updated ADR-015 with full Android build remediation chain
- Added progress updates and missing v1 task tracking
- Aligned AGENTS.md skills with template recommendations

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
