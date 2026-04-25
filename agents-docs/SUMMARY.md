# Agent Documentation Summary

## Overview
This directory serves as the persistent memory and self-learning database for AI agents working on d.o. Gist Hub.

## Key Learnings (2024-2026 Audits)

### CSS Layout Rules (Critical)
1. **Mobile-First Navigation**: Sidebar must be `display: none` by default — CSS must come BEFORE media queries
2. **Dynamic Viewports**: Always use `100dvh` for app shell (not `100vh`) to account for mobile browser UI
3. **Safe Areas**: Include `env(safe-area-inset-*)` for notch/home indicator support
4. **Flex Scrolling**: Add `min-height: 0` to flex children with `overflow` to prevent layout gaps

### Testing Patterns (CI Stability)
1. **Playwright Strict Mode**: Use `.first()` or `data-route` selectors when multiple functional elements exist (sidebar/rail/header)
2. **Responsive Test Locators**: Use `.filter({ visible: true })` for breakpoint-specific interactions
3. **Collapsed Sections**: Open `<details>` elements before clicking nested elements
4. **Focus Reliability**: Use `requestAnimationFrame` for focus transitions to avoid race conditions

### Code Quality (DeepSource/CI)
1. **Inline skipcq Annotations**: Use `// skipcq: JS-XXXX` directly above lines (not `.deepsource.yml`)
2. **No `any` Types**: Avoid `any` — use proper generics or unknown with type guards
3. **Package Versions**: Match `package.json` exactly to `package-lock.json` — CI fails on mismatch
4. **DeepSource TOML Config**: Use `.deepsource.toml` with `[analyzers.meta]` for rule overrides. TOML requires double quotes for strings: `"no-var" = "off"`
5. **DeepSource Rule Conflicts**: no-var, eqeqeq, prefer-arrow-callback, no-empty conflict with TypeScript-eslint strict mode - disable in `.deepsource.toml`

### Error Handling
1. **Structured Errors**: User-safe messages + recoverable actions + redacted diagnostics
2. **Bounded Retries**: Max 3 attempts with exponential backoff for network operations
3. **No Silent Failures**: Always log or show user notification for errors

## Final Achievements (2026)
- **Green CI**: All quality gates pass — typecheck, lint, format, Playwright tests
- **Visual Validation**: All 3 breakpoints verified for zero overflow and correct nav patterns
- **DeepSource Config**: Created `.deepsource.toml` with runtime_version=24 and rule disables for JS conflicts
- **Node.js 24 Ready**: CI uses `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`
- **Documentation Updated**: README v0.2.0, AGENTS.md self-learning rules, SUMMARY.md comprehensive learnings
