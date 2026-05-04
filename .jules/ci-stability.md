# CI Stability Learning Journal

## 2026-06-25 - [Playwright CI Stability & State Isolation]
**Learning:** CI shards frequently fail due to shared state (IndexedDB/localStorage) bleed between tests. Standard browser context isolation doesn't always guarantee clean local storage/DB if tests are not explicitly designed for it. A custom `test` fixture using `page.addInitScript` to clear `localStorage` and delete `IndexedDB` databases ensures deterministic results across shards.
**Action:** Implement `tests/base.ts` with state isolation and update all `.spec.ts` files to use it.

## 2026-06-25 - [Web Server Startup Reliability]
**Learning:** Exit code 1 without clear errors in CI often indicates the dev server didn't start in time for Playwright to connect. Default timeouts (60s) are insufficient for complex Vite apps in resource-constrained CI runners.
**Action:** Increase `webServer.timeout` to 120s and add `--retries=2` to handle transient startup failures.
