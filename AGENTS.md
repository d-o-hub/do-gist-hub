# AGENTS.md

> **d.o. Gist Hub** — offline-first GitHub Gist management app with token-driven responsive UI, PAT authentication, and Capacitor Android packaging.
> Stack: Vite, TypeScript (strict), PWA, IndexedDB, GitHub REST API, Capacitor 6
> Design: DTCG-aligned tokens, mobile-first, 7 breakpoints (320px–1536px+)

## Agent Type Reference

| Agent Type | grep | glob | read | bash | Use When... |
|-----------|------|------|------|------|-------------|
| `explore` | ✅ | ✅ | ❌ | "Find files", "Search for X", "Read files in..." |
| `general` | ✅ | ✅ | ✅ | "Research X", "Run X and analyze", "Execute and report" |

**⚠️ CRITICAL**: `explore` agents CANNOT execute bash commands (`npm`, `gh`, `git`, etc.). If your task needs bash execution, use `general` agent type.

### Failed Task Pattern

**❌ WRONG** - Explore agent with bash:
```xml
<invoke name="task">
  <parameter name="subagent_type">explore</parameter>
  <parameter name="prompt">Run npm test and analyze</parameter>
```

**✅ CORRECT** - General agent with bash:
```xml
<invoke name="task">
  <parameter name="subagent_type">general</parameter>
  <parameter name="prompt">Run npm test and analyze</parameter>
```

---

## Quick Reference

```bash
# Start development
npm install && ./scripts/setup-skills.sh && npm run dev

# Before every commit
./scripts/quality_gate.sh

# Full analysis with auto-fix
./scripts/analyze-codebase.sh --fix --validate

# Common tasks
npm run check        # typecheck + lint + format:check
npm run lint:fix     # auto-fix issues
npm run cap:sync     # sync Capacitor after build
```

**Critical Rules**: No unstyled elements | Mobile-first CSS | Tokens only | Validate before commit

## Version Management

**Single source of truth**: `VERSION` file at repository root.

All version references derive from this file:

| File           | How It Gets Version                 |
| -------------- | ----------------------------------- |
| `package.json` | Manually synced (npm limitation)    |
| `README.md`    | Read from `VERSION` during CI       |
| Release tags   | Must match `VERSION` exactly        |

**Rule**: Never hardcode version strings. Read from `VERSION` file at build time or runtime.

## App Identity

Canonical config: **`src/config/app.config.ts`**. All derived values flow from this single source:

| File                          | Derived From                                               |
| ----------------------------- | ---------------------------------------------------------- |
| `package.json`                | `APP.id`, `APP.description`                                |
| `index.html`                  | `APP.name`, `APP.description`, `APP.themeColor`            |
| `public/manifest.webmanifest` | `APP.name`, `APP.shortName`                                |
| `capacitor.config.ts`         | `APP.appId`, `APP.name`                                    |
| `src/services/db.ts`          | `APP.dbName`                                               |
| `public/sw.js`                | `APP.cacheName`, `APP.staticCacheName`, `APP.apiCacheName` |

**Rule**: Edit only `src/config/app.config.ts` — Vite plugins propagate automatically.

## Constants

```bash
readonly FILE_SIZE_LIMIT_SOURCE=500
readonly FILE_SIZE_LIMIT_SKILL=250
readonly FILE_SIZE_LIMIT_AGENTS=150
readonly GIT_COMMIT_TITLE_LIMIT=72
readonly RETRY_MAX_ATTEMPTS=3
readonly RETRY_BACKOFF_MS=1000
```

## Setup & Quality Gate

```bash
npm install && ./scripts/setup-skills.sh
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
npm run init:design && npm run dev
```

**MANDATORY**: Run `./scripts/quality_gate.sh` before every commit. If blocked: `git config --global --unset core.hooksPath`

## Code Style

- **TypeScript**: strict mode, no `any`, explicit return types on public APIs
- **Naming**: camelCase (functions), PascalCase (types), UPPER_SNAKE_CASE (constants), kebab-case (files)
- **Imports**: absolute from `src/`, grouped (stdlib → external → internal)
- **Commits**: conventional (`feat:`, `fix:`, `docs:`, `ci:`, `test:`, `refactor:`, `chore:`)
- **Shell**: `shellcheck` compliant, `set -euo pipefail`
- **Max lines**: source=500, SKILL.md=250, AGENTS.md=150 (may exceed for completeness)

