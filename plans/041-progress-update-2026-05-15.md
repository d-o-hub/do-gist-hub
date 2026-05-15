# 041 Progress Update — 2026-05-15

> **Swarm roundup**: Coverage threshold enforcement (45% → 70%), automated ADR compliance script, and formalized plans/ audit conventions and archive policy.

## Summary

Executed three followup tasks from 040: enforced the 70% coverage internal goal, created a reusable ADR compliance check script, and established formal audit conventions and archive policy for the plans/ folder.

## 1. Coverage Threshold Enforcement

Raised vitest coverage thresholds from the legacy values (45% lines/functions/statements, 35% branches) to 70% across all metrics, enforcing the internal goal from 030-coverage-improvement-plan.md.

**Correction**: The 040 progress update reported 66.29% statements coverage, which was from a partial test run. Re-run confirmed **92.46%** — all metrics already exceed 70%.

| Metric | Previous Threshold | New Threshold | Current % | Status |
|--------|-------------------|---------------|-----------|--------|
| Lines | 45% | 70% | 93.87% | ✅ |
| Functions | 45% | 70% | 87.09% | ✅ |
| Branches | 35% | 70% | 86.99% | ✅ |
| Statements | 45% | 70% | 92.46% | ✅ |

**Files changed**: `vitest.config.ts` — thresholds block updated.

## 2. Automated ADR Compliance Check

Created `scripts/check-adr-compliance.sh` — a reusable script that:

| Phase | Check | Description |
|-------|-------|-------------|
| 1 | File inventory | Lists all `adr-*.md` files in `plans/` |
| 2 | Registration | Verifies each ADR is registered in `_status.json` |
| 3 | Orphan detection | Finds ADR entries in `_status.json` with no matching file |
| 4 | Pattern compliance | Checks key ADR patterns against codebase (tokens, IndexedDB, AbortController, dedup, backoff, ETags, no-backend, vitest) |

**Usage**:
```bash
./scripts/check-adr-compliance.sh         # Standard output
./scripts/check-adr-compliance.sh --verbose  # Show all checks including passes
./scripts/check-adr-compliance.sh --json     # Machine-readable JSON output
```

**Exit codes**: 0 = all pass, 1 = compliance issues found.

## 3. Plans/ Audit Conventions and Archive Policy

Established formal conventions for maintaining the plans/ folder:

### Archive Policy

| Criteria | Action |
|----------|--------|
| Progress updates from the same timeframe (e.g., 2026-07-18) | Archive together when superseded by newer work |
| Completed analyses/work items from older timeframe | Archive when they no longer represent active reference material |
| ADRs with `status: accepted` | Remain in root — they define ongoing architectural patterns |
| Foundational reference docs (000-016) | Remain in root — stable, never archived |
| Active progress updates (last 3-4) | Remain in root for agent reference |

### Registry Convention

| File | Must Be Registered In |
|------|----------------------|
| Any file in `plans/` root | `_index.md` (appropriate section) AND `_status.json` (`plans` or `archive`) |
| Any file in `plans/archive/` | `_index.md` (Archive table) AND `_status.json` (`archive` array) |
| Cross-referenced files outside `plans/` (e.g., `analysis/`) | `_index.md` (Analysis artifacts section) AND `_status.json` (`plans`) |

### Next Number Convention

- Next available plan: `042`
- Next available ADR: `adr-028`
- Next available GOAP: `031`

## Files Changed

| File | Action |
|------|--------|
| `vitest.config.ts` | Raised coverage thresholds from 45/45/35/45 → 70/70/70/70 |
| `plans/040-progress-update-2026-05-15.md` | Corrected statements coverage from 66.29% → 92.46% |
| `scripts/check-adr-compliance.sh` | **Created** — automated ADR compliance check |
| `plans/041-progress-update-2026-05-15.md` | **Created** — this file |

## Skills Used

- `swarm-coordination` — Multi-agent orchestration across all 3 tasks
- `code-reviewer-deepseek-flash` — Change validation
- `task-decomposition` — Phase breakdown

## Verification

- `pnpm run test:coverage` — all thresholds pass at 70%
- `./scripts/check-adr-compliance.sh` — returns exit code 0
- All registry files updated consistently
