# Implementation Plan: Gist Comments Feature

**Status**: Draft  
**Created**: 2026-04-30  
**Target Version**: v1.x  
**Estimated Effort**: 3-5 days

## Overview

Add full support for GitHub Gist Comments API with offline-first architecture, following existing patterns for error handling, sync queue, and IndexedDB storage.

## Success Criteria

- [ ] All 5 GitHub API comment endpoints implemented
- [ ] TypeScript types defined for comments
- [ ] IndexedDB schema extended for comment storage
- [ ] Sync queue supports offline comment operations
- [ ] UI components for comment threads
- [ ] Tests for comment functionality (unit + E2E)
- [ ] No breaking changes to existing gist functionality

## Architecture Alignment

### Existing Patterns to Follow

1. **API Client Pattern** (`src/services/github/client.ts`)
   - Use `deduplicatedFetch` for GET requests
   - Use `buildOptions()` for headers + AbortController
   - Use `handleApiError()` for error handling
   - Use `trackRateLimit()` for rate limit headers
   - Support pagination via `parseLinkHeader()`

2. **Type Safety** (`src/types/api.ts`)
   - Strict TypeScript types for API responses
   - Separate request/response types
   - Use `PaginatedResult<T>` wrapper

3. **Offline Storage** (`src/services/db.ts`)
   - Add `comments` object store to IndexedDB
   - Create indexes for efficient queries
   - Batch operations in transactions

4. **Sync Queue** (`src/services/sync/queue.ts`)
   - Add comment actions to `SyncAction` type
   - Implement conflict detection for comment updates
   - Use exponential backoff for retries

5. **UI Components** (`src/components/`)
   - Follow glass-card design system
   - Use design tokens from `public/design-tokens.css`
   - Sanitize all user content via `sanitizeHtml()`

---

## Implementation Steps

### Phase 1: Type Definitions (1-2 hours)

**Files**: `src/types/api.ts`, `src/types/index.ts`

**Changes**:
1. Add `GistComment`, `CreateCommentRequest`, `UpdateCommentRequest` to `api.ts`
2. Add `CommentRecord` to `index.ts`
3. Ensure proper imports of `GistOwner` type

**Validation**:
- Run `npm run check` to verify types compile
- No `any` types allowed
- All fields properly typed

---

### Phase 2: GitHub API Client Extensions (2-3 hours)

**File**: `src/services/github/client.ts`

**Changes**:
Add 5 new functions:
1. `listGistComments(gistId, options)` - with pagination
2. `getGistComment(gistId, commentId)` - single comment
3. `createGistComment(gistId, payload)` - create new
4. `updateGistComment(gistId, commentId, payload)` - update existing
5. `deleteGistComment(gistId, commentId)` - delete comment

**Pattern to Follow**:
```typescript
// GET requests use deduplicatedFetch
export async function listGistComments(
  gistId: string,
  options: { page?: number; perPage?: number } = {}
): Promise<PaginatedResult<GistComment>> {
  const key = `GET:listGistComments:${gistId}:${url}`;
  return deduplicatedFetch(key, async () => {
    // fetch logic with error handling
  });
}

// POST/PATCH/DELETE use direct fetch
export async function createGistComment(
  gistId: string,
  payload: CreateCommentRequest
): Promise<GistComment> {
  try {
    const response = await fetch(url, await buildOptions('POST', JSON.stringify(payload)));
    // error handling
  } catch (error) {
    return handleApiError(error, 'createGistComment');
  }
}
```

**Validation**:
- Test each endpoint with valid PAT
- Verify rate limit tracking
- Test error handling (404, 401, 403)
- Test pagination for >30 comments

---

### Phase 3: IndexedDB Schema Extension (2-3 hours)

**File**: `src/services/db.ts`

**Changes**:

1. **Update schema version**: `DB_VERSION = 3`

2. **Add comments store to schema**:
```typescript
export interface GistDBSchema extends DBSchema {
  comments: {
    key: number;
    value: CommentRecord;
    indexes: {
      'by-gist-id': string;
      'by-updated-at': string;
      'by-sync-status': string;
    };
  };
}
```

3. **Add migration logic**:
```typescript
if (oldVersion < 3) {
  const commentStore = db.createObjectStore('comments', { keyPath: 'id' });
  commentStore.createIndex('by-gist-id', 'gistId');
  commentStore.createIndex('by-updated-at', 'updatedAt');
  commentStore.createIndex('by-sync-status', 'syncStatus');
}
```

