# 042 — GOAP: Plans Completion Sprint

> **Date**: 2026-05-17
> **Type**: GOAP Plan
> **Status**: Active
> **Related**: `041-goap-release-signing-and-plan040-completion.md`, `040-goap-phase-d-039-phase-bc-completion.md`, `adr-015-upstream-template-adaptation.md`, `019-swarm-analysis-codebase-improvements.md`

---

## Context

A comprehensive audit of all 45+ plan files revealed ~10 gaps between plan status and actual implementation. This sprint closes all P0 gaps: stale build artifacts, incorrect status markers, untracked ADR status, SW cache hygiene, and CI instrumentation holes.

---

## GOAP

### Goal: Close all P0 plan-audit gaps and update registries.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 1 | Rebuild `public/design-tokens.css` from updated TS source | `src/tokens/css-variables.ts` has OKLCH shadow tokens | Build artifact matches source; PWA precaches correct values | Low |
| 2 | Mark Plan 041 complete + fix Plan 040 stale "Active" header | Plan 041 actions merged via PR #174 | Registry accuracy restored | XS |
| 3 | Promote ADR-015 from "Proposed" to "Accepted" | All Phase 1-3, most 4-6 items implemented via plans 019/038 | Status reflects reality | XS |
| 4 | Add TTL-based cache entry expiration to service worker | SW has version-based cleanup on activate | Old entries evicted after 30 days even if cache version unchanged | Low |
| 5 | Wire Lighthouse CI into CI workflow | `.lighthouserc.json` exists but unused | Automated perf/a11y budget enforcement in CI | Low |
| 6 | Create progress update and PR | All actions pass quality gate | Documented, reviewed, merged | Low |

---

## Implementation Details

### Files Modified

| File | Action | Purpose |
|------|--------|---------|
| `public/design-tokens.css` | REGENERATE | Sync stale build artifact with OKLCH source |
| `plans/041-goap-release-signing-and-plan040-completion.md` | EDIT status header | "Active" → "Complete" |
| `plans/040-goap-phase-d-039-phase-bc-completion.md` | EDIT status header | "Active" → "Complete" |
| `plans/adr-015-upstream-template-adaptation.md` | EDIT status header | "Proposed" → "Accepted"; add implementation notes |
| `plans/_status.json` | UPDATE | Mark 041 complete, update ADR-015 |
| `plans/_index.md` | UPDATE | Reflect new statuses |
| `src/sw/sw.ts` | EDIT | Add TTL-based cache entry cleanup |
| `.github/workflows/ci.yml` | EDIT | Add Lighthouse CI job |

---

*Created: 2026-05-17. Status: Active.*