## Repository Structure

| Path              | Purpose                         |
| ----------------- | ------------------------------- |
| `.agents/skills/` | Skill definitions               |
| `plans/`          | ADRs and architecture decisions |
| `scripts/`        | Build/setup/quality scripts     |
| `src/`            | Application code                |
| `public/`         | Static assets (manifest, sw.js) |
| `tests/`          | Playwright E2E tests            |
| `analysis/`       | Generated reports, screenshots  |

**Rules**: Generated outputs → `dist/` or `analysis/`. Plans/ADRs → `plans/`.

## Domain Rules

### Token Architecture

Tokens First → No hardcoded values → Primitive → Semantic → Component → Themeable → Responsive → DTCG-aligned

### Responsive Design

Mobile-first (320px) → 7 breakpoints (320/390/480/768/1024/1280/1536) → `clamp()` typography → 44x44px touch targets → `env(safe-area-inset-*)`

### Error Handling

Structured errors → User-safe messages → Recoverable actions → No silent failures → Bounded retries → Redacted diagnostics

### Security

Never log/expose PAT → Bearer auth only → Strict CSP → Input validation → HTTPS only → No secrets in commits

### Memory Prevention

AbortController for fetch → Route-scoped cleanup → No retained gist bodies → Bounded listener arrays

### Performance Budgets

Initial JS <150KB gz → Route chunks <50KB → Cold start <2s → Interactions <100ms → Lazy-load heavy features

### Offline-First

IndexedDB = source of truth → Optimistic writes → Pending sync queue → Exponential backoff → Conflict tracking

### GitHub API

Typed client → Pagination via `Link` headers → Rate limit tracking → `Accept: application/vnd.github+json`

## Scope v1 vs v2

**v1 (now)**: PAT auth, IndexedDB, PWA, Capacitor Android, gist CRUD, offline read/writes, rate limits, export/import
**v2 (future)**: OAuth device flow, backend sync, real-time collab, multi-account, conflict resolution UI, skeleton loading

**Do not implement v2 features in v1.**

## Agent Workflow

1. **Analyze**: `triz-analysis` identifies contradictions before implementation
2. **Solve**: `triz-solver` resolves trade-offs systematically
3. **Document**: Write ADR in `plans/adr-*.md` for architectural decisions
4. **Implement**: Follow ADR, atomic commits, validate before commit

**Principles**: One logical change per commit → Fix pre-existing issues first → `/clear` between tasks → Delegate to sub-agents

## Validation-Before-Commit

1. `./scripts/quality_gate.sh` passes
2. Type check, lint, format check pass (`npm run check`)
3. No console errors, responsive on 2+ viewports
4. Memory profile stable, no leaks

## Output Directory

All outputs (screenshots, diffs, captures) MUST use `analysis/`:

| Output Type            | Location               |
| ---------------------- | ---------------------- |
| Responsive screenshots | `analysis/responsive/` |
| Visual diffs           | `analysis/diffs/`      |
| Capture recordings     | `analysis/captures/`   |
| Test artifacts         | `analysis/tests/`      |

**Rule**: Never use `/workspaces/...` for output files.

## Stop Conditions

Docs contradict assumptions → Stop → Document → Propose correction → Wait for confirmation → Update docs. **Never guess. Verify.**

## Key npm Scripts

```bash
npm run check        # typecheck + lint + format:check
npm run lint:fix     # auto-fix issues
npm run test:debug   # Playwright debug mode
npm run quality      # run quality_gate.sh
npm run cap:sync     # sync Capacitor after build
```

## Available Skills

