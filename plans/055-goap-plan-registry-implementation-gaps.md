# 055 — GOAP: Plan Registry Hygiene & Implementation Gaps

> **Date**: 2026-05-26
> **Type**: GOAP Plan
> **Status**: Complete
> **Related**: `054-upstream-template-impact-analysis.md`, `adr-030-github-pages-deployment.md`, `052-goap-ui-ux-modernization-completion.md`

---

## Context

A comprehensive GOAP analysis of the plan registry and codebase revealed several issues:

**Plan registry hygiene**: `nextAvailable.goap` was stuck at `"032"` despite 8 subsequent GOAP plans (040, 041, 042, 045, 046, 048, 050, 052). Plan 054 was stored as a top-level key in `_status.json` instead of inside the `plans` object, breaking the JSON schema. ADR-030 was "proposed" despite all code actions implemented.

**Status inconsistency**: Plan 047 (all code actions done) was "active"/"Draft". Plan 052 file header said "Active 🟢" while `_status.json` said "complete". Plan 053 was "Active 🟢" in `_index.md` but "complete" in `_status.json`.

**Implementation gap**: Plan 052 Action 5 (sync badge inline hex colors → CSS tokens) had CSS infrastructure present but the TypeScript component never updated to use it — inline `color: #3b82f6` etc. overrode the theme-aware CSS classes.

---

## GOAP Actions

| # | Action | Status |
|---|--------|--------|
| 1 | Fix `nextAvailable.goap` from `"032"` → `"055"` in `_status.json` | ✅ |
| 2 | Fix Plan 054 `_status.json` schema — move from top-level key into `plans` object | ✅ |
| 3 | Promote ADR-030 from "proposed" → "accepted" in `_status.json` and `_index.md`; update summary noting A8 (repo settings) outstanding | ✅ |
| 4 | Mark Plan 047 as "complete" (all code actions done; F-Droid MR tracked externally) in `_status.json`, `_index.md`, and file header | ✅ |
| 5 | Mark Plan 053 as "complete" in `_index.md` (was "Active 🟢") | ✅ |
| 6 | Unify Plan 052 file header status from "Active 🟢" → "Complete" | ✅ |
| 7 | Fix sync badge inline `color: #3b82f6`/`#f97316`/`#ef4444` → CSS token classes `.sync-status-pending`/`.sync-status-conflict`/`.sync-status-error` in `gist-card.ts`; update tests | ✅ |

---

## Verification

```
pnpm run test:unit     → 1016 passed (54 files)
pnpm run typecheck     → zero errors
pnpm run lint          → zero errors
./scripts/quality_gate.sh → all gates passed
```

---

## Remaining Work

- **GitHub Pages activation**: ADR-030 Action A8 (enable Pages in repo settings) — requires manual repo admin action, not code
- **Upstream sync Phase A**: Script hardening from Plan 054 tracked in plan 056
