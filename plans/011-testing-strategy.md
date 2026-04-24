<!-- Last Audit: 2026-04-24 -->
# Testing Strategy

## Playwright Coverage

- **Browser tests** — Settings, export/import, gist list, navigation, security stubs, performance stubs
- **Mobile emulation** — Responsive navigation at 390/768/1280px viewports
- **Offline scenarios** — Sync queue, conflict detection, cache behavior
- **Error states** — Global boundary, route-level fallbacks
- **Memory & lifecycle** — AbortController cancellation, listener cleanup, heap growth bounds
- **Accessibility** — Keyboard navigation, screen reader semantics, focus management

## Test Stability Guidelines

1. **Use `.first()`** for nav selectors that match sidebar/rail/header elements
2. **Wait for `networkidle`** after navigation clicks before asserting DOM state
3. **Open `<details>` sections** before interacting with collapsed content (e.g., Data & Diagnostics)
4. **Prefer `data-route` selectors** over `data-testid` for navigation — more resilient to layout changes
5. **Use `@ts-expect-error`** over `@ts-ignore` in test files for type suppressions
6. **Use `catch {}`** (no param) when the caught error variable is unused

---

*Created: 2026. Status: Active. Last updated: 2026-04-24.*
