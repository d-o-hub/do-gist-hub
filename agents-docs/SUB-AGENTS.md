# Sub-Agent Delegation Patterns

> When and how to delegate work to sub-agent instances, with complete context handoff and result synthesis.

## When to Delegate

| Condition | Delegate? | Rationale |
|-----------|-----------|-----------|
| Task is **isolated** with clean boundaries | Yes | Reduces context clutter; enables parallel work |
| Task requires **different expertise** | Yes | Use domain-specific skills (e.g., `design-token-system` for token work) |
| Context is **at risk of rot** | Yes | Sub-agent gets a fresh, focused context snapshot |
| Task is **trivial** (< 5 min) | No | Handoff overhead exceeds benefit |
| Tasks are **highly interdependent** | No | Synchronous editing in main agent prevents merge conflicts |
| Requires **real-time feedback loops** | No | Keep in main agent for rapid iteration |

## Context Isolation Principle

Sub-agents do **not** inherit your context. Every handoff must include:

```
┌─────────────────────────────────────────┐
│          Context Snapshot               │
├─────────────────────────────────────────┤
│ 1. Goal: What must be achieved          │
│ 2. Constraints: What must NOT change    │
│ 3. Relevant files: Paths + purposes     │
│ 4. Current state: What's done vs open   │
│ 5. Success criteria: How to verify      │
│ 6. Return format: Expected deliverable  │
└─────────────────────────────────────────┘
```

## Handoff Template

```markdown
## Task: [One-line summary]

### Goal
[Specific, measurable outcome]

### Constraints
- Do NOT modify [file X, file Y]
- Must follow [AGENTS.md rule Z]
- Must stay within [v1 scope boundary]

### Relevant Files
- `src/services/db/schema.ts` — Current IndexedDB schema
- `src/services/github/client.ts` — GitHub API client
- `src/stores/gist-store.ts` — State management for gists

### Current State
- [x] Schema supports gist metadata
- [ ] Schema missing `starredAt` field
- [ ] UI shows star button but it's a no-op

### Success Criteria
1. `starredAt` added to schema with migration
2. Store action `toggleStar(gistId)` implemented
3. API client `starGist` / `unstarGist` endpoints wired
4. Quality gate passes

### Return Format
Provide:
1. List of files modified
2. Key code snippets for review
3. Any assumptions made
```

## Synthesis Patterns

### Pattern A: Sequential Synthesis

Use when sub-agents build on each other's output.

```
Agent A → Output A
   │
   ▼
Agent B (receives Output A) → Output B
   │
   ▼
Main Agent (verifies B against A) → Commit
```

**Rule**: Main agent must verify that B's changes don't invalidate A's assumptions.

### Pattern B: Parallel Synthesis

Use when sub-agents work on independent components.

```
        ┌─→ Agent A → Output A ─┐
        │                       │
Main ──┼─→ Agent B → Output B ─┼→ Main Agent → Synthesize → Commit
        │                       │
        └─→ Agent C → Output C ─┘
```

**Rule**: Main agent resolves any interface mismatches before committing.

### Pattern C: Review Synthesis

Use for quality gates and audits.

```
Main Agent → Change Set
    │
    ├─→ Review Agent (security) → Security report
    ├─→ Review Agent (performance) → Performance report
    └─→ Review Agent (responsive) → Screenshot report
    │
    ▼
Main Agent → Address findings → Commit
```

## Examples

### Example 1: Gist CRUD Feature

**Task**: "Add ability to delete a gist"

```
Main Agent
├── Sub-Agent: Data Layer
│   ├── Input: `src/services/db/schema.ts`, `src/services/db/repository.ts`
│   ├── Task: Add `deleteGist(id)` to repository, handle cascade
│   └── Output: Repository method + unit test skeleton
│
├── Sub-Agent: API Layer
│   ├── Input: `src/services/github/client.ts`
│   ├── Task: Add `DELETE /gists/{id}` endpoint wrapper
│   └── Output: Typed client method
│
├── Sub-Agent: UI Layer
│   ├── Input: `src/components/gist/`, `src/stores/gist-store.ts`
│   ├── Task: Add delete button with confirmation, optimistic removal
│   └── Output: Component + store action
│
└── Main Agent: Integration
    ├── Wire store → repository → API
    ├── Add error boundary for delete failures
    ├── Run quality gate
    └── Commit: `feat: add gist deletion with optimistic UI`
```

### Example 2: Token System Migration

**Task**: "Migrate all hardcoded colors to semantic tokens"

```
Main Agent
├── Sub-Agent: Discovery
│   ├── Input: `src/**/*.css`, `src/**/*.ts`
│   ├── Task: Find all hardcoded hex/rgb colors
│   └── Output: Report with file paths and color values
│
├── Sub-Agent: Token Design
│   ├── Input: Discovery report + `src/tokens/semantic/`
│   ├── Task: Map discovered colors to semantic token names
│   └── Output: Token mapping document
│
└── Main Agent: Application
    ├── Update `src/tokens/semantic/` with new tokens
    ├── Replace hardcoded values in components
    ├── Run `npm run check`
    ├── Screenshot validation at 3 breakpoints
    └── Commit: `refactor: migrate colors to semantic tokens`
```

### Example 3: Sync Feature Audit

**Task**: "Audit offline sync for memory leaks"

```
Main Agent
├── Sub-Agent: Code Review
│   ├── Input: `src/services/sync/`, `src/services/network/`
│   ├── Task: Identify unbounded listeners, missing AbortControllers
│   └── Output: Issue list with file/line references
│
├── Sub-Agent: Fix Application
│   ├── Input: Issue list
│   ├── Task: Apply `memory-leak-prevention` patterns
│   └── Output: Fixed files
│
└── Main Agent: Verification
    ├── Review fixes against `memory-leak-prevention` skill
    ├── Run Playwright memory profile
    └── Commit: `fix: resolve sync memory leaks`
```

## Common Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Sub-agent modifies files outside its scope | Explicit "Do NOT modify" list in handoff |
| Sub-agent contradicts AGENTS.md rules | Include relevant domain rule citations |
| Sub-agent drifts from v1 scope | State "v1 only" or "v2 deferred" explicitly |
| Lost context on synthesis | Main agent re-reads modified files before committing |
| Merge conflicts in parallel work | Assign non-overlapping file sets |

## References

- `AGENTS.md` — Agent workflow principles
- `.agents/skills/task-decomposition/SKILL.md` — Breaking tasks into atomic goals
- `agents-docs/HARNESS.md` — Stack interaction and quality gates
