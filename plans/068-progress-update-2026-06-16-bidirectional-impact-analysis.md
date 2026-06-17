# Progress Update: Bidirectional Template Impact Analysis (068)

> **Date**: 2026-06-16
> **Branch**: `main`
> **Related**: `analysis/bidirectional-impact-github-template-2026-06-16.md`, `plans/054-upstream-template-impact-analysis.md`, `plans/056-goap-upstream-sync-phase-a.md`, `plans/adr-015-upstream-template-adaptation.md`

---

## Executive Summary

First **bidirectional** impact analysis between `do-gist-hub` and the upstream `github-template-ai-agents` template, executed as a 4-agent parallel swarm with handoff synthesis. Updates Plan 054's forward analysis and adds the first systematic reverse analysis (gist-hub → template).

### Key Achievements

- **Forward (template → gist-hub) delta refreshed** vs v0.2.9: 13/21 items PRESENT, 1 PARTIAL, 7 MISSING. Biggest remaining gaps: Python eval framework, `secure-invite-and-access` skill, `code-review-assistant` skill.
- **Reverse (gist-hub → template) catalogued**: 9 P0 + 13 P1 generic primitives. Highest leverage: action-pin lifecycle (3-workflow system), composable quality gate, Vite config→derivatives plugin set, multi-agent handoff schema, 4 CI-debugging ADRs.
- **Domain outgrowth documented**: our 5 domain skills (`github-gist-api`, `offline-indexeddb`, `pwa-shell`, `capacitor-android`, `performance-budgeting`) are strictly ahead of the template with no equivalent upstream.
- **9 skills + 4 ADRs** identified as domain-agnostic contribution candidates.

---

## Swarm Agent Coordination

### Agent Deployment

| Agent | Type | Task | Status | Result |
|---|---|---|---|---|
| Agent 1 | explore | Forward delta (skills/docs/scripts/workflows) | SUCCESS | 13/21 present, 7 missing, 1 partial; priority-ordered |
| Agent 2 | explore | Forward domain-skill overlap analysis | SUCCESS | Zero template overlap on our 5 domain skills |
| Agent 3 | explore | Reverse: skills & ADRs (16 skills, 10 ADRs) | SUCCESS | 7 Tier-1 skills + 6 ADRs identified |
| Agent 4 | explore | Reverse: scripts, workflows, configs | SUCCESS | 9 P0 + 13 P1 generic primitives manifest |

### Handoff Coordination

```
Agent 1 (forward delta)   ─┐
Agent 2 (forward domain)  ─┤
Agent 3 (reverse skills)  ─┼─> Synthesis (this document + analysis/)
Agent 4 (reverse scripts) ─┘
```

All four explore agents ran in **parallel** (Pattern 1). The synthesis in `analysis/bidirectional-impact-github-template-2026-06-16.md` is the manual handoff step (Pattern 2).

### Methodological Constraint

`web_fetch` and `gh`/`curl` were unavailable (insufficient credits, missing binaries). All findings derived from local analysis: Plan 054 (template v0.2.9), Plan 056 (Phase A execution), ADR-015, and direct read of 31 skills, 33 ADRs, 23 scripts, 22 workflows. **A follow-up should re-run with a fresh upstream fetch** to catch any template changes since v0.2.9.

---

## Implementation Details

### Files Created

| File | Action | Purpose |
|---|---|---|
| `analysis/bidirectional-impact-github-template-2026-06-16.md` | CREATED | Full bidirectional impact analysis with P0/P1/P2 priorities and recommendations |
| `plans/068-progress-update-2026-06-16-bidirectional-impact-analysis.md` | CREATED | This progress update |

### Files Referenced (no changes)

- `plans/054-upstream-template-impact-analysis.md` — forward v0.2.9 baseline
- `plans/056-goap-upstream-sync-phase-a.md` — Phase A execution
- `plans/adr-015-upstream-template-adaptation.md` — Phases 1-6 roadmap

---

## What Was Learned

### Agent Type Lessons (per swarm-coordination skill)

- **explore agents worked well for parallel grep/glob/read** — 4 agents in parallel completed in single round.
- **No explore agent attempted bash** — matched the agent-type discipline. Pattern from earlier sessions (see Plan 057 lessons) re-confirmed.
- **Handoff synthesis was the bottleneck** — 4 rich outputs needed careful deduplication. The next improvement would be: a 5th **general** agent that takes the 4 outputs as input and produces a single consolidated document automatically. Out of scope for this run.

### Substantive Lessons

- **The template's v0.2.9 domain-agnostic stance is a liability for PWA projects.** We have outgrown it on domain skills.
- **The Python eval framework is the only major technical divergence** with the template. Rewriting in TS is feasible and preferred.
- **We are a productive divergence**: contribution to template is healthy, not just consumption.

---

## Open Questions (require maintainer decision)

1. **Python vs Node.js eval framework** — adopt upstream Python or rewrite in TS? (See analysis §1.4.)
2. **PR vs fork** for upstream contributions?
3. **Skill certification badge** proposal — worth the coordination cost?

---

## Next Steps

1. `ask_user_question` to the maintainer on the Python/TS eval decision.
2. Verify the 1 PARTIAL and 1 MISSING-with-partial-coverage items.
3. On maintainer approval, create `069-goap-upstream-contribution-phase-1.md` (P0 reverse handoff) and `070-goap-eval-framework-rewrite.md` (forward adoption).

---

## Plan Registry

- Update `_status.json` with this plan (next available: 068).
- Update `_index.md` row.
- This is a **progress update**, not a new GOAP plan; no new plan number needed.
