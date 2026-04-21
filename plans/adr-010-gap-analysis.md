# ADR-010: Codebase Gap Analysis

**Status**: Active
**Date**: 2026-04-21
**Deciders**: Architect, Code Review Agent

## Executive Summary

This ADR documents gaps identified between the documented architecture, planned features, and actual implementation across features, documentation, coding workflow, AGENTS.md instructions, and skills.

---

## 1. Missing Features (v1 Scope Discrepancies)

### 1.1 Not Implemented

| Feature                    | Status        | Location                     | Priority |
| -------------------------- | ------------- | ---------------------------- | -------- |
| **Export/Import Data**     | ❌ Missing    | v1 scope lists but no code   | High     |
| **Fork Gist UI**           | ❌ Missing    | Button exists but no handler | Medium   |
| **Conflict Resolution UI** | ⚠️ Incomplete | Detection exists, no UI      | Medium   |

### 1.2 Partially Implemented

| Feature              | Status   | Details                                      |
| -------------------- | -------- | -------------------------------------------- |
| **Gist Edit**        | ⚠️ Works | No file rename/delete for existing files     |
| **View Transitions** | ⚠️ Basic | Limited to navigation, no micro-interactions |

### 1.3 Implementation Details

```typescript
// src/components/gist-detail.ts:90 - Fork button exists but no handler
<button class="btn btn-ghost" data-action="fork">🍴 FORK</button>

// src/services/github/client.ts:304 - API method exists
export async function forkGist(id: string): Promise<GitHubGist>

// But no event binding in bindDetailEvents for fork action
```

---

## 2. Architecture vs Implementation Gaps

### 2.1 Missing Directories

| Documented Path      | Status     | Actual Location                                  |
| -------------------- | ---------- | ------------------------------------------------ |
| `src/routes/`        | ❌ Missing | Routes embedded in `app.ts`                      |
| `src/lib/utilities/` | ❌ Missing | Utils in `src/utils/`                            |
| `src/lib/errors/`    | ❌ Missing | Errors in `src/services/github/error-handler.ts` |
| `src/lib/logging/`   | ❌ Missing | Logging in `src/services/security/logger.ts`     |

### 2.2 Missing Files

| Documented File                 | Status     | Alternative              |
| ------------------------------- | ---------- | ------------------------ |
| `src/stores/auth-store.ts`      | ❌ Missing | Auth logic in `app.ts`   |
| `src/stores/ui-store.ts`        | ❌ Missing | UI state in `app.ts`     |
| `src/services/db/schema.ts`     | ❌ Missing | Schema inline in `db.ts` |
| `src/services/db/migrations.ts` | ❌ Missing | No migrations            |

### 2.3 Recommendations

**Option A**: Update `plans/002-architecture.md` to reflect actual structure
**Option B**: Refactor to match documented architecture (larger effort)
**Decision**: Recommend Option A for v1, Option B for v2

---

## 3. Documentation Gaps

### 3.1 Missing User Documentation

| Document                  | Purpose                    | Priority |
| ------------------------- | -------------------------- | -------- |
| `README.md`               | App overview, setup, usage | High     |
| `docs/USER_GUIDE.md`      | End-user documentation     | Medium   |
| `docs/API_INTEGRATION.md` | GitHub API specifics       | Low      |

### 3.2 Missing Developer Documentation

| Document               | Purpose                           | Priority |
| ---------------------- | --------------------------------- | -------- |
| `CONTRIBUTING.md`      | Contribution guidelines           | High     |
| `docs/ARCHITECTURE.md` | Detailed architecture walkthrough | Medium   |
| `docs/TESTING.md`      | Testing strategy and coverage     | Medium   |
| `docs/DEPLOYMENT.md`   | Deployment process                | Low      |

### 3.3 Gap in agent-docs/

```
agent-docs/
├── patterns/       # ✅ Exists (3 files)
├── issues/         # ✅ Exists (7 issues documented)
├── fixes/          # ⚠️ Empty - no documented fixes
└── detected/       # ⚠️ Empty - no detected issues logged
```