4. **Add CRUD operations**:
   - `saveComment(comment)`
   - `saveComments(comments[])` - batch operation
   - `getComment(id)`
   - `getCommentsByGistId(gistId)`
   - `deleteComment(id)`
   - `deleteCommentsByGistId(gistId)` - cascade delete

5. **Update utility functions**:
   - `clearAllData()` - add comments store
   - `exportData()` - include comments
   - `importData()` - restore comments

**Validation**:
- Test migration from v2 to v3
- Verify indexes work correctly
- Test batch operations with 100+ comments
- Test cascade delete when gist is deleted
- Test export/import with comments

---

### Phase 4: Sync Queue Extensions (2-3 hours)

**File**: `src/services/sync/queue.ts`

**Changes**:

1. **Extend SyncAction type**:
```typescript
export type SyncAction = 
  | 'create' | 'update' | 'delete' | 'star' | 'unstar' | 'fork'
  | 'createComment' | 'updateComment' | 'deleteComment';
```

2. **Add comment sync handlers**:
   - `syncCreateComment(gistId, payload)`
   - `syncUpdateComment(gistId, payload)`
   - `syncDeleteComment(gistId, payload)`
   - `githubCommentToRecord(gistId, comment)` - converter

3. **Update executeWrite()** to handle new actions

**Pattern**:
```typescript
private static async syncCreateComment(
  gistId: string,
  payload: unknown
): Promise<SyncResult> {
  const { body } = payload as { body: string };
  const comment = await GitHub.createGistComment(gistId, { body });
  await saveComment(SyncQueue.githubCommentToRecord(gistId, comment));
  return { success: true, shouldRetry: false };
}
```

**Validation**:
- Test offline comment creation
- Test sync when coming back online
- Test conflict detection for updates
- Test retry logic with exponential backoff
- Test queue ordering (FIFO)

---

### Phase 5: UI Components (4-6 hours)

#### 5.1 Create Comment Thread Component

**File**: `src/components/comment-thread.ts`

**Exports**:
- `renderCommentThread(gistId, comments, currentUsername)` - main render
- `renderComment(comment, currentUsername)` - single comment
- `loadComments(gistId, container, currentUsername)` - load and bind
- `bindCommentEvents(container, gistId, currentUsername)` - event handlers

**Features**:
- Display comment list sorted by creation date
- Show comment count
- Display user avatar, name, timestamp
- Show "Pending sync" badge for offline comments
- Edit/delete buttons for own comments only
- Comment form with textarea
- Handle online/offline states
- Sanitize all user content

**Event Handlers**:
- Form submit → create comment (online or queue)
- Delete button → confirm and delete (online or queue)
- Edit button → prompt and update (online or queue)

#### 5.2 Add Comment Styles

**File**: `src/styles/components/comments.css`

**Styles**:
- `.comment-thread` - container
- `.comment-list` - flex column with gap
- `.comment-item` - glass-card with padding
- `.comment-header` - flex row with avatar
- `.comment-meta` - user info and timestamp
- `.comment-body` - pre-wrap text
- `.comment-form` - form layout
- `.comment-input` - textarea styling
- `.avatar-sm` - 32x32 circular avatar
- `.chip-warning` - pending sync badge

**Import in**: `src/styles/main.css`

#### 5.3 Integrate into Gist Detail

**File**: `src/components/gist-detail.ts`

**Changes**:

1. Add comment section to `renderGistDetail()`:
```typescript
return `
  <div class="gist-detail" data-gist-id="${sanitizeHtml(gist.id)}">
    <!-- existing content -->
    <div id="comment-section" class="comment-section"></div>
  </div>
`;
```

2. Load comments in `loadGistDetail()`:
```typescript
const commentSection = container.querySelector('#comment-section');
if (commentSection) {
  const { loadComments } = await import('./comment-thread');
  const username = await getCurrentUsername();
  await loadComments(id, commentSection as HTMLElement, username);
}
```

**Validation**:
- Test with 0, 1, and many comments
- Test online comment creation
- Test offline comment creation
- Test edit/delete (own comments only)
- Verify content sanitization
- Test responsive layout (320px, 768px, 1536px)
- Test with long comment bodies
- Test with special characters in comments

---

### Phase 6: Testing (3-4 hours)

#### 6.1 Unit Tests

**File**: `tests/unit/github-comments.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as GitHub from '../../src/services/github/client';

describe('GitHub Comment API', () => {
  it('should list comments with pagination', async () => {
    // Mock fetch with Link header
    // Verify pagination parsing
  });

  it('should create a comment', async () => {
    // Mock successful creation
    // Verify payload structure
  });

  it('should update a comment', async () => {
    // Mock successful update
    // Verify PATCH request
  });

  it('should delete a comment', async () => {
    // Mock successful deletion
    // Verify DELETE request
  });

  it('should handle API errors', async () => {
    // Mock 404, 401, 403 responses
    // Verify error handling
  });

  it('should deduplicate GET requests', async () => {
    // Call listGistComments twice concurrently
    // Verify only one fetch call
  });
});
```

