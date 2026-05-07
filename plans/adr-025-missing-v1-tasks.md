# ADR-025: Missing v1 Tasks

**Date**: May 7, 2026  
**Status**: Accepted  
**Author**: Agent Analysis

## Summary

Identifies remaining tasks to complete v1. Features implemented but not integrated.

## Problem

- Bulk operations, search engine, selection store implemented but no integration
- Home route doesn't use new components
- GitHub API has no comments endpoint - feature needs design change

## Analysis

### Features Implemented (Unintegrated)

| Feature         | File                                   | Status | Integration Needed                |
| --------------- | -------------------------------------- | ------ | --------------------------------- |
| Search Engine   | `src/services/search/search-engine.ts` | Done   | Home route uses gist-store search |
| Selection Store | `src/stores/selection-store.ts`        | Done   | Home route needs selection mode   |
| Bulk Toolbar    | `src/components/bulk-toolbar.ts`       | Done   | Needs mount in home.ts            |
| Virtual List    | `src/components/ui/virtual-list.ts`    | Done   | Not mounted anywhere              |
| Comment Thread  | `src/components/comment-thread.ts`     | Done   | GitHub API: no REST endpoint      |

### Missing by Priority

| Priority | Task                              | Feature Area | Complexity |
| -------- | --------------------------------- | ------------ | ---------- |
| P0       | Add selection mode toggle to Home | Bulk Ops     | Low        |
| P0       | Mount bulk toolbar when selected  | Bulk Ops     | Low        |
| P1       | Use search-engine in home         | Search       | Medium     |
| P1       | Drop comments or redesign         | API Gap      | High       |
| P2       | Virtual list for large datasets   | Performance  | Medium     |

## Decision

- Merge **P0 tasks** in current sprint
- Re-evaluate **P1 comments** - GitHub Gists don't support comments (no API)
- **P2** deferred to v1.1

## Tasks

```tasks
- [ ] Add "Select" button to home.ts filter bar
- [ ] Integrate selection-store subscribe in home.ts
- [ ] Mount bulk-toolbar when selectionStore.getSelectedCount() > 0
- [ ] Consider search-engine integration (optional)
```
