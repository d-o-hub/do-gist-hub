# Playwright CI Stabilization Journal

## 2026-06-25 - [Absolute State Isolation]
**Learning**: Browser contexts alone don't clear persistent storage like IndexedDB or Cache API. This causes shard flakiness.
**Action**: Implement `tests/base.ts` with a fixture that manually clears all storage origins (DB, Cache, SW, localStorage) once before every test.

## 2026-06-25 - [CI Resilience Configuration]
**Learning**: Resource constraints in CI often delay dev server startup.
**Action**: Locked `webServer.timeout: 120000` in config and added `--retries=2 --reporter=github` to CI workflow.

## 2026-06-25 - [Locator Robustness]
**Learning**: UI changes break brittle ID-based or case-sensitive selectors.
**Action**: Standardized on class-based selectors (`.gist-content`) and verified UI casing in test assertions.