| Skill                    | Purpose                               |
| ------------------------ | ------------------------------------- |
| `repo-bootstrap`         | Initialize repo from template         |
| `agents-md-author`       | Create/update AGENTS.md               |
| `triz-analysis`          | TRIZ contradiction audit              |
| `triz-solver`            | TRIZ problem-solving                  |
| `task-decomposition`     | Break complex tasks into atomic goals |
| `design-token-system`    | DTCG-aligned token architecture       |
| `responsive-system`      | 7-breakpoint responsive design        |
| `ui-ux-optimize`         | UI/UX research with tokens            |
| `reader-ui-ux`           | Reader UI implementation              |
| `global-error-handling`  | Error strategy & boundaries           |
| `security-hardening`     | CSP, validation, redaction            |
| `performance-budgeting`  | Performance measurement               |
| `memory-leak-prevention` | Cleanup patterns                      |
| `offline-indexeddb`      | IndexedDB schema & operations         |
| `github-gist-api`        | Gist API client with pagination       |
| `pwa-shell`              | Service worker & offline caching      |
| `capacitor-android`      | Android packaging                     |
| `playwright-quality`     | Cross-browser/mobile testing          |
| `reviewer-evaluator`     | Code review quality gates             |
| `skill-creator`          | Create/improve skills                 |
| `skill-evaluator`        | Evaluate skill performance            |
| `codebase-optimizer`     | Autonomous analysis, detection, fixing | Periodic audits, pre-commit |
| `shell-script-quality`   | ShellCheck/BATS for scripts           |
| `agent-browser`          | Browser automation CLI                |

## Agent-Specific Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Claude Code overrides (`@AGENTS.md`) |
| `GEMINI.md` | Gemini CLI overrides (`@AGENTS.md`) |
| `QWEN.md` | Qwen Code overrides (`@AGENTS.md`) |

## Reference Docs

- Template: https://github.com/d-o-hub/github-template-ai-agents
- Spec: https://agents.md/ | https://agentskills.io/home
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- Capacitor: https://capacitorjs.com/docs/
- GitHub Gists: https://docs.github.com/en/rest/gists/gists
- Playwright: https://playwright.dev/docs/emulation

---

## UI/UX Production Standards

### Critical Rules

1. **No Unstyled Elements** - Every interactive element MUST have explicit CSS styling
2. **Mobile-First** - Base styles for mobile, enhance for desktop
3. **Tokens Only** - No hardcoded px/hex values outside token definitions
4. **Validate Before Commit** - Screenshots at 320px, 768px, 1536px

### Mobile-First CSS Patterns

**Navigation (Dual-mode)**
```css
/* Base: Mobile - hide sidebar, show bottom nav */
.sidebar-nav { display: none; }
.bottom-nav { display: flex; }

/* Desktop: show sidebar, hide bottom nav */
@media (min-width: 768px) {
  .sidebar-nav { display: flex; }
  .bottom-nav { display: none; }
}
```

**Layout (No Gaps)**
```css
/* App shell with dynamic viewport */
.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
}

/* Flex child with proper scrolling */
.app-main {
  flex: 1 0 auto;
  min-height: 0;
  padding: var(--spacing-4);
}
```

**Safe Areas (Notch Support)**
```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}

.app-header {
  padding-top: calc(var(--spacing-3) + var(--safe-area-top));
}
```

### Common Regressions to Prevent

| Issue | Prevention |
|-------|------------|
| Sidebar visible on mobile | Base style `display: none` |
| Unstyled buttons | Always use `.btn` / `.nav-item` classes |
| Layout gaps | Use `flex: 1 0 auto` + `min-height: 0` |
| Missing active states | Define `.active` for all interactive elements |
| Hardcoded values | Use CSS custom properties only |

### 2026 Patterns

**View Transitions**
```typescript
import { withViewTransition } from '../utils/view-transitions';
withViewTransition(() => { /* navigation */ });
```

**Container Queries**
```css
.gist-card {
  container-type: inline-size;
  container-name: gist-card;
}
```

**Reduced Motion**
```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

### Validation

```bash
# Screenshot validation
agent-browser open http://localhost:5173
agent-browser set viewport 390 844
agent-browser screenshot analysis/responsive/390px.png

