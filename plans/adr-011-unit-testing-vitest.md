<!-- Last Audit: 2026-04-25 -->
# ADR-011: Unit Testing Infrastructure with Vitest

**Status**: Proposed
**Date**: 2026-04-25
**Deciders**: Architect, Testing Agent

## Context

The project currently has only Playwright E2E tests. There are no fast unit tests for:
- Business logic (gist-store operations, filtering, sorting)
- Utility functions (crypto, rate-limiter, conflict detection)
- Component rendering logic

Running Playwright for every code change is slow (~30s per test suite). A unit test layer would provide faster feedback during development.

## Decision

Add **Vitest** as the unit testing framework, running alongside Playwright.

### Rationale
- Native ESM support (matches our module system)
- TypeScript support out of the box
- Fast execution with Vite integration
- Jest-compatible API (familiar to most developers)
- Built-in mocking and spying
- Watch mode for development

### Test Structure

```
tests/
├── unit/           # Vitest tests
│   ├── gist-store.spec.ts
│   ├── conflict-detector.spec.ts
│   ├── crypto.spec.ts
│   └── rate-limiter.spec.ts
├── browser/        # Playwright E2E
├── mobile/         # Playwright mobile
├── offline/        # Playwright offline
├── accessibility/  # Playwright a11y
└── visual/         # Playwright visual regression
```

### Package.json Scripts

```json
{
  "test:unit": "vitest run",
  "test:unit:watch": "vitest",
  "test": "vitest run && playwright test"
}
```

## Tradeoffs

### Pros
- Fast feedback loop (< 5s for unit tests)
- Can test logic without browser overhead
- Better code coverage granularity
- Easier to test edge cases and error paths
- CI can run unit tests first (fail fast)

### Cons
- Additional dev dependency (~5MB)
- Another test framework to learn
- Risk of testing implementation details
- Need to mock IndexedDB, fetch, crypto APIs

## Consequences

### Development
- Run `pnpm test:unit:watch` during development
- E2E tests reserved for integration and regression
- Unit tests required for new business logic

### CI
- Unit tests run first (fast fail)
- E2E tests run only if unit tests pass
- Total CI time may decrease due to early failure detection

### Coverage
- Unit tests target business logic (stores, services, utils)
- E2E tests target user flows and cross-browser behavior
- Aim for 80%+ unit test coverage on non-UI code

## Rejected Alternatives

### Jest
**Rejected because**: Requires more configuration for ESM/TypeScript, slower than Vitest, larger ecosystem overlap not needed.

### Node.js built-in test runner
**Rejected because**: No built-in TypeScript support, less mature mocking, watch mode not as polished.

### No unit tests (E2E only)
**Current state — Rejected because**: Too slow for TDD, harder to debug failures, cannot test edge cases easily.

## Rollback Triggers

- Vitest proves unstable or incompatible with our module setup
- Team prefers to consolidate on Playwright only
- Maintenance burden exceeds value

## Implementation Notes

1. Install: `pnpm add -D vitest @vitest/coverage-v8 jsdom happy-dom`
2. Create `vitest.config.ts` alongside `vite.config.ts`
3. Add `setupFiles: ['./tests/unit/setup.ts']` for global mocks
4. Mock `idb` with in-memory store for unit tests
5. Mock Web Crypto API for crypto tests

## References

- `tests/unit/` — existing stub specs (github-client, conflict-detector, etc.)
- `src/stores/gist-store.ts` — primary target for unit tests
- `src/services/` — utility function targets

---

*Created: 2026-04-25. Status: Proposed.*
