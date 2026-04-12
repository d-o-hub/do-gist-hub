# GOAP Methodology for Gist Hub

## What is GOAP?

Goal-Oriented Action Planning (GOAP) is a planning methodology where you define a desired goal state, identify the actions needed to reach it, and order them by dependencies. Unlike linear task lists, GOAP discovers the optimal path from current state to target state.

## Why GOAP for Gist Hub?

Gist Hub has interconnected concerns -- IndexedDB schema, GitHub API integration, PWA caching, responsive UI -- where changes in one layer ripple to others. GOAP ensures:
- Dependencies between layers are explicit before implementation begins
- Trade-offs are documented as Architecture Decision Records (ADRs)
- Plans remain actionable for both AI agents and human reviewers
- Scope creep is prevented by clearly defined success criteria

## GOAP Planning Process

### Step 1: Define the Goal

A goal must be specific, measurable, and bounded.

```markdown
## Goal
Implement offline-first gist list with optimistic reads from IndexedDB,
falling back to GitHub API when online, with pagination and stale indicators.

## Success Criteria
- [ ] Gist list renders within 500ms from IndexedDB cache on cold start
- [ ] Paginated loading shows 30 items per page with infinite scroll
- [ ] Stale indicator shows last-synced timestamp older than 10 minutes
- [ ] List is readable at 320px viewport width
- [ ] No network errors when offline; graceful offline indicator

## Constraints
- IndexedDB is v1 source of truth; API data syncs to IndexedDB
- Must use AbortController for cancelable fetch
- No hardcoded style values; use design tokens
- PAT must never appear in logs or diagnostics
```

### Step 2: Analyze Current State vs Target State

```markdown
## Current State
- Skeleton Vite + TypeScript project
- No IndexedDB schema
- No GitHub API client
- No responsive breakpoints configured

## Target State
- IndexedDB with gist store (id, description, files, updated_at, etag)
- Typed GitHub API client with pagination support
- Gist list component with token-driven styling
- Responsive from 320px to 1536px+
- Service worker caching API responses
```

### Step 3: Identify Actions and Dependencies

Map each action with its prerequisites. This forms a directed acyclic graph (DAG).

| # | Action | Depends On | Effort | Output |
|---|--------|-----------|--------|--------|
| A1 | Define IndexedDB schema and sync queue | None | Medium | `src/lib/db/schema.ts` |
| A2 | Implement GitHub REST API client | None | Medium | `src/lib/github/api.ts` |
| A3 | Create auth service with PAT management | None | Medium | `src/lib/auth/service.ts` |
| A4 | Build gist sync operation (API -> IndexedDB) | A1, A2, A3 | Medium | `src/lib/db/operations.ts` |
| A5 | Create design token set for list component | None | Low | `src/tokens/list.css` |
| A6 | Build gist list UI component | A4, A5 | Medium | `src/components/gist-list.ts` |
| A7 | Add pagination and infinite scroll | A6 | Low | `src/components/gist-list.ts` |
| A8 | Configure service worker caching for API | A2 | Low | `src/sw.ts` |
| A9 | Write E2E tests for offline read | A6, A4 | Medium | `tests/offline/offline-read.spec.ts` |
| A10 | Add stale indicator and sync timestamps | A4 | Low | `src/components/gist-list.ts` |

### Step 4: Topological Sort and Parallelize

Order actions so dependencies are satisfied. Identify parallel work.

```
Wave 1 (no dependencies):
  A1 (IndexedDB schema)
  A2 (GitHub API client)
  A3 (Auth service)
  A5 (Design tokens)

Wave 2 (depends on Wave 1):
  A4 (Sync operation) -> depends on A1, A2, A3
  A8 (SW caching) -> depends on A2

Wave 3 (depends on Wave 2):
  A6 (Gist list UI) -> depends on A4, A5

Wave 4 (depends on Wave 3):
  A7 (Pagination) -> depends on A6
  A10 (Stale indicator) -> depends on A4

Wave 5 (depends on Wave 3+):
  A9 (E2E tests) -> depends on A6, A4
```

### Step 5: Create the Plan File

Write the plan to `plans/NNN-feature-name.md` using the numbered convention.

```markdown
<!-- plans/001-offline-gist-list.md -->
# Plan 001: Offline-First Gist List

## Goal
[As defined in Step 1]

## Execution Order
1. Define IndexedDB schema (A1)
2. Implement GitHub API client (A2)
3. Create auth service (A3)
4. Create list design tokens (A5)
5. Build sync operation (A4)
6. Configure SW caching (A8)
7. Build gist list UI (A6)
8. Add pagination (A7)
9. Add stale indicators (A10)
10. Write E2E tests (A9)

## Rollback Plan
If IndexedDB schema breaks: drop and recreate with migration script.
If API