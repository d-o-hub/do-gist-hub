# Progress Update — PR #166: CI Fix, Plans Registration, Merge

> **Date**: 2026-05-15
> **Skills Used**: `swarm-coordination`, `code-reviewer-deepseek-flash`, `task-decomposition`
> **Related Plans**: `adr-027-ci-node24-android-hardening.md`, `037-progress-update-2026-07-18.md`
> **Status**: ✅ Complete

---

## Executive Summary

Resolved all open issues from PR #166 and merged to `main`. The EnvironmentTeardownError was traced to its correct root cause (conflict-detector module via conflict-resolution), not focus-trap as initially assumed. ADR number collision fixed. All missing plans registered.

### Key Achievements

- **EnvironmentTeardownError fixed**: 20 errors fully resolved. Root cause was `conflict-detector.ts` loaded via `conflict-resolution.ts` after env teardown — added to eager `beforeAll` imports along with `focus-trap`.
- **Optimized per code review**: Removed overly broad `gist-card.ts` import from `beforeAll`, keeping only leaf dependencies that actually trigger the error.
- **ADR number collision fixed**: `adr-015-ci-node24-android-hardening.md` → `adr-027-ci-node24-android-hardening.md` (ADR-015 was already taken by `adr-015-upstream-template-adaptation.md`).
- **2 unregistered plans registered** in `_status.json` and `_index.md`: `adr-027-ci-node24-android-hardening.md` and `037-progress-update-2026-07-18.md`.
- **3 external references updated**: `.github/workflows/audit-actions.yml`, `agents-docs/fixes/2026-07-17-ci-node24-migration.md`, `AGENTS.md`.
- **PR #166 merged**: All CI checks green, 941 tests pass, 0 errors.

---

## Swarm Execution

### Phase 1: Context Gathering

| Agent | Task | Result |
|-------|------|--------|
| basher | Quality gate baseline | All gates pass cleanly |
| code-searcher | Reference search for adr-015, 037 | 2 external references found (audit workflow, migration fix doc) |
| file-picker/read | plans/ structure audit | ADR-015 collision detected; 037 and adr-015 not in registries |

### Phase 2: Implementation — PR #166 First Commit

| Agent | Task | Result |
|-------|------|--------|
| basher | Rename adr-015 → adr-027 | File moved successfully |
| str_replace | Update audit-actions.yml reference | adr-015 → adr-027 |
| str_replace | Update migration fix doc reference | adr-015 → adr-027 |
| str_replace | Update ADR title in adr-027 | ADR-015 → ADR-027 |
| str_replace | Register in _status.json and _index.md | Both files updated |
| str_replace | Update AGENTS.md reference table | 037 entry added |

### Phase 3: Implementation — PR #166 Second Commit (Optimization)

| Agent | Task | Result |
|-------|------|--------|
| code-reviewer | Review beforeAll imports | Suggested removing overly broad gist-card import |
| str_replace | Narrow beforeAll imports | Removed gist-card, added conflict-detector (actual root cause) |
| basher | Test validation | 941/941 tests, 0 errors ✅ |
| basher | Typecheck + lint | Clean ✅ |

### Phase 4: Merge

| Agent | Task | Result |
|-------|------|--------|
| basher | Commit + push | 2 commits pushed to feat/fix-ci-and-register-missing-plans |
| gh CLI | Merge PR #166 | Merged, branch auto-deleted |

---

## Root Cause Analysis: EnvironmentTeardownError

**Initial assumption**: error from `focus-trap.ts` (leaf in `home → gist-card → dialog → focus-trap` chain).

**Actual root cause**: error from `conflict-detector.ts` imported by `conflict-resolution.ts` (static import at line 8). The `vi.mock` for `conflict-resolution` doesn't import `conflict-detector`, but the eager `import()` in `beforeAll` loads the real module. Adding `conflict-detector` to the eager imports ensures it's cached before env teardown.

**Lesson**: Always check the full error callstack to identify the exact leaf module — don't assume based on the static import chain alone.

---

## Files Modified

| File | Action | Purpose |
|------|--------|---------|
| `tests/unit/app.test.ts` | MODIFIED | Added conflict-detector to eager beforeAll imports; removed gist-card; updated comments |
| `plans/adr-015-ci-node24-android-hardening.md` | RENAMED → `adr-027-ci-node24-android-hardening.md` | Fixed ADR number collision |
| `.github/workflows/audit-actions.yml` | MODIFIED | Reference updated: adr-015 → adr-027 |
| `agents-docs/fixes/2026-07-17-ci-node24-migration.md` | MODIFIED | Reference updated: adr-015 → adr-027 |
| `plans/_status.json` | MODIFIED | Registered adr-027 and 037; updated nextAvailable |
| `plans/_index.md` | MODIFIED | Added adr-027 and 037 to tables; updated next available numbers |
| `AGENTS.md` | MODIFIED | Added 037 to reference table |

---

## Next Available Numbers

- **Next ADR**: `adr-028`
- **Next plan**: `039`

*Last updated: 2026-05-15*
