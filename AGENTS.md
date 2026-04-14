# AGENTS.md

> **d.o. Gist Hub** — single source of truth for all AI coding agents in this repository.
> Built with: Vite, TypeScript, PWA, Capacitor Android, IndexedDB, GitHub REST API
> Design System: Token-driven, mobile-first, responsive from 320px to 1536px+
> Version: 0.1.0

## App Identity

The canonical app identity lives in **`src/config/app.config.ts`**.
All files below must derive their values from that single source of truth:

| File | Field | Source constant |
|------|-------|----------------|
| `package.json` | `name` | `APP.id` |
| `package.json` | `description` | `APP.description` |
| `index.html` | `<title>`, `<meta description>`, `theme-color` | `APP.name`, `APP.description`, `APP.themeColor` (via Vite plugin) |
| `public/manifest.webmanifest` | `name`, `short_name`, `description` | `APP.name`, `APP.shortName`, `APP.description` (via Vite plugin) |
| `capacitor.config.ts` | `appId`, `appName` | `APP.appId`, `APP.name` |
| `src/services/db.ts` | `DB_NAME` | `APP.dbName` |
| `public/sw.js` | `CACHE_NAME`, `STATIC_CACHE`, `API_CACHE` | `APP.cacheName`, `APP.staticCacheName`, `APP.apiCacheName` |

When changing the app name, edit **only** `src/config/app.config.ts` and the Vite plugins will propagate the values automatically.

## Constants

```bash
readonly FILE_SIZE_LIMIT_SOURCE=500
readonly FILE_SIZE_LIMIT_SKILL=250
readonly FILE_SIZE_LIMIT_AGENTS=150
readonly GIT_COMMIT_TITLE_LIMIT=72
readonly RETRY_MAX_ATTEMPTS=3
readonly RETRY_BACKOFF_MS=1000
```

## Mission

Build **d.o. Gist Hub**, a production-ready, web-first GitHub Gist management app with:
- Offline-first behavior using IndexedDB as v1 local source of truth
- Fine-grained GitHub PAT authentication (no OAuth/device flow for v1)
- Full gist CRUD and related actions (star/unstar/fork/revisions)
- Token-driven design system with semantic tokens, themes, and responsive scaling
- Full responsive support from small phones to large desktop screens
- Complete global error handling with user-safe messages
- Security hardening with CSP, token redaction, input validation
- Memory-leak prevention via AbortController and lifecycle cleanup
- Performance budgets with Web Vitals measurement
- Android packaging via Capacitor

## Project Overview

**Stack**: Vite, TypeScript, Vanilla TS, CSS Custom Properties, IndexedDB, Fetch API, PWA, Capacitor Android, Playwright

**Architecture**: Mobile-first, offline-first, token-driven UI with layered error handling and optimistic writes

## Source-of-Truth Rules

1. **Repository files** take precedence over all other sources
2. **AGENTS.md** is the single source of truth for agent instructions
3. **`.agents/skills/`** contains canonical skill definitions
4. **`plans/` and ADRs** document architecture decisions
5. **Official documentation** over blogs or community sources
6. **Token system**: Own semantic token architecture (see `design-token-system` skill)

## Setup and Version Management

```bash
# Install dependencies
npm install

# Create skill symlinks
./scripts/setup-skills.sh

# Install git pre-commit hook
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

# Initialize design system
npm run init:design

# Start dev server
npm run dev
```

Edit `VERSION` file at root only. Pre-commit hook auto-propagates to docs.

## Quality Gate

**MANDATORY**: Run `./scripts/quality_gate.sh` before every commit.

Pre-commit hook blocks commits if quality gates fail. If blocked by global hooks:
```bash
git config --global --unset core.hooksPath
```

## Code Style and Naming Rules

- **Max lines per source file**: 500
- **Max lines per SKILL.md**: 250
- **Max lines AGENTS.md**: 150 (this file may exceed for completeness)
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `ci:`, `test:`, `refactor:`, `chore:`
- **TypeScript**: Strict mode, no `any`, explicit return types on public APIs
- **Naming**: camelCase for variables/functions, PascalCase for types/components, UPPER_SNAKE_CASE for constants
- **Files**: kebab-case for filenames, e.g., `design-system.ts`, `error-boundary.ts`
- **Imports**: Absolute paths from `src/`, group imports (stdlib, external, internal)
- **Shell scripts**: `shellcheck` compliant, use `set -euo pipefail`
- **No Magic Numbers**: Use named constants instead

