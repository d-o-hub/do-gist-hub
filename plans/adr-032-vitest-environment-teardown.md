# ADR-032 — Vitest Environment Teardown Error Fix: Proactive Transitive Module Mocking

> **Status**: Accepted
> **Type**: ADR
> **Created**: 2026-05-26
> **Updated**: 2026-05-26
> **Owner**: agent
> **Related**: tests/unit/app.test.ts, 051-progress-update-2026-05-20-tdz-circular-dep-fix.md

---

## Context

When vitest tears down the jsdom environment after all tests complete, any module that is resolved at that point (via a transitive import chain) triggers an `EnvironmentTeardownError`. The error manifests as:

```
Error: Failed to load url ../../src/components/ui/skeleton (resolved id: ../../src/components/ui/skeleton) in
  environment teardown. Load external file or use vi.mock.
```

The root cause is that `vi.mock` does **not** prevent transitive module resolution. Even when a module like `db.ts` or `gist-detail.ts` is fully mocked via `vi.mock`, the static import graph within those modules can still cause real imports to be resolved after the test environment is torn down. This happens because vitest's module registry still tracks the real (unmocked) transitive dependencies and may attempt to resolve them during cleanup.

### Affected Transitive Chains

1. **skeleton module**: The `gist-detail` and `home` routes import `Skeleton` from `../components/ui/skeleton`. When the route mocks are resolved at teardown, the skeleton module is pulled in as a real import.
2. **idb library**: `db.ts` imports `openDB` from `idb`. Even though `db.ts` is mocked, the transitive resolution can still trigger `idb` loading after teardown.
3. **conflict-detector, focus-trap**: Leaf modules in test-related import chains that get resolved at teardown.

---

## Decision

### 1. Proactively mock all transitively-resolvable modules in `app.test.ts`

Add `vi.mock` calls for every module that could be reached through the static import graph of mocked modules, even if those modules are already mocked at a higher level:

```typescript
// Prevent skeleton from being loaded after environment teardown when
// the real gist-detail or home module is transiently resolved instead
// of the mock (same pattern as idb below).
vi.mock('../../src/components/ui/skeleton', () => ({
  Skeleton: {
    renderDetail: vi.fn(() => '<div class="skeleton-detail"></div>'),
    renderList: vi.fn((_count?: number) => '<div class="skeleton-list"></div>'),
    renderCard: vi.fn(() => '<div class="skeleton-card"></div>'),
  },
}));

// Prevent idb from being loaded after environment teardown by mocking it
// before any test code runs. db.ts imports openDB from idb; even though db.ts
// is mocked via vi.mock, transitive module resolution can trigger idb loading
// after the JS DOM environment has been torn down.
vi.mock('idb', () => ({
  openDB: vi.fn(),
}));
```

### 2. Use eager `beforeAll` import() to pre-cache transitive leaf modules

For modules that cannot be mocked (e.g., because they are deeply embedded or dynamically imported), eagerly import them in `beforeAll` so they are resolved before the test suite runs:

```typescript
beforeAll(async () => {
  await Promise.all([
    import('../../src/services/sync/conflict-detector'),
    import('../../src/components/conflict-resolution'),
    import('../../src/utils/focus-trap'),
  ]).catch(() => {});
});
```

This works because `import()` in `beforeAll` resolves the module and caches it in vitest's module registry. Subsequent references during teardown find the cached module and do not trigger real file resolution.

### 3. Structured mocking order

Maintain the following order in test files to minimize teardown risk:

| Step | What | Why |
|------|------|-----|
| 1 | `vi.mock()` for all direct dependencies of the module under test | Standard practice |
| 2 | `vi.mock()` for all transitive leaf modules (skeleton, idb) | Prevent teardown resolution |
| 3 | `beforeAll` with eager `import()` for unmockable transitive chains | Pre-cache before env teardown |
| 4 | Regular imports and test code | Normal test execution |

---

## Tradeoffs

### Pros

- Eliminates non-deterministic `EnvironmentTeardownError` failures in CI.
- No runtime performance impact — mocks and eager imports are resolved once during module initialization.
- Defensive pattern that catches future teardown issues when new transitive dependencies are added.
- Compatible with vitest's existing module resolution — we work within the framework, not around it.

### Cons

- Requires manual maintenance — when new modules are added to import chains, their mocks must be added too.
- Eager `import()` in `beforeAll` means modules are loaded even for tests that don't use them (minimal overhead).
- The mock factories for skeleton and other UI modules must be kept in sync with the real module API.

---

## Consequences

- No more `EnvironmentTeardownError` in `app.test.ts` or similar test files.
- Pattern is documented and can be replicated in other test files (e.g., `gist-detail.test.ts`, `home.test.ts`).
- CI pipeline is more reliable — fewer non-deterministic failures.
- Developers can add new transitive dependencies with confidence that teardown issues will be caught by this pattern.

---

## Rejected Alternatives

### Mark tests as serial (`--sequence.concurrent=false`)
**Rejected because**: Running tests serially does not prevent teardown race conditions; the issue is module resolution timing, not concurrent execution.

### Upgrade vitest
**Rejected because**: The teardown behavior is by design — vitest cannot eagerly pre-resolve every possible transitive module. A framework-level fix is unlikely.

### Use `vi.hoisted()` for all mocks
**Rejected because**: `vi.hoisted()` only affects mock ordering within a file, not transitive resolution timing. Already used where needed (e.g., `vi.mock` is hoisted by vitest automatically).

### Disable jsdom environment teardown
**Rejected because**: Vitest does not expose a flag to skip environment teardown. Even if it did, suppressing teardown would mask real issues.

---

## Rollback

1. Remove the `vi.mock('../../src/components/ui/skeleton', ...)` block from `app.test.ts`.
2. Remove the `vi.mock('idb', ...)` block from `app.test.ts`.
3. Remove the `beforeAll` eager import block from `app.test.ts`.
4. Verify that `EnvironmentTeardownError` does not resurface (or accept the risk).

---

## References

- `tests/unit/app.test.ts` — target test file with the fix applied
- `051-progress-update-2026-05-20-tdz-circular-dep-fix.md` — related circular dependency fix
- [Vitest docs: vi.mock](https://vitest.dev/api/vi.html#vi-mock)
- [Vitest issue: EnvironmentTeardownError](https://github.com/vitest-dev/vitest/issues)

---

*Created: 2026-05-26. Status: Accepted.*
