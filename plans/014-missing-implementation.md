# Missing Implementation Plan

**Status**: Active
**Date**: 2026-04-21
**Priority**: High

## Overview

Implementation tasks for missing v1 features identified in ADR-010.

---

## Task 1: Export/Import Functionality

**Location**: `src/services/export-import.ts`
**Priority**: High
**Estimated Hours**: 4

### Requirements

1. Export all user gists to JSON file
2. Import gists from JSON backup
3. Include metadata: starred status, sync status, timestamps
4. Support partial export (selected gists)
5. Import with conflict detection

### Implementation

```typescript
// src/services/export-import.ts
export interface ExportData {
  version: string;
  exportedAt: string;
  gists: GistRecord[];
  metadata: {
    total: number;
    starred: number;
  };
}

export async function exportAllGists(): Promise<Blob>;
export async function exportSelectedGists(ids: string[]): Promise<Blob>;
export async function importGists(file: File): Promise<ImportResult>;
export async function validateImportData(data: unknown): Promise<ExportData | null>;
```

### Tests Needed

- `tests/browser/export-import.spec.ts`
- Verify JSON structure
- Verify large file handling
- Verify conflict detection on import

---

## Task 2: Fork Gist UI

**Location**: `src/components/gist-detail.ts`
**Priority**: Medium
**Estimated Hours**: 2

### Requirements

1. Wire existing button to API
2. Show confirmation before forking
3. Handle rate limit errors
4. Add forked gist to local store
5. Navigate to forked gist after success

### Implementation

```typescript
// In bindDetailEvents function
container.querySelector('[data-action="fork"]')?.addEventListener('click', async () => {
  if (!gistId) return;
  try {
    const confirmed = await showConfirmDialog('FORK THIS GIST?');
    if (!confirmed) return;

    const forked = await GitHub.forkGist(gistId);
    await gistStore.addGist(forked);
    toast.success('GIST FORKED');
    navigateToDetail(forked.id);
  } catch (err) {
    toast.error('FAILED TO FORK GIST');
  }
});
```

### Tests Needed

- Fork success flow
- Rate limit error handling
- Offline handling

---

## Task 3: Conflict Resolution UI

**Location**: `src/components/conflict-resolution.ts` (new file)
**Priority**: Medium
**Estimated Hours**: 6

### Requirements

1. Display sync conflicts from IndexedDB
2. Show side-by-side comparison
3. Offer resolution options:
   - Keep local
   - Use remote
   - Manual merge
4. Apply resolution and sync
5. Clear conflict from queue

### Implementation

```typescript
// src/components/conflict-resolution.ts
export function renderConflictList(conflicts: GistConflict[]): string;
export function renderConflictDetail(conflict: GistConflict): string;
export function bindConflictEvents(
  container: HTMLElement,
  onResolve: (gistId: string, strategy: ResolutionStrategy) => void
): void;
export async function loadConflictResolution(
  container: HTMLElement,
  onResolved: () => void
): Promise<void>;
```

### Integration Points

1. Add conflicts route to app.ts
2. Show badge when conflicts exist
3. Navigate from offline status page

### Tests Needed

- `tests/browser/conflict-resolution.spec.ts`
- All three resolution strategies
- Badge notification
- Navigation flows

---

## Task 4: File Rename/Delete in Edit

**Location**: `src/components/gist-edit.ts`
**Priority**: Low
**Estimated Hours**: 3

### Current Issue

```typescript
// Line 129: Files can't be renamed properly
files[existingKey || filename] = content;
// This doesn't handle rename case
```

### Fix

```typescript
// When filename changes, we need to:
// 1. Delete old file key
// 2. Create new file key
// 3. Send to GitHub API

const updates: UpdateGistRequest = {
  description,
  files: {},
};

container.querySelectorAll('.file-editor').forEach((editor) => {
  const existingKey = (editor as HTMLElement).dataset.fileKey;
  const newFilename = (editor.querySelector('.filename-input') as HTMLInputElement)?.value.trim();
  const content = (editor.querySelector('.content-editor') as HTMLTextAreaElement)?.value;

  if (existingKey !== newFilename) {
    // Rename: null out old, create new
    updates.files[existingKey] = null; // GitHub API uses null to delete
    updates.files[newFilename] = { content };
  } else {
    updates.files[existingKey] = { content };
  }
});
```

---

## Task 5: Test Coverage

**Priority**: High
**Estimated Hours**: 16

### Files to Implement

| Stub File                                 | Real Tests Needed            |
| ----------------------------------------- | ---------------------------- |
| `tests/browser/memory-stubs.spec.ts`      | Memory leak detection        |
| `tests/browser/performance-stubs.spec.ts` | Performance budget checks    |
| `tests/browser/security-stubs.spec.ts`    | XSS prevention, token safety |

### New Test Files