**File**: `tests/unit/comment-sync.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { 
  initIndexedDB, 
  saveComment, 
  getCommentsByGistId,
  deleteComment 
} from '../../src/services/db';

describe('Comment IndexedDB Operations', () => {
  beforeEach(async () => {
    await initIndexedDB();
  });

  it('should save and retrieve comments', async () => {
    // Save comment
    // Retrieve by gist ID
    // Verify data integrity
  });

  it('should handle batch operations', async () => {
    // Save 100 comments
    // Verify transaction completes
    // Verify all saved
  });

  it('should cascade delete comments', async () => {
    // Save comments for gist
    // Delete gist
    // Verify comments deleted
  });
});
```

**File**: `tests/unit/sync-queue-comments.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import syncQueue from '../../src/services/sync/queue';

describe('Comment Sync Queue', () => {
  it('should queue offline comment creation', async () => {
    // Queue createComment action
    // Verify pending write created
  });

  it('should sync queued comments when online', async () => {
    // Queue multiple comments
    // Trigger sync
    // Verify all synced
  });

  it('should handle sync failures with retry', async () => {
    // Queue comment
    // Mock network error
    // Verify retry logic
  });
});
```

#### 6.2 E2E Tests

**File**: `tests/e2e/comments.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Gist Comments', () => {
  test.beforeEach(async ({ page }) => {
    // Login with PAT
    // Navigate to gist detail
  });

  test('should display existing comments', async ({ page }) => {
    // Verify comment list renders
    // Verify comment count
    // Verify user avatars
  });

  test('should create a new comment', async ({ page }) => {
    // Fill comment form
    // Submit
    // Verify comment appears
    // Verify API call made
  });

  test('should edit own comment', async ({ page }) => {
    // Find own comment
    // Click edit
    // Update text
    // Verify update
  });

  test('should delete own comment', async ({ page }) => {
    // Find own comment
    // Click delete
    // Confirm
    // Verify removed
  });

  test('should queue comment when offline', async ({ page, context }) => {
    // Go offline
    // Create comment
    // Verify "Pending sync" badge
    // Go online
    // Verify synced
  });

  test('should not show edit/delete for others comments', async ({ page }) => {
    // View comment by another user
    // Verify no edit/delete buttons
  });
});
```

**Validation**:
- All tests pass
- Coverage >80% for new code
- E2E tests pass on Chrome, Firefox, Safari
- Mobile viewport tests pass

---

### Phase 7: Documentation Updates (1 hour)

#### 7.1 Update README

**File**: `README.md`

Add to features list:
```markdown
- 💬 **Comment Management**: View, create, edit, and delete comments on gists
  - Offline comment creation with sync queue
  - Real-time comment updates
  - User avatar display
```

#### 7.2 Update CHANGELOG

**File**: `CHANGELOG.md`

```markdown
## [Unreleased]

### Added
- Gist comments feature with full CRUD operations
- Offline comment creation with sync queue
- Comment thread UI component
- IndexedDB storage for comments
- E2E tests for comment functionality
```

#### 7.3 Create ADR

**File**: `plans/adr-022-gist-comments.md`

Document:
- Context: Why add comments now
- Decision: Implementation approach
- Consequences: Impact on offline-first architecture
- Alternatives considered

---

## Coordination Points for Parallel Work

### Can Work in Parallel

1. **Types + API Client** (Phase 1-2) → Independent
2. **IndexedDB Schema** (Phase 3) → After Phase 1
3. **Sync Queue** (Phase 4) → After Phase 1-2
4. **UI Components** (Phase 5) → After Phase 1-3
5. **Tests** (Phase 6) → After Phase 1-5 (can write tests earlier)

### Sequential Dependencies

```
Phase 1 (Types)
    ↓
Phase 2 (API Client) ──→ Phase 4 (Sync Queue)
    ↓                           ↓
Phase 3 (IndexedDB) ────────→ Phase 5 (UI)
                                ↓
                            Phase 6 (Tests)
                                ↓
                            Phase 7 (Docs)
```

### Integration Points

1. **After Phase 3**: Test IndexedDB migration
2. **After Phase 4**: Test sync queue with comments
3. **After Phase 5**: Manual UI testing
4. **After Phase 6**: Full regression testing