## Repository Structure

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Agent instructions (single source of truth) |
| `.agents/skills/` | Canonical skill definitions |
| `plans/` | Architecture decisions and plans |
| `scripts/` | Build, setup, quality gate scripts |
| `src/` | Application source code |
| `public/` | Static assets |
| `tests/` | Playwright tests |
| `docs/` | Documentation |

**Rules**:
- Generated outputs go to `dist/` or `analysis/`, never root
- Each skill has its own directory with `SKILL.md`
- Plans and ADRs live in `plans/`

## Testing Rules

- Tests must be deterministic
- Silent on success, surface on failure
- Mobile emulation for key breakpoints
- Offline behavior tests
- Android/WebView smoke tests

## PR Instructions

- **Title Format**: `feat(scope): description` (Conventional Commits)
- **Branch per Feature**: One branch per feature/fix
- **Single Concern**: Each PR should address one concern
- **Title Limit**: 72 characters max

## Security Rules

- **Never Log PAT**: Redact all authorization data
- **Never Expose PAT in UI**: Mask after save, provide wipe flow
- **Never Place PAT in URLs**: Use Authorization header only
- **CSP Configuration**: Strict Content-Security-Policy headers
- **Input Validation**: Sanitize all user-provided fields
- **HTTPS Only**: All remote endpoints use HTTPS
- **No Secrets in Commits**: Use `.env` files, add to `.gitignore`
- **Pin Dependencies**: Pin GitHub Actions to full SHA with version comments

## Token Architecture Rules

1. **Tokens First**: All styles must derive from semantic tokens
2. **No Hardcoded Values**: No magic numbers when a token should exist
3. **Layered Architecture**: Primitive → Semantic → Component
4. **Themeable**: Support dark/light modes via token variants
5. **Responsive**: Tokens scale across 7 breakpoints
6. **DTCG Alignment**: Follow Design Tokens Community Group standards

## Responsive Design Rules

1. **Mobile-First**: Design for 320px first, scale up
2. **7 Breakpoints**: 320px, 390px, 480px, 768px, 1024px, 1280px, 1536px
3. **Fluid Typography**: Use `clamp()` for smooth scaling
4. **Touch Targets**: Minimum 44x44px on mobile
5. **Safe Areas**: Respect `env(safe-area-inset-*)` for notched devices

## Global Error Handling Rules

1. **Structured Errors**: Every async path returns structured errors
2. **User-Safe Messages**: Human-readable messages, no raw stack traces
3. **Recoverable Actions**: Offer next steps for recoverable errors
4. **No Silent Failures**: Every promise rejection handled
5. **No Infinite Retries**: Bounded retry policies with backoff
6. **Redacted Diagnostics**: No secrets in logs or diagnostics

## Memory Leak Prevention Rules

1. **Cleanup Mandatory**: All timers, listeners, observers must be cleaned up
2. **AbortController Required**: Cancelable fetch for all async requests
3. **Route Cleanup**: Clear route-scoped resources on navigation
4. **No Retained Bodies**: Avoid keeping large gist file bodies in dead views

## Performance Budget Rules

1. **Initial JS Budget**: < 150KB gzipped
2. **Route Chunk Budget**: < 50KB gzipped per route
3. **Cold Start Target**: < 2s on mid-tier mobile
4. **Interaction Target**: < 100ms for gist list interactions
5. **Code Splitting**: Lazy-load heavy features (editor, revisions)

## Offline-First Rules

1. **IndexedDB Source of Truth**: Local DB is primary read source
2. **Optimistic Writes**: Update UI immediately, sync in background
3. **Pending Queue**: Queue writes when offline
4. **Retry Policy**: Exponential backoff for failed syncs
5. **Conflict State**: Track and surface sync conflicts

## GitHub API Rules

1. **Typed Client**: All requests typed, validated responses
2. **Pagination**: Handle `Link` headers for paginated results
3. **Rate Limits**: Track `X-RateLimit-*` headers, back off when near limit
4. **API Version**: Set `Accept: application/vnd.github+json`
5. **Auth Header**: `Authorization: Bearer <PAT>`

## Scope Rules v1 vs v2

### v1 (This Project)
- Fine-grained PAT authentication with token redaction in logs
- IndexedDB local storage with conflict detection and auto-resolution
- Web-first PWA with Web Vitals measurement
- Capacitor Android packaging (platform initialized)
- Full gist CRUD, star/unstar/fork/revisions
- Offline read, queued writes, sync conflict tracking
- Rate limit tracking via `X-RateLimit-*` headers
- Data export/import (JSON backup/restore)
- Interaction timing via `performance.measure()` API

