# Available Skills Reference

> Auto-generated-style catalog of all skills in `.agents/skills/`. Use `@skill-name` to invoke.

## Core Workflow

| Skill | Purpose | Trigger |
|-------|---------|---------|
| `triz-analysis` | TRIZ contradiction audit | Before any architectural decision or complex refactor |
| `triz-solver` | TRIZ problem-solving | When stuck on technical contradictions or trade-offs |
| `task-decomposition` | Break complex tasks into atomic goals | Multi-step projects, parallel execution opportunities |

## Project Lifecycle

| Skill | Purpose | Trigger |
|-------|---------|---------|
| `repo-bootstrap` | Initialize repo from template | New project setup |
| `agents-md-author` | Create/update AGENTS.md | Project onboarding, doc maintenance |
| `skill-creator` | Create/improve skills | New capability needed, skill optimization |
| `skill-evaluator` | Evaluate skill performance | Benchmarking, regression testing |

## UI/UX & Design

| Skill | Purpose | Trigger |
|-------|---------|---------|
| `design-token-system` | DTCG-aligned token architecture | Creating or modifying design tokens |
| `responsive-system` | 7-breakpoint responsive design | Layout changes, breakpoint adjustments |
| `ui-ux-optimize` | UI/UX research with tokens | Design reviews, user flow optimization |
| `reader-ui-ux` | Reader UI implementation | Building accessible, modern UI components |

## Backend & Data

| Skill | Purpose | Trigger |
|-------|---------|---------|
| `offline-indexeddb` | IndexedDB schema & operations | Database changes, offline features |
| `github-gist-api` | Gist API client with pagination | API integration, rate limit handling |
| `global-error-handling` | Error strategy & boundaries | Error handling design, boundary setup |

## Quality & Security

| Skill | Purpose | Trigger |
|-------|---------|---------|
| `security-hardening` | CSP, validation, redaction | Security audit, input handling |
| `performance-budgeting` | Performance measurement | Bundle analysis, load time optimization |
| `memory-leak-prevention` | Cleanup patterns | Lifecycle review, subscription cleanup |
| `playwright-quality` | Cross-browser/mobile testing | E2E test changes, responsive verification |
| `reviewer-evaluator` | Code review quality gates | Pre-merge review, quality assessment |

## Platform & Packaging

| Skill | Purpose | Trigger |
|-------|---------|---------|
| `pwa-shell` | Service worker & offline caching | PWA configuration, caching strategy |
| `capacitor-android` | Android packaging | Capacitor build, Android-specific issues |
| `agent-browser` | Browser automation CLI | Screenshots, form filling, scraping |
| `shell-script-quality` | ShellCheck/BATS for scripts | Writing or modifying `.sh` files |

## Automation

| Skill | Purpose | Trigger |
|-------|---------|---------|
| `codebase-optimizer` | Autonomous analysis, detection, fixing | Periodic audits, pre-commit optimization |

## Skill Directory Layout

```
.agents/skills/
├── agent-browser/
├── agents-md-author/
├── capacitor-android/
├── codebase-optimizer/
├── design-token-system/
├── github-gist-api/
├── global-error-handling/
├── memory-leak-prevention/
├── offline-indexeddb/
├── performance-budgeting/
├── playwright-quality/
├── pwa-shell/
├── reader-ui-ux/
├── repo-bootstrap/
├── responsive-system/
├── reviewer-evaluator/
├── security-hardening/
├── shell-script-quality/
├── skill-creator/
├── skill-evaluator/
├── task-decomposition/
├── triz-analysis/
├── triz-solver/
└── ui-ux-optimize/
```

Each skill directory contains:
- `SKILL.md` — Metadata + instructions (≤ 250 lines)
- `evals/evals.json` — Test cases for validation
- `references/` — Detailed guides and patterns
- `scripts/` — Optional executable helpers

## Symlinks

Agent-specific directories symlink to the canonical source:

```
.claude/skills     -> ../.agents/skills
.gemini/skills     -> ../.agents/skills
.qwen/skills       -> ../.agents/skills
.cursor/skills     -> ../.agents/skills
```

Run `scripts/setup-skills.sh` to recreate symlinks.

## Updates

This file should be regenerated when skills are added or removed. The canonical source of truth is the `.agents/skills/` directory and the skills table in `AGENTS.md`.
