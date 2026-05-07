<!-- Last Audit: 2026-05-07 -->

# Testing Strategy

## Playwright Coverage (299 tests)

### Browser Tests (`tests/browser/`)

- `db-service.spec.ts` - IndexedDB CRUD, pending writes, metadata, export/import
- `gist-store.spec.ts` - Store integration, filtering, search
- `gist-list.spec.ts` - List rendering, filtering, sorting, search with debounce
- `gist-edit-ui.spec.ts` - Create form, validation, successful creation
- `export-import.spec.ts` - Export to JSON, import with conflict detection
- `navigation.spec.ts` - Route navigation, command palette
- `settings.spec.ts` - Settings page functionality

### Mobile Tests (`tests/mobile/`)

- `responsive.spec.ts` - 7-breakpoint responsive verification
- `navigation.spec.ts` - Mobile navigation patterns
- `real-user-validation.spec.ts` - User flow validation

### Unit Tests (`tests/unit/`)

- `gist-store.spec.ts` - Store logic unit tests
- `github-client.spec.ts` - API client with mocks
- `rate-limiter.spec.ts` - Rate limiting logic
- `conflict-detector.spec.ts` - Conflict detection algorithm
- `db-security.test.ts` - Security: exportData redacts sensitive metadata (NEW)

### Android Tests (`tests/android/`)

- `capacitor-smoke.spec.ts` - Capacitor Android smoke tests

### Security & Performance (`tests/browser/`)

- `security-stubs.spec.ts` - CSP validation, PAT encryption verification, token redaction (IMPLEMENTED)
- `performance-stubs.spec.ts` - LCP budgets, interaction latency, bundle size, code splitting (IMPLEMENTED)
- `memory-stubs.spec.ts` - AbortController cancellation, lifecycle cleanup, heap growth, IDB connections (IMPLEMENTED)

## Test Infrastructure

- Vitest for unit tests
- Playwright for browser/mobile E2E
- MSW for API mocking
- 3-shard CI parallelization

---

_Created: 2026. Last Updated: 2026-05-07. Status: Completed - All test stubs implemented with full coverage._
