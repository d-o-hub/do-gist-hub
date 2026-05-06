# Self-Learning Rules (Auto-Generated)

This section is automatically updated by `./scripts/analyze-codebase.sh`.

## CSS Layout Rules (Critical)

1. **Mobile-First Navigation**: Sidebar must be `display: none` by default — CSS BEFORE media queries
2. **Dynamic Viewport**: Use `100dvh` for app shell (not `100vh`) for mobile browser UI
3. **Safe Areas**: Include `env(safe-area-inset-*)` for notch/home indicator support
4. **Flex Scrolling**: Add `min-height: 0` to flex children with `overflow`
5. **Header Button Redundancy**: Hide mobile-only header buttons (hamburger, settings) when sidebar/rail is visible to prevent duplicate menus
6. **View Transitions**: Use `document.startViewTransition` for route navigation; wrap in `withViewTransition()` utility
7. **Container Queries**: Use `container-type: inline-size` for component-level responsive behavior (not just viewport media queries)

## Security Rules (Critical)

1. **PAT Encryption at Rest**: Encrypt Personal Access Tokens using Web Crypto API (AES-GCM) before storing in IndexedDB
2. **CSP Hardening**: Remove `unsafe-inline` in production; strictly limit `script-src`, `style-src`, and `font-src`
3. **Secure DOM Manipulation**: Use `sanitizeHtml` utility and secure `html` template tag to prevent XSS
4. **Token Redaction**: Return `'[REDACTED]'` unconditionally for all token logging; never log PAT fragments
5. **Non-Extractable Crypto Keys**: Set `extractable: false` on Web Crypto keys used for token encryption

## Lifecycle & Resilience Rules

1. **AbortController for Navigation**: Cancel in-flight fetch requests via AbortController during route changes
2. **LifecycleManager**: Use centralized lifecycle manager for automatic subscription cleanup on navigation
3. **Layered Error Boundaries**: Implement global, route, and async error boundaries — no silent failures
4. **Bounded Retries**: Max 3 attempts with exponential backoff for network operations

## Testing Patterns (CI Stability)

1. **Playwright Strict Mode**: Use `.first()` or `data-route` for multi-element locators
2. **Responsive Test Locators**: Use `.filter({ visible: true })` for breakpoint-specific UI
3. **Collapsed Sections**: Open `<details>` before clicking nested elements
4. **Focus Reliability**: Use `requestAnimationFrame` for CSS transition timing
5. **Offline Project Config**: Never set `offline: true` in `playwright.config.ts` — use `context.setOffline(true)` after `page.goto()`
6. **Offline Dynamic Imports**: Preload modules via `page.evaluate()` before going offline; dynamic `import()` fails when browser is offline
7. **Empty Element Visibility**: Playwright treats empty elements as hidden; always render inner content (e.g., sync indicator dot + sr-only text)

## Code Quality (DeepSource/CI)

1. **Inline skipcq**: Use `// skipcq: JS-XXXX` directly above lines (not `.deepsource.yml`)
2. **No `any` Types**: Use proper generics or `unknown` with type guards
3. **Package Versions**: Match `package.json` exactly to `package-lock.json`
4. **DeepSource TOML Syntax**: TOML requires double quotes for string values in `[analyzers.meta]` overrides
5. **DeepSource Rule Conflicts**: Disable `no-var`, `eqeqeq`, `prefer-arrow-callback`, `no-empty` in `.deepsource.toml` to avoid conflict with TypeScript-eslint strict mode

## Verification Checklist

Before committing, run:

```bash
./scripts/analyze-codebase.sh --validate
```

This checks:

- [ ] No unstyled elements at any breakpoint
- [ ] Layout gaps eliminated
- [ ] Responsive behavior correct (320px, 768px, 1536px)
- [ ] No horizontal overflow at any breakpoint
- [ ] No console errors
- [ ] Node.js 24 compatibility (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`)

## Issue History

See `issues/` for documented issues, `fixes/` for verified resolutions, and `SUMMARY.md` for comprehensive audit learnings.