| File                                        | Purpose             |
| ------------------------------------------- | ------------------- |
| `tests/browser/export-import.spec.ts`       | Export/import flows |
| `tests/browser/conflict-resolution.spec.ts` | Conflict handling   |
| `tests/browser/fork.spec.ts`                | Fork functionality  |
| `tests/browser/rate-limits.spec.ts`         | Rate limit handling |

### Coverage Targets

| Category   | Current | Target |
| ---------- | ------- | ------ |
| Statements | ~30%    | 80%    |
| Branches   | ~25%    | 75%    |
| Functions  | ~35%    | 80%    |
| Lines      | ~30%    | 80%    |

---

## Task 6: Documentation

**Priority**: Medium
**Estimated Hours**: 8

### Files to Create

1. **README.md**
   - Project overview
   - Quick start guide
   - Architecture summary
   - Development setup

2. **CONTRIBUTING.md**
   - Development workflow
   - PR requirements
   - Code standards
   - Testing requirements

3. **docs/ARCHITECTURE.md**
   - Detailed component breakdown
   - Data flow diagrams
   - Authentication flow
   - Sync mechanism

4. **docs/DEPLOYMENT.md**
   - Build process
   - Capacitor Android steps
   - Environment setup
   - Release checklist

### Update Existing

| File                      | Update Needed                      |
| ------------------------- | ---------------------------------- |
| `011-testing-strategy.md` | Add metrics, coverage requirements |
| `002-architecture.md`     | Align with actual structure        |
| `005-data-model.md`       | Expand from 283 bytes              |
| `006-sync-model.md`       | Expand from 327 bytes              |

---

## Task 7: AGENTS.md Enhancements

**Priority**: Medium
**Estimated Hours**: 2

### Add Sections

```markdown
## Feature Implementation Workflow

### Pre-Implementation Checklist

- [ ] Check v1 vs v2 scope (plans/001-v1-scope.md)
- [ ] Run `triz-analysis` skill for contradictions
- [ ] Create ADR if architectural decision
- [ ] Design tokens for any new UI components

### Implementation Steps

1. Follow token-first architecture
2. Add abort controllers for async operations
3. Handle offline gracefully
4. Add structured error handling
5. Write tests: unit + integration + E2E

### Post-Implementation Checklist

- [ ] Responsive screenshots (320/768/1536)
- [ ] Accessibility test passes
- [ ] Performance budget check
- [ ] Quality gate passes
- [ ] Update documentation if needed

## Conflict Resolution Workflow

When sync conflicts detected:

1. Check `sync-conflicts` in IndexedDB metadata
2. Display in Offline tab with badge
3. User selects: local-wins | remote-wins | manual
4. Apply resolution strategy
5. Clear conflict from queue
6. Trigger sync for local changes

## Rate Limit Handling

GitHub API rate limits:

- 5000 requests/hour (authenticated)
- 60 requests/hour (unauthenticated)

Implementation:

1. Check `X-RateLimit-Remaining` header
2. Show warning when < 10% remaining
3. Queue operations when exhausted
4. Show countdown to reset
```

---

## Task 8: Architecture Alignment

**Priority**: Low
**Estimated Hours**: 4

### Option A: Update Documentation (Recommended v1)

Update `002-architecture.md` to reflect actual structure:

- Remove `src/routes/` reference
- Change `src/lib/` to `src/utils/`
- Remove `auth-store.ts` and `ui-store.ts` references
- Update `src/services/db/` to single `db.ts`

### Option B: Refactor Code (v2)

Reorganize to match documented architecture:

- Extract routes from `app.ts`
- Create `src/lib/utilities/`
- Separate auth and UI stores
- Split `db.ts` into `schema.ts` and `migrations.ts`

---

## Prioritized Execution Order

| Week | Tasks             | Deliverables             |
| ---- | ----------------- | ------------------------ |
| 1    | Task 1, Task 2    | Export/import, Fork UI   |
| 2    | Task 3, Task 4    | Conflict UI, Edit fix    |
| 3    | Task 5 (partial)  | Real tests for stubs     |
| 4    | Task 6, Task 7    | Documentation, AGENTS.md |
| 5    | Task 5 (complete) | Full test coverage       |
| 6    | Task 8            | Architecture alignment   |

---

## Acceptance Criteria

### v1 Definition of Done

- [ ] All v1 features implemented and tested
- [ ] Test coverage ≥ 80%
- [ ] All stub tests replaced with real tests
- [ ] Documentation complete (README, CONTRIBUTING, ARCHITECTURE)
- [ ] AGENTS.md includes all workflows
- [ ] Quality gate passes (lint, typecheck, format)
- [ ] Responsive screenshots verified
- [ ] Accessibility tests pass
- [ ] No hardcoded values outside tokens

---

_Created: 2026-04-21_
