<!-- Last Audit: 2024-05-15 -->
# Testing Strategy

## Playwright Coverage

- Browser tests
- Mobile emulation
- Offline scenarios
- Error states

## CI Stability

- State isolation via custom `test` fixture (`tests/base.ts`) clearing `localStorage` and `IndexedDB`.
- Web server timeout increased to 120s.
- Automatic retries (2) in CI for flakiness reduction.
- Inline PR annotations via `--reporter=github`.

---

*Created: 2026. Status: Completed (Audited and Verified) (Missing coverage for security, performance, memory).*