**Recommendation**: Populate `fixes/` and `detected/` directories as part of self-learning workflow.

---

## 4. AGENTS.md Instruction Gaps

### 4.1 Missing Workflow Instructions

| Workflow                  | Current State | Recommendation                     |
| ------------------------- | ------------- | ---------------------------------- |
| **Feature addition**      | Generic       | Add specific steps for v1 features |
| **Bug fix process**       | Generic       | Add conflict resolution workflow   |
| **Release process**       | Missing       | Add v1 -> v2 migration path        |
| **API changes**           | Missing       | Add GitHub API integration steps   |
| **UI component creation** | Generic       | Add token-first component workflow |

### 4.2 Suggested Additions

```markdown
## Feature Development Workflow

1. Check v1 scope (plans/001-v1-scope.md)
2. If v2 feature, document in plans/future/
3. Use skill: `triz-analysis` before implementation
4. Create ADR for architectural decisions
5. Implement following token-first architecture
6. Add tests: unit + integration + visual
7. Run quality gate: ./scripts/quality_gate.sh
8. Create responsive screenshots at 320/768/1536

## Conflict Resolution Workflow

1. Check sync-conflicts in IndexedDB metadata
2. Display conflict details to user
3. Offer: local-wins | remote-wins | manual merge
4. Apply resolution strategy
5. Clear conflict from queue
6. Update UI to reflect resolution
```

### 4.3 Missing Validation Rules

| Rule                | Current                | Recommended                        |
| ------------------- | ---------------------- | ---------------------------------- |
| E2E test coverage   | `test:*` scripts exist | Add minimum coverage % requirement |
| Accessibility test  | `test:a11y` exists     | Add WCAG level requirement         |
| Performance budgets | Documented             | Add enforcement in CI              |

---

## 5. Skills Gaps

### 5.1 Missing Domain-Specific Skills

| Skill                    | Purpose                            | Priority |
| ------------------------ | ---------------------------------- | -------- |
| `offline-workflow`       | Offline-first development patterns | High     |
| `github-api-integration` | GitHub Gist API specifics          | Medium   |
| `conflict-resolution`    | Sync conflict handling             | Medium   |
| `data-export-import`     | User data portability              | Low      |

### 5.2 Existing Skills Not Utilized

| Skill                    | Coverage   | Gap                                     |
| ------------------------ | ---------- | --------------------------------------- |
| `github-gist-api`        | ✅ Present | No execution coverage evidence          |
| `offline-indexeddb`      | ✅ Present | Implementation exists but docs outdated |
| `memory-leak-prevention` | ✅ Present | No test coverage verification           |

### 5.3 Skill Quality Issues

```bash
# Check skill coverage
grep -r "Coverage" .agents/skills/*/SKILL.md
# Result: Most skills lack coverage verification
```

---

## 6. Test Coverage Gaps

### 6.1 Stub Tests (Need Real Implementation)

| File                                      | Issue      |
| ----------------------------------------- | ---------- |
| `tests/browser/memory-stubs.spec.ts`      | Stubs only |
| `tests/browser/performance-stubs.spec.ts` | Stubs only |
| `tests/browser/security-stubs.spec.ts`    | Stubs only |

### 6.2 Missing Test Categories

| Category                    | Status     | Recommendation           |
| --------------------------- | ---------- | ------------------------ |
| **Export/Import E2E**       | ❌ Missing | Add for data portability |
| **Conflict Resolution E2E** | ❌ Missing | Add for offline sync     |
| **Fork Operation E2E**      | ❌ Missing | Add for completeness     |
| **Rate Limit Handling**     | ❌ Missing | Add for API resilience   |
| **Error Recovery E2E**      | ❌ Missing | Add for user experience  |

### 6.3 Test Quality Issues

```typescript
// tests/011-testing-strategy.md says:
// "Missing coverage for security, performance, memory"
// But no action plan to address
```

---

## 7. Plans Quality Issues