### v2 (Future, Not Now)
- OAuth device flow
- Backend sync server
- Real-time collaboration
- Multi-account support
- Manual conflict resolution UI (conflicts detected but auto-resolved)
- Detail view skeleton loading (placeholder exists but not wired to async load)

**Do not implement v2 features in v1. Keep scope tight.**

## Agent Guidance

- **Plan First**: Use `plan-adr-goap` skill before implementation
- **Atomic Commits**: One logical change per commit
- **Resolve Pre-existing Issues**: Fix or document existing problems before new work
- **Post-Task Learning**: Append non-obvious insights to nearest `AGENTS.md`
- **Context Discipline**: Use `/clear` between tasks, delegate research to sub-agents
- **Monorepo Scoping**: Nearest `AGENTS.md` takes precedence

## Skills Discovery and Usage Rules

1. **List Skills**: `ls .agents/skills/` to see available skills
2. **Run Skill**: Reference skill by name in agent prompt
3. **Skill Structure**: Each skill has `SKILL.md` with frontmatter starting with `---`
4. **Progressive Disclosure**: Load skills on demand, not all at once
5. **Sub-Agent Pattern**: Delegate isolated tasks to sub-agents
6. **Create Skill**: `.agents/skills/<name>/SKILL.md` then run `./scripts/setup-skills.sh`

## Plans/ADR Workflow

1. **Create Plan**: Use `plan-adr-goap` skill to generate plans
2. **Write ADR**: Document significant decisions in `plans/adr-*.md`
3. **Implement**: Follow ADR decision during implementation
4. **Update**: Revise ADR if decision changes

## Validation-Before-Commit Rule

Before committing:
1. Run `./scripts/quality_gate.sh`
2. Verify type check, tests, and lint pass
3. Verify no console errors in dev tools
4. Verify responsive behavior on 2+ viewports
5. Verify memory profile stable

## Stop Conditions When Docs Contradict Assumptions

Stop immediately and:
1. Document the contradiction in relevant plan/ADR
2. Propose corrected approach based on official docs
3. Wait for confirmation before proceeding
4. Update any misleading documentation

**Never guess. Never assume. Verify against official docs.**

## Reference Docs

### Repo and Agent Workflow
- https://github.com/d-o-hub/github-template-ai-agents - Template repository
- https://agents.md/ - Agent skills specification
- https://agentskills.io/home - Agent Skills documentation

### Platform and APIs
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- https://capacitorjs.com/docs/ - Capacitor documentation
- https://docs.github.com/en/rest/gists/gists - GitHub Gists API
- https://playwright.dev/docs/emulation - Playwright emulation

## Available Skills

See `.agents/skills/` directory for all available skills. Run `ls .agents/skills/` to list.

Key skills for this project:
- `repo-bootstrap` - Initialize repo structure from template
- `agents-md-author` - Create/update AGENTS.md following spec
- `plan-adr-goap` - Generate plans and ADRs using GOAP methodology
- `design-token-system` - Productionize token architecture (DTCG-aligned)
- `responsive-system` - Define responsive behavior with 7 breakpoints
- `ui-ux-optimize` - Optimize UI/UX with tokens and accessibility
- `global-error-handling` - Error handling strategy and boundaries
- `security-hardening` - Security implementation (CSP, validation, redaction)
- `performance-budgeting` - Performance measurement and enforcement
- `memory-leak-prevention` - Leak prevention patterns and cleanup
- `offline-indexeddb` - IndexedDB schema and offline operations
- `github-gist-api` - GitHub Gist API client with pagination and rate limits
- `pwa-shell` - PWA setup with service worker and offline caching
- `capacitor-android` - Android packaging via Capacitor
- `playwright-quality` - Cross-browser and mobile testing coverage
- `reviewer-evaluator` - Code review quality gates
- `skill-creator` - Create and improve skills with evals
- `skill-evaluator` - Evaluate skill structure and performance
- `task-decomposition` - Break down complex tasks into atomic goals
- `triz-analysis` - Run systematic TRIZ contradiction audit
- `triz-solver` - Systematic problem-solving with TRIZ principles

**Note**: `plan-adr-go` directory is deprecated, use `plan-adr-goap` instead.