# Check for overflow
agent-browser eval "document.documentElement.scrollWidth <= window.innerWidth"
```

### References
- `agents-docs/patterns/dynamic-viewport-units.md`
- `agents-docs/patterns/mobile-first-navigation.md`

- `.agents/skills/design-token-system/references/mobile-layout-2026.md`
- `.agents/skills/design-token-system/references/production-ui-standards.md`

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
6. **View Transitions**: Use `document.startViewTransition` for route navigation; wrap in `withViewTransition()` utility
7. **Container Queries**: Use `container-type: inline-size` for component-level responsive behavior (not just viewport media queries)

### Security Rules (Critical)

1. **PAT Encryption at Rest**: Encrypt Personal Access Tokens using Web Crypto API (AES-GCM) before storing in IndexedDB
2. **CSP Hardening**: Remove `unsafe-inline` in production; strictly limit `script-src`, `style-src`, and `font-src`
3. **Secure DOM Manipulation**: Use `sanitizeHtml` utility and secure `html` template tag to prevent XSS
4. **Token Redaction**: Return `'[REDACTED]'` unconditionally for all token logging; never log PAT fragments
5. **Non-Extractable Crypto Keys**: Set `extractable: false` on Web Crypto keys used for token encryption

### Lifecycle & Resilience Rules

1. **AbortController for Navigation**: Cancel in-flight fetch requests via AbortController during route changes
2. **LifecycleManager**: Use centralized lifecycle manager for automatic subscription cleanup on navigation
3. **Layered Error Boundaries**: Implement global, route, and async error boundaries — no silent failures
4. **Bounded Retries**: Max 3 attempts with exponential backoff for network operations

### Testing Patterns (CI Stability)

1. **Playwright Strict Mode**: Use `.first()` or `data-route` for multi-element locators
2. **Responsive Test Locators**: Use `.filter({ visible: true })` for breakpoint-specific UI
3. **Collapsed Sections**: Open `<details>` before clicking nested elements
4. **Focus Reliability**: Use `requestAnimationFrame` for CSS transition timing
5. **Offline Project Config**: Never set `offline: true` in `playwright.config.ts` — use `context.setOffline(true)` after `page.goto()`
6. **Offline Dynamic Imports**: Preload modules via `page.evaluate()` before going offline; dynamic `import()` fails when browser is offline
7. **Empty Element Visibility**: Playwright treats empty elements as hidden; always render inner content (e.g., sync indicator dot + sr-only text)
8. **State Isolation**: EVERY E2E test (`.spec.ts`) must import `test` from `tests/base.ts`. This fixture ensures absolute state isolation (clearing `localStorage`, `IndexedDB`, and `Service Workers`) before runs.

### Security Rules (Critical)

1. **PAT Encryption at Rest**: Encrypt Personal Access Tokens using Web Crypto API (AES-GCM) before storing in IndexedDB
2. **CSP Hardening**: Remove `unsafe-inline` in production; strictly limit `script-src`, `style-src`, and `font-src`
3. **Secure DOM Manipulation**: Use `sanitizeHtml` utility and secure `html` template tag to prevent XSS
4. **Token Redaction**: Return `'[REDACTED]'` unconditionally for all token logging; never log PAT fragments
5. **Non-Extractable Crypto Keys**: Set `extractable: false` on Web Crypto keys used for token encryption

### Lifecycle & Resilience Rules

1. **AbortController for Navigation**: Cancel in-flight fetch requests via AbortController during route changes
2. **LifecycleManager**: Use centralized lifecycle manager for automatic subscription cleanup on navigation
3. **Layered Error Boundaries**: Implement global, route, and async error boundaries — no silent failures
4. **Bounded Retries**: Max 3 attempts with exponential backoff for network operations

### Code Quality (DeepSource/CI)

1. **Inline skipcq**: Use `// skipcq: JS-XXXX` directly above lines (not `.deepsource.yml`)
2. **No `any` Types**: Use proper generics or `unknown` with type guards
3. **Package Versions**: Match `package.json` exactly to `package-lock.json`
4. **DeepSource TOML Syntax**: TOML requires double quotes for string values in `[analyzers.meta]` overrides
5. **DeepSource Rule Conflicts**: Disable `no-var`, `eqeqeq`, `prefer-arrow-callback`, `no-empty` in `.deepsource.toml` to avoid conflict with TypeScript-eslint strict mode

### Verification Checklist

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

### Issue History

See `agents-docs/issues/` for documented issues, `agents-docs/fixes/` for verified resolutions, and `agents-docs/SUMMARY.md` for comprehensive audit learnings.