---

## Risk Assessment

### High Risk

1. **IndexedDB Migration**: Users on v2 schema must migrate to v3
   - **Mitigation**: Test migration thoroughly, provide rollback
   - **Fallback**: Clear data and re-sync from GitHub

2. **Sync Queue Conflicts**: Comment updates may conflict
   - **Mitigation**: Use `expectedRemoteVersion` for conflict detection
   - **Fallback**: Show conflict resolution UI (v2 feature)

### Medium Risk

1. **Performance**: Loading 100+ comments may be slow
   - **Mitigation**: Implement pagination in UI
   - **Optimization**: Virtual scrolling for large lists

2. **Memory**: Storing comment bodies in IndexedDB
   - **Mitigation**: Limit comment body size (GitHub limit: 65536 chars)
   - **Monitoring**: Track IndexedDB quota usage

### Low Risk

1. **UI Complexity**: Comment thread adds UI complexity
   - **Mitigation**: Follow existing component patterns
   - **Testing**: Comprehensive E2E tests

2. **API Rate Limits**: Comment operations count toward rate limit
   - **Mitigation**: Already tracked via `trackRateLimit()`
   - **Monitoring**: Display rate limit status

---

## Timeline Breakdown

### Day 1: Foundation (6-8 hours)
- Phase 1: Type Definitions (1-2h)
- Phase 2: GitHub API Client (2-3h)
- Phase 3: IndexedDB Schema (2-3h)
- **Checkpoint**: API client works, schema migrates

### Day 2: Sync & UI (6-8 hours)
- Phase 4: Sync Queue Extensions (2-3h)
- Phase 5.1-5.2: Comment Component + Styles (3-4h)
- **Checkpoint**: Comments display, offline creation works

### Day 3: Integration & Testing (6-8 hours)
- Phase 5.3: Gist Detail Integration (1h)
- Phase 6.1: Unit Tests (2-3h)
- Phase 6.2: E2E Tests (2-3h)
- **Checkpoint**: All tests pass

### Day 4: Polish & Documentation (2-4 hours)
- Phase 7: Documentation Updates (1h)
- Bug fixes from testing (1-2h)
- Code review and refinement (1h)
- **Checkpoint**: Ready for PR

### Buffer: Day 5 (optional)
- Address review feedback
- Additional testing
- Performance optimization

---

## Success Metrics

### Functional
- [ ] All 5 API endpoints work correctly
- [ ] Comments persist in IndexedDB
- [ ] Offline comment creation queues successfully
- [ ] Sync queue processes comments when online
- [ ] UI displays comments correctly
- [ ] Edit/delete only available for own comments

### Quality
- [ ] TypeScript strict mode passes
- [ ] No console errors in browser
- [ ] All unit tests pass (>80% coverage)
- [ ] All E2E tests pass
- [ ] No memory leaks detected
- [ ] Performance budgets met (<100ms interactions)

### User Experience
- [ ] Comments load in <500ms
- [ ] Offline indicator shows for pending comments
- [ ] Error messages are user-friendly
- [ ] Mobile layout works (320px+)
- [ ] Keyboard navigation works
- [ ] Screen reader accessible

---

## Rollback Plan

If critical issues arise:

1. **Revert API Client Changes**: Remove comment functions
2. **Revert IndexedDB Schema**: Downgrade to v2, clear comments
3. **Revert UI Changes**: Remove comment section from gist detail
4. **Revert Sync Queue**: Remove comment actions

**Data Safety**: Comments stored in IndexedDB can be exported before rollback.

---

## Future Enhancements (v2)

Not in scope for this implementation:

- [ ] Rich text editor for comments (Markdown support)
- [ ] Comment reactions (emoji)
- [ ] Comment threading (replies)
- [ ] Real-time comment updates (WebSocket)
- [ ] Comment notifications
- [ ] Comment search
- [ ] Comment moderation
- [ ] Conflict resolution UI for comment updates

---

## References

- GitHub Gist Comments API: https://docs.github.com/en/rest/gists/comments
- IndexedDB Best Practices: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- Existing Patterns: `src/services/github/client.ts`, `src/services/db.ts`, `src/services/sync/queue.ts`
- Design System: `public/design-tokens.css`, `src/styles/`

---

## Approval Checklist

Before starting implementation:

- [ ] Plan reviewed by team
- [ ] Architecture approved
- [ ] Timeline agreed upon
- [ ] Risk mitigation strategies accepted
- [ ] Success criteria clear
- [ ] Rollback plan understood

---

**End of Implementation Plan**
