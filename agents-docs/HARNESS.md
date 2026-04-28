# Agent Harness Overview

> How agents interact with the d.o. Gist Hub stack and coordinate work across sub-agents.

## Stack Interaction Model

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agent     │────▶│   Skills    │────▶│  Tool Use   │
│  (Context)  │     │ (Workflows) │     │ (Read/Write)│
└──────┬──────┘     └─────────────┘     └──────┬──────┘
       │                                         │
       │     ┌───────────────────────────────────┘
       │     │
       ▼     ▼
┌─────────────────────────────────────────────────────┐
│              Agent Harness Layer                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ AGENTS.md│  │  Skills  │  │  Quality Gate    │  │
│  │ (Rules)  │  │(Workflows)│  │  (Validation)    │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌─────────┐      ┌──────────┐      ┌──────────┐
   │  Vite   │      │TypeScript│      │IndexedDB │
   │ (Build) │      │ (Strict) │      │ (Offline)│
   └─────────┘      └──────────┘      └──────────┘
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐      ┌──────────┐      ┌──────────┐
   │   PWA   │      │ Capacitor│      │GitHub API│
   │   SW    │      │(Android) │      │ (REST)   │
   └─────────┘      └──────────┘      └──────────┘
```

### Agent → Codebase Contract

| Layer | Agent Responsibility | Tool Pattern |
|-------|---------------------| ------------|
| **Vite** | Never modify `vite.config.ts` directly; use `src/config/app.config.ts` and let Vite plugins propagate | `read` → `edit` (config only) |
| **TypeScript** | Strict mode, no `any`, explicit return types on public APIs | `read` → `write` with type guards |
| **IndexedDB** | Offline-first reads/writes; optimistic updates; queue sync | `read` for schema, `write` for repository code |
| **Capacitor** | Sync after build (`npm run cap:sync`); Android-specific concerns via `capacitor-android` skill | `bash` for sync commands |
| **PWA** | Service worker caching strategy; manifest derived from `app.config.ts` | `read` for `sw.js`, `edit` for cache names |
| **GitHub API** | Typed client, pagination via `Link` headers, rate limit tracking | `read` for client code, `edit` for endpoints |

## Single Source of Truth

### App Identity: `src/config/app.config.ts`

All app identity derives from this file. Vite plugins propagate changes automatically.

| File | Derived Field | How |
|------|---------------|-----|
| `package.json` | `name`, `description` | Manual sync (npm limitation) |
| `index.html` | `<title>`, meta description, theme color | Vite plugin |
| `public/manifest.webmanifest` | `name`, `short_name` | Vite plugin |
| `capacitor.config.ts` | `appId`, `appName` | Vite plugin |
| `src/services/db.ts` | `dbName` | Import at runtime |
| `public/sw.js` | `cacheName`, `staticCacheName`, `apiCacheName` | Build-time replacement |

**Rule**: Edit only `src/config/app.config.ts`. Never hardcode app names, IDs, or cache names elsewhere.

### Version: `VERSION` file

| File | How It Gets Version |
|------|---------------------|
| `package.json` | Manually synced (npm limitation) |
| `README.md` | Read from `VERSION` during CI |
| Release tags | Must match `VERSION` exactly |

## Sub-Agent Decomposition Patterns

### When to Decompose

| Scenario | Pattern | Example |
|----------|---------|---------|
| Isolated feature with clean boundary | **Feature agent** | "Implement gist starring" → delegate to gist-CRUD sub-agent |
| Cross-cutting concern (UI + logic + storage) | **Layer agent** | "Add offline indicator" → UI agent + sync agent |
| Complex workflow requiring state isolation | **Phase agent** | "Migrate to new token system" → research → migrate → validate |
| Context-heavy task that may rot | **Snapshot agent** | "Fix sync bug" → sub-agent gets full error context + repro steps |

### Gist CRUD Decomposition Example

```
Main Agent (orchestrator)
├── Sub-Agent A: Data Layer
│   ├── Update `src/services/db/` schema
│   ├── Add repository method
│   └── Return new method signature
├── Sub-Agent B: API Layer  
│   ├── Update `src/services/github/client.ts`
│   ├── Add typed request/response types
│   └── Return endpoint wrapper
├── Sub-Agent C: UI Layer
│   ├── Create/update component in `src/components/gist/`
│   ├── Wire to store (`src/stores/gist-store.ts`)
│   └── Return component interface
└── Sub-Agent D: Integration
    ├── Connect store → repository → API
    ├── Add optimistic update logic
    └── Run quality gate
```

**Synthesis Rule**: Main agent reads outputs from all sub-agents, verifies consistency, and commits atomically. One logical change = one commit.

## Quality Gate Integration

### Pre-Commit Flow

```
Agent makes changes
        │
        ▼
┌───────────────┐
│ analyze-code  │  ← ./scripts/analyze-codebase.sh --pre-commit
│   --pre-commit│     (pattern detection + auto-fix)
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ quality_gate  │  ← ./scripts/quality_gate.sh
│               │     (typecheck + lint + format:check + skill validation)
└───────┬───────┘
        │
        ▼
    git commit
```

### Agent Responsibilities at Each Gate

| Gate | What It Checks | Agent Action If Fails |
|------|----------------|----------------------|
| `analyze-codebase.sh --pre-commit` | Pattern violations (CSS, TS, HTML) | Read `agents-docs/detected/`, apply fix, re-run |
| `npm run typecheck` | TypeScript strict mode compliance | Fix types; use `unknown` + type guards, never `any` |
| `npm run lint` | ESLint rules | Run `npm run lint:fix` first; manual fix if not auto-fixable |
| `npm run format:check` | Prettier formatting | Run `npm run format` |
| `validate-skills.sh` | SKILL.md frontmatter, structure | Read skill-creator skill; fix frontmatter or directory layout |

### Critical Agent Rules

1. **No commit without quality gate** — `./scripts/quality_gate.sh` must pass
2. **Fix pre-existing issues first** — If analysis finds unrelated issues, fix them before the main task
3. **One logical change per commit** — Do not bundle feature work with unrelated fixes
4. **Screenshots for UI changes** — `agent-browser screenshot analysis/responsive/{320,768,1536}px.png`

## Context Discipline

| Trigger | Action |
|---------|--------|
| Task switch | `/clear` between unrelated tasks |
| Long session (>30min) | Summarize progress, `/clear`, paste summary |
| Sub-agent handoff | Provide complete context snapshot (see `SUB-AGENTS.md`) |
| Contradiction found | Stop → Document → `triz-analysis` → `triz-solver` |

## References

- `AGENTS.md` — Canonical rules and constants
- `plans/002-architecture.md` — System architecture
- `agents-docs/SUB-AGENTS.md` — Delegation patterns and synthesis
- `scripts/quality_gate.sh` — Gate implementation
