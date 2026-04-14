# AGENTS.md

> **d.o. Gist Hub** — offline-first GitHub Gist management app with token-driven responsive UI, PAT authentication, and Capacitor Android packaging.
> Stack: Vite, TypeScript (strict), PWA, IndexedDB, GitHub REST API, Capacitor 6
> Design: DTCG-aligned tokens, mobile-first, 7 breakpoints (320px–1536px+)
> Version: 0.2.0

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

## Temp Output Directory

All temporary outputs (screenshots, diffs, captures) MUST use `analysis/` as the root:

```bash
# CORRECT: Relative to project root
agent-browser screenshot analysis/responsive/320px.png

# WRONG: Absolute path from workspace root
agent-browser screenshot /workspaces/do-gist-hub/320px-check.png
```

| Output Type            | Location               |
| ---------------------- | ---------------------- |
| Responsive screenshots | `analysis/responsive/` |
| Visual diffs           | `analysis/diffs/`      |
| Capture recordings     | `analysis/captures/`   |
| Test artifacts         | `analysis/tests/`      |

**Rule**: Never use `/workspaces/...` for any output files.

1. `./scripts/quality_gate.sh` passes
2. Type check, lint, format check pass (`npm run check`)
3. No console errors, responsive on 2+ viewports
4. Memory profile stable, no leaks

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
| `shell-script-quality`   | ShellCheck/BATS for scripts           |
| `agent-browser`          | Browser automation CLI                |

## Reference Docs

- Template: https://github.com/d-o-hub/github-template-ai-agents
- Spec: https://agents.md/ | https://agentskills.io/home
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- Capacitor: https://capacitorjs.com/docs/
- GitHub Gists: https://docs.github.com/en/rest/gists/gists
- Playwright: https://playwright.dev/docs/emulation

---

## UI/UX Production Standards

### Critical Rule: No Unstyled Elements

Every interactive element MUST have explicit styling. Default browser styles are not acceptable.

**Pre-commit UI verification:**

1. Screenshot at 320px, 768px, 1536px → store in `analysis/responsive/`
2. Check for default browser buttons, unstyled inputs
3. Verify sidebar: hidden on mobile, visible on desktop
4. Touch targets ≥ 44x44px on mobile

### Navigation Pattern (Mobile-First)

```css
.sidebar-nav {
  display: none;
}
@media (min-width: 768px) {
  .sidebar-nav {
    display: flex;
    flex-direction: column;
  }
  .bottom-nav {
    display: none;
  }
}
.sidebar-item {
  /* styled, not default buttons */
}
.sidebar-item.active {
  background: var(--color-accent-primary);
}
```

### Common Regressions to Prevent

1. Sidebar visible on mobile → base style `display: none`
2. Unstyled nav items → use `.sidebar-item` / `.nav-item` classes
3. Missing active states → always define `.active` style
4. Hardcoded values → no px/hex colors outside token definitions

### View Transition API

Wrap navigation in `withViewTransition()` for smooth transitions. Always check `document.startViewTransition` support for fallback.

### Container Queries (2026 Card Pattern)

```css
.gist-card {
  container-type: inline-size;
  container-name: gist-card;
}
.gist-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
```

### Reduced Motion

Always include `@media (prefers-reduced-motion: reduce)` to disable animations for accessibility.

---

## 2026 Mobile Layout Standards

### Critical: No Gaps Between Header and Content

**The Problem**: Extra spacing between header and content creates unprofessional appearance.

**The Solution**: Use proper flexbox patterns with `min-height: 0` on flex children.

```css
/* WRONG: Creates unwanted gap */
.app-main {
  flex: 1;
  margin-top: var(--spacing-4);
}

/* CORRECT: Seamless flow from header */
.app-main {
  flex: 1 0 auto;
  padding: var(--spacing-4);
  min-height: 0; /* Critical for scrolling */
}
```

### 100dvh for Mobile Viewport Stability

```css
.app-shell {
  min-height: 100vh; /* Fallback */
  min-height: 100dvh; /* Dynamic viewport height */
}
```

### Safe Area Insets (Notch/Dynamic Island Support)

```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}

.app-header {
  padding-top: calc(var(--spacing-3) + var(--safe-area-top));
}

.bottom-nav {
  height: calc(72px + var(--safe-area-bottom));
  padding-bottom: calc(var(--spacing-2) + var(--safe-area-bottom));
}
```

