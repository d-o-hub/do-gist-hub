# AGENTS.md

> **d.o. Gist Hub** — offline-first GitHub Gist management app with token-driven responsive UI, PAT authentication, and Capacitor Android packaging.
> Stack: Vite, TypeScript (strict), PWA, IndexedDB, GitHub REST API, Capacitor 6
> Design: DTCG-aligned tokens, mobile-first, 7 breakpoints (320px–1536px+)

## Agent Type Reference

| Agent Type | grep | glob | read | bash                                                    | Use When... |
| ---------- | ---- | ---- | ---- | ------------------------------------------------------- | ----------- |
| `explore`  | ✅   | ✅   | ❌   | "Find files", "Search for X", "Read files in..."        |
| `general`  | ✅   | ✅   | ✅   | "Research X", "Run X and analyze", "Execute and report" |

**⚠️ CRITICAL**: `explore` agents CANNOT execute bash commands. Use `general` for bash needs.

## Quick Reference

```bash
npm install && ./scripts/setup-skills.sh && npm run dev  # Start development
./scripts/quality_gate.sh                                      # Before every commit
./scripts/analyze-codebase.sh --fix --validate              # Full analysis
npm run check                # typecheck + lint + format:check
npm run lint:fix             # auto-fix issues
npm run cap:sync             # sync Capacitor after build
```

**Critical Rules**: No unstyled elements | Mobile-first CSS | Tokens only | Validate before commit

## Version Management

**Single source of truth**: `VERSION` file. Never hardcode version strings.

| File           | How It Gets Version              |
| -------------- | -------------------------------- |
| `package.json` | Manually synced (npm limitation) |
| `README.md`    | Read from `VERSION` during CI    |
| Release tags   | Must match `VERSION` exactly     |

## App Identity

Canonical config: **`src/config/app.config.ts`**. Edit only this file — Vite plugins propagate.

| File                          | Derived From                           |
| ----------------------------- | -------------------------------------- |
| `package.json`                | `APP.id`, `APP.description`            |
| `index.html`                  | `APP.name`, `APP.description`          |
| `public/manifest.webmanifest` | `APP.name`, `APP.shortName`            |
| `capacitor.config.ts`         | `APP.appId`, `APP.name`                |
| `src/services/db.ts`          | `APP.dbName`                           |
| `public/sw.js`                | `APP.cacheName`, `APP.staticCacheName` |

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

**MANDATORY**: Run `./scripts/quality_gate.sh` before every commit.

## Code Style

- **TypeScript**: strict mode, no `any`, explicit return types
- **Naming**: camelCase (functions), PascalCase (types), UPPER_SNAKE_CASE (constants)
- **Imports**: absolute from `src/`, grouped (stdlib → external → internal)
- **Commits**: conventional (`feat:`, `fix:`, `docs:`, `ci:`, `test:`, `refactor:`, `chore:`)
- **Max lines**: source=500, SKILL.md=250, AGENTS.md=150

## Repository Structure

| Path              | Purpose                         |
| ----------------- | ------------------------------- |
| `.agents/skills/` | Skill definitions               |
| `plans/`          | ADRs and architecture decisions |
| `scripts/`        | Build/setup/quality scripts     |
| `src/`            | Application code                |
| `public/`         | Static assets                   |
| `tests/`          | Playwright E2E tests            |
| `analysis/`       | Generated reports, screenshots  |

## Scope v1 vs v2

**v1 (now)**: PAT auth, IndexedDB, PWA, Capacitor Android, gist CRUD, offline read/writes
**v2 (future)**: OAuth device flow, backend sync, real-time collab, multi-account

## Agent Workflow

1. **Analyze**: `triz-analysis` identifies contradictions
2. **Solve**: `triz-solver` resolves trade-offs
3. **Document**: Write ADR in `plans/adr-*.md`
4. **Implement**: Follow ADR, atomic commits, validate before commit

## Validation Before Commit

1. `./scripts/quality_gate.sh` passes
2. Type check, lint, format check pass (`npm run check`)
3. No console errors, responsive on 2+ viewports
4. Memory profile stable, no leaks

## Output Directory

All outputs MUST use `analysis/`:

| Output Type            | Location               |
| ---------------------- | ---------------------- |
| Responsive screenshots | `analysis/responsive/` |
| Visual diffs           | `analysis/diffs/`      |
| Test artifacts         | `analysis/tests/`      |

## Stop Conditions

Docs contradict assumptions → Stop → Document → Propose correction → Wait for confirmation

## Key npm Scripts

See `agents-docs/available-skills.md` for details. Quick commands: `npm run check`, `npm run lint:fix`, `npm run quality`, `npm run cap:sync`

## Agent-Specific Files

| File        | Purpose                              |
| ----------- | ------------------------------------ |
| `CLAUDE.md` | Claude Code overrides (`@AGENTS.md`) |
| `GEMINI.md` | Gemini CLI overrides (`@AGENTS.md`)  |
| `QWEN.md`   | Qwen Code overrides (`@AGENTS.md`)   |

## Detailed References

- **Domain Rules**: `agents-docs/domain-rules.md`
- **UI/UX Standards**: `agents-docs/ui-ux-standards.md`
- **Available Skills**: `agents-docs/available-skills.md`
- **Autonomous Optimization**: `agents-docs/autonomous-optimization.md`
- **Self-Learning Rules**: `agents-docs/self-learning-rules.md`
