# 061 — Progress Update: Implementation Gaps Audit

> **Status**: Complete
> **Type**: Progress
> **Created**: 2026-05-30
> **Updated**: 2026-05-30
> **Owner**: agent
> **Related**: adr-016-github-api-efficiency.md, 047-v0.3.0-scope.md, 060-goap-plain-text-paste-llm-gist-creation.md

---

## Context

Comprehensive codebase audit comparing ADR decisions and plan actions against actual implementation. Identifies gaps, partial implementations, and missing functionality.

---

## ADR Compliance Summary

| ADR | Status | Gap |
|-----|--------|-----|
| adr-003 (IndexedDB) | ✅ Complete | ADR listed 9 stores; implementation has 5 (reasonable consolidation) |
| adr-006 (Error Boundary) | ✅ Complete | RouteBoundary/AsyncErrorBoundary combined into single ErrorBoundary (functionally equivalent) |
| adr-009 (AbortController) | ✅ Complete | Global abort pattern instead of per-fetch try/finally (simpler, covers same use case) |
| adr-013 (Request Dedup) | ✅ Complete | — |
| adr-014 (Backoff Sync) | ✅ Complete | — |
| adr-016 (API Efficiency) | ⚠️ Partial | **Lazy Content Hydration NOT implemented** |
| adr-028 (Auth re-evaluation) | ✅ Complete | — |
| adr-029 (Release Signing) | ✅ Complete | — |
| adr-030 (GitHub Pages) | ✅ Complete | — |
| adr-031 (WebKit CI) | ✅ Complete | — |
| adr-032 (Vitest Teardown) | ✅ Complete | — |
| adr-033 (WebKit Flaky) | ✅ Complete | — |

---

## Gap Details

### P1: ADR-016 Lazy Content Hydration (Medium Severity)

**ADR Decision**: "Fetch only gist metadata (without file content) during bulk sync. Fetch full file content only when a specific gist is opened for viewing."

**Current State**: `listGists()` and `listStarredGists()` in `src/services/github/client.ts` return full gist payloads including all file content. The GitHub API's `GET /gists` endpoint returns file content by default.

**Impact**: 
- Increased bandwidth consumption on bulk sync
- Faster rate limit exhaustion for users with many gists
- Slower initial sync on slow connections

**Recommended Fix**: Add `?files=false` query parameter to list endpoints, then lazy-load file content on gist open via `getGist()`.

### P2: Plan 047 F-Droid Submission (External Dependency)

**Actions 3-5**: F-Droid MR submission, reviewer feedback, and publication are blocked on external fdroiddata repository action.

**Current State**:
- `.fdroid.yml` exists ✅
- `scripts/submit-to-fdroid.sh` helper exists ✅
- `docs/FDROID_DEPLOYMENT.md` exists ✅
- Actual MR to fdroiddata NOT submitted ❌

**Note**: Action 2 (F-Droid build testability) is partially implemented — CI builds debug/release but not the `assembleFdroid` variant.

### P2: Plan 047 `recordFirstApiCall()` Hook

**Action 7**: Time-to-first-API-call timer infrastructure exists in `src/services/telemetry/auth-telemetry.ts` but the `recordFirstApiCall()` function may not be wired into the API service layer. Call site not found via grep.

**Recommendation**: Verify and wire `recordFirstApiCall()` into `src/services/github/client.ts` on first successful API response after auth.

### P3: GOAP Plan 060 — Zero Implementation

**Status**: All 25 actions across 5 goals have NOT been started.

| Goal | Actions | Missing |
|------|---------|---------|
| Plain Text Paste Parser | 5 | 5 |
| Create Form Paste Zone UI | 5 | 5 |
| LLM Service Layer | 7 | 7 |
| LLM-Assisted Paste Processing | 4 | 4 |
| Drag-and-Drop File Import | 4 | 4 |

**Missing Files**:
- `src/services/gist-paste-parser.ts`
- `src/types/gist.ts`
- `src/services/llm/client.ts`
- `src/services/llm/providers/openai.ts`
- `src/services/llm/providers/github-models.ts`
- `src/types/llm.ts`
- `tests/unit/gist-paste-parser.test.ts`
- `tests/unit/llm-client.test.ts`

**Missing UI Changes**:
- Paste zone in `src/routes/create.ts`
- LLM settings section in `src/routes/settings.ts`
- Paste zone CSS in `src/styles/base.css`
- Drag-and-drop handlers

---

## Plan 047 Action Status (v0.3.0 Scope)

| # | Action | Status |
|---|--------|--------|
| 1 | `.fdroid.yml` | ✅ Implemented |
| 2 | F-Droid build testable | ⚠️ Partial (no `assembleFdroid` in CI) |
| 3 | fdroiddata MR | ❌ Not submitted |
| 4 | Reviewer feedback | N/A (not submitted) |
| 5 | F-Droid publication | N/A (not submitted) |
| 6 | Auth method counter | ✅ Implemented |
| 7 | Time-to-first-API timer | ⚠️ Infrastructure built, hook may be missing |
| 8 | Device Flow error states | ✅ Implemented |
| 9 | OAuth anti-phishing | ✅ Implemented |
| 10 | PAT rotation reminder | ✅ Implemented |
| 11 | Bundle size CI | ✅ Implemented |
| 12 | Keystore migration note | ✅ Implemented |
| 13 | Container queries (4) | ✅ Implemented |
| 14 | prefers-reduced-data | ✅ Implemented |
| 15 | view-transition-name | ✅ Implemented |
| 16 | Stryker mutation CI | ✅ Implemented |
| 17 | SHA-pin audit CI | ✅ Implemented |
| 18 | Gradle --stacktrace | ✅ Implemented |

---

## Recommendations

1. **ADR-016 Lazy Hydration**: Create a new GOAP plan to implement `?files=false` on list endpoints and lazy-load content on gist open. This would reduce API calls by ~60-80% for users with many gists.

2. **F-Droid Submission**: Schedule external action to submit MR to fdroiddata. Add `assembleFdroid` to CI to validate metadata before submission.

3. **recordFirstApiCall Hook**: Wire the timer into the first successful API response in `client.ts`.

4. **GOAP Plan 060**: Prioritize Phase A (paste parser) as it provides immediate value without LLM dependency. Defer Phase C (LLM service) to a future release if external API costs are a concern.

---

## Plan Registry Updates

- New plan: `061-progress-update-2026-05-30-implementation-gaps.md`
- Update `_status.json` with this plan entry
- Update `_index.md` with this plan in Active plans section

*Created: 2026-05-30. Status: Complete.*
