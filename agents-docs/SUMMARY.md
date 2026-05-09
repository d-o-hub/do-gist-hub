# Agent Documentation Summary

## Overview
This directory serves as the persistent memory and self-learning database for AI agents working on d.o. Gist Hub.

## Key Learnings (2024–2026 Audits)

### CSS Layout Rules (Critical)
1. **Mobile-First Navigation**: Sidebar must be `display: none` by default — CSS must come BEFORE media queries
2. **Dynamic Viewports**: Always use `100dvh` for app shell (not `100vh`) to account for mobile browser UI
3. **Safe Areas**: Include `env(safe-area-inset-*)` for notch/home indicator support
4. **Flex Scrolling**: Add `min-height: 0` to flex children with `overflow` to prevent layout gaps
5. **Validation Script Accuracy**: Regex-based CSS detection must account for group selectors (e.g., `.sidebar-nav, .rail-nav`)

### Testing Patterns (CI Stability)
1. **Playwright Strict Mode**: Use `.first()` or `data-route` selectors when multiple functional elements exist
2. **Responsive Test Locators**: Use `.filter({ visible: true })` for breakpoint-specific interactions
3. **Collapsed Sections**: Open `<details>` elements before clicking nested elements
4. **Focus Reliability**: Use `requestAnimationFrame` for focus transitions to avoid race conditions
5. **Offline Dynamic Imports**: Preload modules via `page.evaluate()` before going offline
6. **Empty Element Visibility**: Playwright treats empty elements as hidden; always render inner content

### CI/CD Maintenance (Node Runtime Compatibility)
1. **Action Version Audit**: Before any CI change, verify the target action's Node runtime via `curl -s https://raw.githubusercontent.com/{owner}/{repo}/{tag}/action.yml | grep "using:"`. Only use versions that declare `node24` (or `composite`).
2. **Android SDK Explicit Setup**: Never rely on implicit `ubuntu-latest` Android SDK state. Always add `android-actions/setup-android@v4` with platform/build-tools matching `compileSdkVersion`.
3. **Gradle Diagnostics in CI**: Append `--stacktrace` to all `./gradlew` commands in CI workflows so failures are self-diagnosing.
4. **Build Timeouts**: Add `timeout-minutes` to any Gradle or long-running build job to prevent hung runners from burning minutes.
5. **Runner Env Fallbacks**: Do not hardcode `ANDROID_HOME` when `setup-android` is present; let the action configure the SDK path.

### Code Quality (DeepSource/CI)
1. **Inline skipcq Annotations**: Use `// skipcq: JS-XXXX` directly above lines
2. **No `any` Types**: Avoid `any` — use proper generics or `unknown` with type guards
3. **Package Versions**: Match `package.json` exactly to `package-lock.json`
4. **DeepSource TOML Config**: Use `.deepsource.toml` with `[analyzers.meta]` for rule overrides

### Error Handling
1. **Structured Errors**: User-safe messages + recoverable actions + redacted diagnostics
2. **Bounded Retries**: Max 3 attempts with exponential backoff for network operations
3. **No Silent Failures**: Always log or show user notification for errors

## Final Achievements (2026)
- **Green CI**: All quality gates pass — typecheck, lint, format, Playwright tests
- **Visual Validation**: All 3 breakpoints verified for zero overflow and correct nav patterns
- **DeepSource Config**: Created `.deepsource.toml` with runtime_version=24 and rule disables for JS conflicts
- **Node.js 24 Native**: All workflow actions bumped to node24-native major versions; Android CI hardened with explicit SDK setup and Gradle diagnostics
- **Documentation Updated**: README v0.2.0, AGENTS.md self-learning rules, SUMMARY.md comprehensive learnings