### 7.1 Minimal Plans

| Plan                      | Lines | Issue                 |
| ------------------------- | ----- | --------------------- |
| `011-testing-strategy.md` | 13    | Too brief, no metrics |
| `013-release-plan.md`     | 12    | No deployment steps   |

### 7.2 Outdated Information

| Plan                  | Issue                             |
| --------------------- | --------------------------------- |
| `002-architecture.md` | Directory structure doesn't match |
| `005-data-model.md`   | Minimal (283 bytes)               |
| `006-sync-model.md`   | Minimal (327 bytes)               |

---

## 8. Code Quality Observations

### 8.1 Good Patterns Found

- Token-driven CSS architecture ✅
- AbortController for lifecycle management ✅
- IndexedDB with sync queue ✅
- Structured error handling ✅
- Rate limit tracking ✅

### 8.2 Areas for Improvement

| Area                   | Issue              | Recommendation            |
| ---------------------- | ------------------ | ------------------------- |
| **Type safety**        | Some `any` escapes | Add strict return types   |
| **Route organization** | All in `app.ts`    | Extract to route modules  |
| **State management**   | Mixed patterns     | Standardize store pattern |
| **Test coverage**      | Stub tests         | Implement real tests      |

---

## 9. Action Items

### 9.1 High Priority (v1 blockers)

1. ❌ Implement export/import functionality
2. ❌ Add fork gist feature (wire up existing API)
3. ❌ Add conflict resolution UI
4. ❌ Update `011-testing-strategy.md` with metrics and coverage
5. ❌ Implement real tests for stub files

### 9.2 Medium Priority (v1 polish)

1. ⚠️ Update `002-architecture.md` to match implementation
2. ⚠️ Add `CONTRIBUTING.md` and `README.md`
3. ⚠️ Populate `agent-docs/fixes/` and `agent-docs/detected/`
4. ⚠️ Add missing workflow sections to AGENTS.md

### 9.3 Low Priority (v2 planning)

1. Create `plans/future/v2-features.md`
2. Create domain-specific skills
3. Refactor routes to separate modules
4. Add authentication store separation

---

## 10. Metrics

| Metric                    | Current | Target | Gap  |
| ------------------------- | ------- | ------ | ---- |
| v1 features complete      | ~80%    | 100%   | -20% |
| Test coverage (real)      | ~30%    | 80%    | -50% |
| Architecture alignment    | 60%     | 90%    | -30% |
| Documentation complete    | 40%     | 100%   | -60% |
| Skills execution verified | 20%     | 80%    | -60% |

---

## 11. Recommendations

### Immediate Actions

1. **Feature Completion**
   - Add export/import: `src/services/export-import.ts`
   - Wire fork button: Add handler in `gist-detail.ts`
   - Add conflict UI: New `src/components/conflict-resolution.ts`

2. **Documentation**
   - Create `README.md` with setup/run instructions
   - Create `CONTRIBUTING.md` with dev workflow
   - Update `011-testing-strategy.md` with coverage metrics

3. **Architecture Alignment**
   - Either update docs or refactor code (Option A recommended)
   - Add missing stores if complexity grows

### Process Improvements

1. **Pre-commit Gate**
   - Enforce test coverage minimum
   - Check for stub files in CI

2. **Documentation Sync**
   - Add script to verify architecture matches code
   - Run as part of quality gate

3. **Skill Verification**
   - Add execution tests to skills
   - Add coverage tracking to `skills-lock.json`

---

## Conclusion

The codebase is ~80% complete for v1 scope. Primary gaps are:

1. **Export/import functionality** (High priority)
2. **Fork gist UI** (Medium priority)
3. **Conflict resolution UI** (Medium priority)
4. **Test coverage** (High priority)
5. **Documentation** (Medium priority)

Architecture is generally sound but documentation diverges from implementation. Recommend updating documentation for v1, refactoring alignment in v2.

---

_Created: 2026-04-21_
_Next Review: Weekly until v1 complete_
