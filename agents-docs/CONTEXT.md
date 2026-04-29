# Context Management & Back-Pressure

> Preventing context rot, managing token budgets, and resuming work efficiently across agent sessions.

## Context Rot Prevention

Context rot occurs when an agent accumulates irrelevant or contradictory information, leading to degraded decision-making. Common causes:

| Cause | Symptom | Prevention |
|-------|---------|------------|
| **Task switching** | Previous task details leak into new work | `/clear` between unrelated tasks |
| **Long sessions** | Agent forgets early constraints | Summarize and checkpoint every 30 min |
| **Over-scoping** | Too many files open at once | Close files with `read` limit; re-read on demand |
| **Contradictory docs** | AGENTS.md vs. code mismatch | Stop → Document discrepancy → Wait for confirmation |

## When to `/clear`

| Scenario | Action |
|----------|--------|
| Switching from feature A to feature B | `/clear` → paste new task |
| After a major commit | `/clear` → summarize what was done |
| Context feels "muddy" | `/clear` → re-read only relevant files |
| Starting a new sub-agent handoff | `/clear` in sub-agent → paste complete context snapshot |
| Contradiction discovered | `/clear` → re-read AGENTS.md + relevant plans |

**Rule**: `/clear` is cheap. Unclear context is expensive.

## Token Budget Awareness

### Estimation Guide

| Operation | Approximate Tokens | Tip |
|-----------|-------------------|-----|
| Read `AGENTS.md` | ~800 | Read once per session; don't re-read unless updated |
| Read `src/config/app.config.ts` | ~100 | Always read before config changes |
| Read single source file (400 lines) | ~600 | Use `limit` and `offset` for large files |
| Read `SKILL.md` | ~300 | Read skill once per task, not per sub-task |
| `glob` result | ~50 | Cheap; use to find files before reading |
| `grep` result | ~100 | Cheap; use to pinpoint edits before reading |

### Budgeting Rules

1. **Read strategically** — `glob` + `grep` first, then `read` only the files you need
2. **Use offsets** — For files near the 500-line limit, read the relevant section with `offset`/`limit`
3. **Cache in memory** — Don't re-read files that haven't changed in the same session
4. **Delegate heavy analysis** — Sub-agents get a fresh budget; use for discovery/grep-heavy tasks

## Summarize and Resume

### Mid-Task Checkpoint

When pausing work (e.g., after a commit, before `/clear`):

```markdown
## Checkpoint: [Feature Name]

### Completed
- [x] Step 1: ...
- [x] Step 2: ...

### In Progress
- [ ] Step 3: ... (blocked on X)

### Key Decisions
- Chose approach Y because Z
- Deferred item W to v2

### Files Modified
- `src/...`
- `tests/...`

### Next Steps
1. ...
2. ...
```

### Resume Protocol

```
1. /clear
2. Paste checkpoint summary
3. Re-read AGENTS.md (if rules may have changed)
4. Re-read modified files from checkpoint
5. Continue with next step
```

## Context Snapshot for Sub-Agents

When delegating, provide a **minimal but complete** snapshot:

```markdown
## Context Snapshot

**Task**: One-line goal
**Scope**: v1 only (no OAuth, no real-time)
**Constraints**:
- Mobile-first CSS
- Tokens only (no hardcoded values)
- Strict TypeScript (no `any`)
**Key Files**:
- `src/stores/gist-store.ts` — state logic
- `src/services/db/repository.ts` — data layer
- `src/components/gist/` — UI components
**Done**: [x] schema updated, [ ] UI pending
**Verify**: Quality gate must pass before returning
```

## Back-Pressure Signals

Recognize when context is becoming unmanageable:

| Signal | Response |
|--------|----------|
| Agent starts repeating itself | `/clear` and summarize |
| Agent contradicts earlier decision | Re-read the ADR or decision record |
| Agent suggests v2 features | Re-read `AGENTS.md` scope section |
| Agent uses hardcoded values | Re-read token system rules |
| Agent proposes unsafe patterns | Re-read security boundaries |

## References

- `AGENTS.md` — Stop conditions and workflow rules
- `agents-docs/SUB-AGENTS.md` — Handoff templates and synthesis
- `agents-docs/HARNESS.md` — Quality gate integration
