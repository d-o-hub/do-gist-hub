# AGENTS.md (2026 Edition)

> Offline-first GitHub Gist management.
> Stack: pnpm, Vite 8, TypeScript 6, Biome, Playwright, Vitest, Capacitor 8.

## Agent Workflow
1. **Analyze**: Read `README.md` and relevant `src/` files.
2. **Execute**: Use `pnpm` exclusively. No `npm`. No `yarn`.
3. **Verify**: Run tests and linting.
4. **Commit**: Pass `./scripts/quality_gate.sh`.

## Setup
```bash
pnpm install
pnpm run check
pnpm run test:unit
```

## Validation (Required)
```bash
./scripts/quality_gate.sh
```

## Code Guidelines
- **Strict Types**: No `any`. Explicit returns.
- **Tools**: Format and Lint with Biome (`pnpm run lint:fix`).
- **Commits**: Conventional Commits only (`feat:`, `fix:`, `chore:`, etc.).
- **Style**: Direct, professional. No conversational filler or emojis in generated documentation.

## Architecture
- `src/config/app.config.ts`: Single source of truth for app identity.
- `src/services/db.ts`: IndexedDB source of truth for offline-first architecture.
- `VERSION` file: Canonical version string.

## Skills & Capabilities
Consult `.agents/skills/` for specific modular agentic workflows. Avoid large monolithic prompts; use standard file execution.

---

## CI/CD Maintenance Rules

> Manually maintained. Review before every workflow change or GitHub deprecation cycle.

1. **Action Node Runtime Verification**: Before adding or bumping a GitHub Action, verify its runtime via `curl -s https://raw.githubusercontent.com/{owner}/{repo}/{tag}/action.yml | grep "using:"`. Prefer `node24` (or `composite`) over `node20`.
2. **Android SDK Explicit Setup**: Jobs invoking Gradle in `android/` must include `android-actions/setup-android@v4` with `platforms;android-{N} build-tools;{N}.0.0` where `{N}` matches `compileSdkVersion` in `android/variables.gradle`.
3. **Gradle Stacktrace in CI**: Always append `--stacktrace` to `./gradlew` commands in CI so build failures produce actionable logs.
4. **Build Job Timeouts**: Set `timeout-minutes` on Android build jobs (e.g., `30`) to prevent Gradle hangs from consuming runner minutes.
5. **No Hardcoded ANDROID_HOME**: When `setup-android` is used, do not override `ANDROID_HOME`; let the action configure the correct SDK path.
6. **Periodic Action Audit**: Re-audit all workflow actions every GitHub deprecation cycle (or when `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` appears in logs).

---

## Autonomous Optimization

Self-learning system that analyzes, detects, fixes, and documents issues automatically.

### Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `analyze-codebase.sh` | Full analysis with auto-fix | `--fix --validate --watch` |
| `autosearch-issues.sh` | Pattern-based detection | Detects CSS/TS/HTML issues |
| `self-fix.sh` | Apply known fixes | `--dry-run` to preview |

### Detection Patterns

| Pattern | Issue | Severity |
|---------|-------|----------|
| `css_missing_base_display` | Element visible when should be hidden | High |
| `css_no_dvh` | Using 100vh instead of 100dvh | Medium |
| `css_hardcoded_colors` | Hardcoded hex colors | Low |
| `ts_any_type` | TypeScript `any` usage | Medium |
| `html_unstyled_button` | Button without CSS class | High |

### Self-Learning Database

```
agents-docs/
├── patterns/     # Good/bad patterns
├── issues/       # Documented issues
├── fixes/        # Verified fixes
└── detected/     # Auto-detected issues
```

### Pre-Commit Hook

```bash
#!/bin/bash
./scripts/analyze-codebase.sh --pre-commit || exit 1
./scripts/quality_gate.sh || exit 1
```

See `.agents/skills/codebase-optimizer/SKILL.md` for details.

---

## Self-Learning Rules (Auto-Generated)

This section is automatically updated by `./scripts/analyze-codebase.sh`.

### CSS Layout Rules (Critical)

1. **Mobile-First Navigation**: Sidebar must be `display: none` by default — CSS BEFORE media queries
2. **Dynamic Viewport**: Use `100dvh` for app shell (not `100vh`) for mobile browser UI
3. **Safe Areas**: Include `env(safe-area-inset-*)` for notch/home indicator support
4. **Flex Scrolling**: Add `min-height: 0` to flex children with `overflow`
5. **Header Button Redundancy**: Hide mobile-only header buttons (hamburger, settings) when sidebar/rail is visible to prevent duplicate menus

### Testing Patterns (CI Stability)

1. **Playwright Strict Mode**: Use `.first()` or `data-route` for multi-element locators
2. **Responsive Test Locators**: Use `.filter({ visible: true })` for breakpoint-specific UI
3. **Collapsed Sections**: Open `<details>` before clicking nested elements
4. **Focus Reliability**: Use `requestAnimationFrame` for CSS transition timing
5. **Offline Project Config**: Never set `offline: true` in `playwright.config.ts` — use `context.setOffline(true)` after `page.goto()`
6. **Offline Dynamic Imports**: Preload modules via `page.evaluate()` before going offline; dynamic `import()` fails when browser is offline
7. **Empty Element Visibility**: Playwright treats empty elements as hidden; always render inner content (e.g., sync indicator dot + sr-only text)

### Code Quality (DeepSource/CI)

1. **Inline skipcq**: Use `// skipcq: JS-XXXX` directly above lines (not `.deepsource.yml`)
2. **No `any` Types**: Use proper generics or `unknown` with type guards
3. **Package Versions**: Match `package.json` exactly to `package-lock.json`

### Verification Checklist

Before committing, run:
```bash
./scripts/analyze-codebase.sh --validate
```

This checks:
- [ ] No unstyled elements at any breakpoint
- [ ] Layout gaps eliminated
- [ ] Responsive behavior correct
- [ ] No console errors

### Issue History

See `agents-docs/issues/` for documented issues and fixes.