### Layout Validation Commands

```bash
# Check for gap issues in screenshots
agent-browser open http://localhost:5173
agent-browser set viewport 390 844
agent-browser screenshot analysis/responsive/layout-check.png

# Verify no horizontal overflow
agent-browser eval "document.documentElement.scrollWidth <= window.innerWidth"
```

### Self-Learning: Layout Gap Fix

**Issue**: Visible gap between header and content on mobile screenshots.

**Root Cause**: Improper flexbox configuration and missing `min-height: 0` on flex children.

**Fix Applied**:

1. Updated `.app-shell` to use `min-height: 100dvh`
2. Changed `.app-main` from `flex: 1` to `flex: 1 0 auto`
3. Added `min-height: 0` to `.app-main` for proper scrolling
4. Updated bottom nav to include safe area insets

**Reference**: See `.agents/skills/design-token-system/references/mobile-layout-2026.md`

---

## Autonomous Optimization System

### Self-Learning Workflow

The codebase includes autonomous analysis and self-fixing capabilities:

```
Analyze → Detect → Fix → Validate → Learn → Document
```

### Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `analyze-codebase.sh` | Full analysis with optional auto-fix | `./scripts/analyze-codebase.sh --fix --validate` |
| `autosearch-issues.sh` | Pattern-based issue detection | `./scripts/autosearch-issues.sh` |
| `self-fix.sh` | Apply known fixes automatically | `./scripts/self-fix.sh --dry-run` |
| `quality_gate.sh` | Pre-commit validation | `./scripts/quality_gate.sh` |

### Quick Commands

```bash
# Full analysis cycle
./scripts/analyze-codebase.sh --fix --validate

# Watch mode - continuous monitoring
./scripts/analyze-codebase.sh --watch

# Pattern detection only
./scripts/autosearch-issues.sh

# Preview fixes without applying
./scripts/self-fix.sh --dry-run

# Apply fixes and verify
./scripts/self-fix.sh && ./scripts/quality_gate.sh
```

### Detection Categories

The system automatically detects:

**Visual/CSS Issues**
- Unstyled elements (missing CSS classes)
- Layout gaps (header/content spacing)
- Missing responsive breakpoints
- Missing safe area insets
- Default browser styles visible

**Code Structure Issues**
- Missing base styles before media queries
- Hardcoded values instead of tokens
- TypeScript `any` types
- Console.log statements
- Missing error boundaries

**Performance Issues**
- Unused CSS/JS
- Missing lazy loading patterns
- Inefficient re-renders

### Self-Learning Database

Issues and fixes are stored in `agent-docs/`:

```
agent-docs/
├── patterns/           # Extracted patterns (good and bad)
├── issues/            # Documented issues with context
├── fixes/             # Applied fixes with verification
└── references/        # Auto-generated best practices
```

### Pre-Commit Integration

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
./scripts/analyze-codebase.sh --pre-commit || exit 1
./scripts/quality_gate.sh || exit 1
```

### Continuous Improvement

Each fix updates:
1. **agent-docs/issues/** - Issue documentation
2. **agent-docs/fixes/** - Fix verification
3. **agent-docs/patterns/** - Extracted patterns
4. **AGENTS.md** - Prevention rules (this section)
5. **Skill references** - Updated best practices

### Autosearch Patterns

The system searches for these patterns automatically:

| Pattern | Issue | Severity |
|---------|-------|----------|
| `css_missing_base_display` | Element visible when should be hidden | High |
| `css_no_dvh` | Using 100vh instead of 100dvh | Medium |
| `css_hardcoded_colors` | Hardcoded hex colors | Low |
| `ts_any_type` | TypeScript `any` usage | Medium |
| `ts_console_log` | Console statements in code | Low |
| `html_unstyled_button` | Button without CSS class | High |

### Skill: codebase-optimizer

Use the `codebase-optimizer` skill for complex optimization tasks:

```bash
# The skill provides:
# - Autonomous analysis loop
# - Pattern extraction
# - Fix application
# - Documentation updates
# - Regression prevention
```

See `.agents/skills/codebase-optimizer/SKILL.md` for detailed usage.
