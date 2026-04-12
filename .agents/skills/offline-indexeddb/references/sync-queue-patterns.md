# Sync Queue and Conflict Resolution Patterns

Patterns for managing offline writes, background synchronization, and data conflicts in Gist Hub.

## Architecture Overview

```
User Action (create/edit/delete/star)
  │
  ▼
┌─────────────────────────┐
│   Optimistic Write      │  ← Update IndexedDB immediately
│   (local source of truth)│
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Sync Queue            │  ← Enqueue operation
│   (pending items)       │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Background Sync       │  ← Process queue when online
│   (FIFO with backoff)   │
└────────────┬────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
   Success       Conflict
      │             │
      ▼             ▼
  Remove item   Surface to user
  from queue    for resolution
```

---

## Pattern 1: Optimistic Write

Update the local database immediately, then queue the sync operation.

```typescript
// src/services/storage/optimistic-writes.ts
export class OptimisticWriteManager {
  constructor(
    private db: GistDatabase,
    private syncQueue: SyncQueueProcessor,
  ) {}

  async updateGistDescription(
    gistId: string,
    description: string,
  ): Promise<void> {
    // 1. Read current local state
    const local = await this.db.getGist(gistId);
    if (!local) {
      throw new AppError(
        ErrorCode.GIST_NOT_FOUND,
        `Gist ${gistId} not found locally`,
      );
    }

    // 2. Update local DB immediately
    const updated: GistRecord = {
      ...local,
      description,
      updatedAt: new Date().toISOString(),
      syncStatus: local.syncStatus === 'conflict' ? 'conflict' : 'pending',
    };
    await this.db.putGist(updated);

    // 3. Queue sync operation
    await this.syncQueue.enqueue({
      gistId,
      action: 'update',
      payload: { description },
      createdAt: Date.now(),
      attempts: 0,
    });

    // 4. Trigger sync if online
    if (navigator.onLine) {
      this.syncQueue.processQueue();
    }
  }

  async starGist(gistId: string): Promise<void> {
    const local = await this.db.getGist(gistId);
    if (!local) throw new AppError(ErrorCode.GIST_NOT_FOUND, `Gist not found`);

    // Optimistic update
    await this.db.putGist({ ...local, starred: true, syncStatus: 'pending' });

    // Queue sync
    await this.syncQueue.enqueue({
      gistId,
      action: 'star',
      payload: {},
      createdAt: Date.now(),
      attempts: 0,
    });

    if (navigator.onLine) {
      this.syncQueue.processQueue();
    }
  }

  async unstarGist(gistId: string): Promise<void> {
    const local = await this.db.getGist(gistId);
    if (!local) throw new AppError(ErrorCode.GIST_NOT_FOUND, `Gist not found`);

    await this.db.putGist({ ...local, starred: false, syncStatus: 'pending' });

    await this.syncQueue.enqueue({
      gistId,
      action: 'unstar',
      payload: {},
      createdAt: Date.now(),
      attempts: 0,
    });

    if (navigator.onLine) {
      this.syncQueue.processQueue();
    }
  }

  async createGist(gist: Partial<GistRecord>): Promise<string> {
    // Generate a temporary local ID
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const record: GistRecord = {
      id: localId,
      node_id: '',
      description: gist.description ?? '',
      public: gist.public ?? true,
      owner: await this.db.getState<string>('auth.username') ?? '',
      files: gist.files ?? {},
      starred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncedAt: '',
      syncStatus: 'pending',
    };

    // Save locally
    await this.db.putGist(record);

    // Queue create
    await this.syncQueue.enqueue({
      gistId: localId,
      action: 'create',
      payload: record,
      createdAt: Date.now(),
      attempts: 0,
    });

    if (navigator.onLine) {
      this.syncQueue.processQueue();
    }

    return localId;
  }

  async deleteGist(gistId: string): Promise<void> {
    // Mark as deleted locally (soft delete to support sync)
    const local = await this.db.getGist(gistId);
    if (!local) throw new AppError(ErrorCode.GIST_NOT_FOUND, `Gist not found`);

    await this.db.putGist({
      ...local,
      syncStatus: 'pending',
      // Mark with a sentinel so we know it's a delete
      _deleted: true as unknown as never,
    });

    await this.syncQueue.enqueue({
      gistId,
      action: 'delete',
      payload: { id: gistId },
      createdAt: Date.now(),
      attempts: 0,
    });

    if (navigator.onLine) {
      this.syncQueue.processQueue();
    }
  }
}
```

---

## Pattern 2: Sync Queue Processor

Processes the queue FIFO with exponential backoff on failures.

```typescript
// src/services/storage/sync-queue.ts
export class SyncQueueProcessor implements Disposable {
  private processing = false;
  private maxAttempts = 5;
  private baseBackoffMs = 2000;
  private maxBackoffMs = 300_000; // 5 minutes
  private github: GitHubApiClient;
  private db: GistDatabase;
  private abortController: AbortController;
  private onlineHandler: () => void;

  constructor(db: GistDatabase, github: GitHubApiClient) {
    this.db = db;
    this.github = github;
    this.abortController = new AbortController();

    // Auto-process when coming back online
    this.onlineHandler = this.handleOnline.bind(this);
    window.addEventListener('online', this.onlineHandler);
  }

  async enqueue(item: Omit<SyncQueueItem, 'id' | 'attempts'>): Promise<void> {
    await this.db.enqueueSyncItem(item);
  }

  async processQueue(): Promise<void> {
    if (this.processing || this.abortController.signal.aborted) return;
    if (!navigator.onLine) return;

    this.processing = true;

    try {
      // Get items that are due for retry (nextRetryAt <= now or no nextRetryAt)
      const items = await this.db.getPendingQueueItems();
      const dueItems = items.filter(item => {
        if (!item.nextRetryAt) return true;
        return item.nextRetryAt <= Date.now();
      });

      for (const item of dueItems) {
        if (this.abortController.signal.aborted) break;
        if (!navigator.onLine) break;

        await this.processItem(item);
      }
    } finally {
      this.processing = false;
    }
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    try {
      await this.syncItem(item);

      // Success: remove from queue, update gist status
      await this.db.removeQueueItem(item.id);
      await this.db.putGist({
        ...(await this.db.getGist(item.gistId))!,
        syncStatus: 'synced',
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      // Failure: apply backoff
      await this.handleSyncFailure(item, error);
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    switch (item.action) {
      case 'create':
        await this.syncCreate(item);
        break;
      case 'update':
        await this.syncUpdate(item);
        break;
      case 'delete':
        await this.syncDelete(item);
        break;
      case 'star':
        await this.syncStar(item);
        break;
      case 'unstar':
        await this.syncUnstar(item);
        break;
      default:
        throw new Error(`Unknown sync action: ${item.action}`);
    }
  }

  private async syncCreate(item: SyncQueueItem): Promise<void> {
    const payload = item.payload as GistRecord;
    const gist = await this.github.createGist({
      description: payload.description,
      public: payload.public,
      files: Object.fromEntries(
        Object.entries(payload.files).map(([name, file]) => [
          name,
          { content: (file as GistFileRecord).content },
        ]),
      ),
    });

    // Replace local record with server response (get real ID)
    const localGist = await this.db.getGist(item.gistId);
    if (localGist) {
      const serverGist: GistRecord = {
        id: gist.id,
        node_id: gist.node_id,
        description: gist.description,
        public: gist.public,
        owner: gist.owner.login,
        files: this.mapGistFiles(gist.files),
        starred: localGist.starred, // Preserve local star
        createdAt: gist.created_at,
        updatedAt: gist.updated_at,
        syncedAt: new Date().toISOString(),
        syncStatus: 'synced',
        etag: gist.etag,
      };

      // Delete the old local record (with temp ID) and save the new one
      await this.db.deleteGist(item.gistId);
      await this.db.putGist(serverGist);
    }
  }

  private async syncUpdate(item: SyncQueueItem): Promise<void> {
    const payload = item.payload as Partial<GistRecord>;
    const localGist = await this.db.getGist(item.gistId);

    if (!localGist) {
      // Gist was deleted locally before sync -- skip
      return;
    }

    // Check for conflicts before sending
    const conflict = await this.detectConflict(localGist);
    if (conflict) {
      throw new AppError(
        ErrorCode.SYNC_CONFLICT,
        'Local and remote versions conflict',
        undefined,
        { gistId: item.gistId, conflict },
        true,
      );
    }

    const files: Record<string, { content?: string }> = {};
    if (payload.description !== undefined) {
      // Update description only
    }
    if (payload.files) {
      for (const [name, file] of Object.entries(payload.files)) {
        files[name] = { content: (file as GistFileRecord).content };
      }
    }

    const updated = await this.github.updateGist(item.gistId, {
      description: payload.description,
      files,
    });

    // Update local record with server response
    await this.db.putGist({
      ...localGist,
      ...payload,
      updatedAt: updated.updated_at,
      syncedAt: new Date().toISOString(),
      syncStatus: 'synced',
      etag: updated.etag,
    });
  }

  private async syncDelete(item: SyncQueueItem): Promise<void> {
    try {
      await this.github.deleteGist(item.gistId);
    } catch (error) {
      // If gist already deleted on server (404), treat as success
      if (error instanceof AppError && error.code === ErrorCode.GIST_NOT_FOUND) {
        return;
      }
      throw error;
    }

    // Remove local record
    await this.db.deleteGist(item.gistId);
  }

  private async syncStar(item: SyncQueueItem): Promise<void> {
    await this.github.starGist(item.gistId);
  }

  private async syncUnstar(item: SyncQueueItem): Promise<void> {
    await this.github.unstarGist(item.gistId);
  }

  // -- Conflict Detection --

  private async detectConflict(local: GistRecord): Promise<boolean> {
    if (local.syncStatus === 'conflict') return true;

    // Use ETag for conditional request
    if (local.etag) {
      const response = await this.github.getGistIfModified(local.id, local.etag);

      if (response.status === 304) {
        // Not modified -- no conflict
        return false;
      }

      if (response.ok) {
        // Remote has changed -- check if local also changed since last sync
        const remote = await response.json();
        const remoteUpdatedAt = remote.updated_at;

        if (remoteUpdatedAt > local.syncedAt && local.updatedAt > local.syncedAt) {
          // Both changed since last sync -- conflict!
          return true;
        }

        // Only remote changed -- accept remote
        await this.db.putGist({
          ...local,
          description: remote.description,
          files: this.mapGistFiles(remote.files),
          updatedAt: remote.updated_at,
          syncedAt: new Date().toISOString(),
          etag: response.headers.get('etag') ?? local.etag,
        });
      }
    }

    return false;
  }

  // -- Backoff --

  private async handleSyncFailure(item: SyncQueueItem, error: unknown): Promise<void> {
    const attempts = item.attempts + 1;

    if (attempts >= this.maxAttempts) {
      // Mark as failed permanently
      await this.db.updateQueueItem(item.id, {
        attempts,
        lastError: extractErrorMessage(error),
      });

      // Mark the associated gist as conflicted
      const gist = await this.db.getGist(item.gistId);
      if (gist) {
        await this.db.putGist({ ...gist, syncStatus: 'conflict' });
      }
      return;
    }

    // Calculate backoff with jitter
    const backoff = Math.min(
      this.baseBackoffMs * Math.pow(2, attempts - 1) + Math.random() * 1000,
      this.maxBackoffMs,
    );

    await this.db.updateQueueItem(item.id, {
      attempts,
      lastError: extractErrorMessage(error),
      nextRetryAt: Date.now() + backoff,
    });
  }

  private handleOnline(): void {
    // Process queue when coming back online
    this.processQueue();
  }

  private mapGistFiles(files: Record<string, unknown>): Record<string, GistFileRecord> {
    const result: Record<string, GistFileRecord> = {};
    for (const [name, file] of Object.entries(files)) {
      const f = file as Record<string, unknown>;
      result[name] = {
        filename: name,
        content: (f.content as string) ?? '',
        type: (f.type as string) ?? 'text/plain',
        language: (f.language as string) ?? '',
        size: (f.size as number) ?? 0,
      };
    }
    return result;
  }

  destroy(): void {
    this.abortController.abort();
    window.removeEventListener('online', this.onlineHandler);
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.code;
  if (error instanceof Error) return error.message;
  return String(error);
}
```

---

## Pattern 3: Conflict Resolution UI

When a conflict is detected, present the user with options.

```typescript
// src/services/storage/conflict-resolver.ts
export interface ConflictInfo {
  gistId: string;
  localVersion: GistRecord;
  remoteVersion: GistRecord;
  changedFields: string[];
}

export type Resolution = 'keep-local' | 'keep-remote' | 'merge';

export class ConflictResolver {
  private db: GistDatabase;
  private github: GitHubApiClient;

  constructor(db: GistDatabase, github: GitHubApiClient) {
    this.db = db;
    this.github = github;
  }

  async getConflict(gistId: string): Promise<ConflictInfo | null> {
    const local = await this.db.getGist(gistId);
    if (!local || local.syncStatus !== 'conflict') return null;

    // Fetch latest from GitHub
    const remote = await this.github.getGist(gistId);

    // Find changed fields
    const changedFields: string[] = [];
    if (local.description !== remote.description) changedFields.push('description');
    if (JSON.stringify(local.files) !== JSON.stringify(remote.files)) changedFields.push('files');
    if (local.public !== remote.public) changedFields.push('public');

    return {
      gistId,
      localVersion: local,
      remoteVersion: this.mapRemoteToRecord(remote),
      changedFields,
    };
  }

  async resolve(
    gistId: string,
    resolution: Resolution,
  ): Promise<void> {
    const local = await this.db.getGist(gistId);
    if (!local) return;

    switch (resolution) {
      case 'keep-local':
        // Push local to GitHub
        await this.github.updateGist(gistId, {
          description: local.description,
          public: local.public,
          files: Object.fromEntries(
            Object.entries(local.files).map(([name, file]) => [
              name,
              { content: (file as GistFileRecord).content },
            ]),
          ),
        });
        await this.db.putGist({
          ...local,
          syncStatus: 'synced',
          syncedAt: new Date().toISOString(),
        });
        break;

      case 'keep-remote':
        // Accept remote, discard local
        const remote = await this.github.getGist(gistId);
        await this.db.putGist({
          ...local,
          description: remote.description,
          public: remote.public,
          files: this.mapRemoteFiles(remote.files),
          updatedAt: remote.updated_at,
          syncedAt: new Date().toISOString(),
          syncStatus: 'synced',
        });
        break;

      case 'merge':
        // Merge: for now, take remote. In v2, implement field-level merge.
        const mergedRemote = await this.github.getGist(gistId);
        await this.db.putGist({
          ...local,
          description: mergedRemote.description,
          public: mergedRemote.public,
          files: this.mapRemoteFiles(mergedRemote.files),
          updatedAt: mergedRemote.updated_at,
          syncedAt: new Date().toISOString(),
          syncStatus: 'synced',
        });
        break;
    }

    // Clear any pending sync queue items for this gist
    // (they would be stale after resolution)
    const items = await this.db.getPendingQueueItems();
    for (const item of items.filter(i => i.gistId === gistId)) {
      await this.db.removeQueueItem(item.id);
    }
  }

  private mapRemoteToRecord(remote: GitHubGist): GistRecord {
    return {
      id: remote.id,
      node_id: remote.node_id,
      description: remote.description,
      public: remote.public,
      owner: remote.owner.login,
      files: this.mapRemoteFiles(remote.files),
      starred: false, // Unknown, will be set locally
      createdAt: remote.created_at,
      updatedAt: remote.updated_at,
      syncedAt: new Date().toISOString(),
      syncStatus: 'synced',
    };
  }

  private mapRemoteFiles(files: Record<string, unknown>): Record<string, GistFileRecord> {
    const result: Record<string, GistFileRecord> = {};
    for (const [name, file] of Object.entries(files)) {
      const f = file as Record<string, unknown>;
      result[name] = {
        filename: name,
        content: '', // Do not download content for all files on conflict
        type: (f.type as string) ?? 'text/plain',
        language: (f.language as string) ?? '',
        size: (f.size as number) ?? 0,
      };
    }
    return result;
  }
}
```

---

## Pattern 4: Full Sync (Periodic Refresh)

Periodically fetch all gists from GitHub and reconcile with local state.

```typescript
// src/services/storage/full-sync.ts
export class FullSync implements Disposable {
  private db: GistDatabase;
  private github: GitHubApiClient;
  private running = false;
  private abortController: AbortController;

  constructor(db: GistDatabase, github: GitHubApiClient) {
    this.db = db;
    this.github = github;
    this.abortController = new AbortController();
  }

  async run(): Promise<void> {
    if (this.running || this.abortController.signal.aborted) return;
    if (!navigator.onLine) return;

    this.running = true;

    try {
      // Fetch all gists (paginated)
      const remoteGists: GitHubGist[] = [];
      let page = 1;
      let hasNext = true;

      while (hasNext && !this.abortController.signal.aborted) {
        const response = await this.github.getGists(page, 100);
        remoteGists.push(...response.gists);
        hasNext = response.hasNext;
        page++;
      }

      // Build map of remote gists by ID
      const remoteMap = new Map(remoteGists.map(g => [g.id, g]));

      // Get local gists
      const localGists = await this.db.getAllGists();

      // 1. Update or add remote gists
      for (const remoteGist of remoteGists) {
        const local = localGists.find(g => g.id === remoteGist.id);

        if (!local) {
          // New gist from GitHub
          await this.db.putGist(this.mapRemoteToRecord(remoteGist));
        } else if (remoteGist.updated_at > local.syncedAt) {
          // Remote is newer
          if (local.syncStatus === 'pending' && local.updatedAt > local.syncedAt) {
            // Local also changed -- mark as conflict
            await this.db.putGist({ ...local, syncStatus: 'conflict' });
          } else {
            // Only remote changed -- update
            await this.db.putGist({
              ...this.mapRemoteToRecord(remoteGist),
              starred: local.starred, // Preserve local star
              syncStatus: 'synced',
            });
          }
        }
      }

      // 2. Mark locally-only gists as needing sync
      const localIds = new Set(localGists.map(g => g.id));
      const remoteIds = new Set(remoteGists.map(g => g.id));

      for (const localGist of localGists) {
        if (localGist.id.startsWith('local_')) {
          // Local-only (created offline, not yet synced)
          // Queue will handle this
          continue;
        }
        if (!remoteIds.has(localGist.id) && localGist.syncStatus === 'synced') {
          // Gist was deleted on GitHub -- mark for local deletion
          await this.db.deleteGist(localGist.id);
        }
      }

      // Update last sync timestamp
      await this.db.setState('cache.lastFullSyncAt', Date.now());

    } finally {
      this.running = false;
    }
  }

  destroy(): void {
    this.abortController.abort();
  }
}
```

---

## Sync Queue Checklist

- [ ] All writes go through `OptimisticWriteManager`
- [ ] Queue items have bounded `attempts` counter (max 5)
- [ ] Exponential backoff with jitter on failures
- [ ] `nextRetryAt` prevents retrying too soon
- [ ] Queue processing stops when offline
- [ ] Queue auto-processes on `online` event
- [ ] Conflicts surface to user (not silently resolved)
- [ ] Created gists with temp IDs get real IDs after sync
- [ ] Deleted gists are removed from local DB after server confirm
- [ ] Stale queue items are cleaned up periodically
- [ ] Full sync runs periodically to catch missed changes
- [ ] ETag used for conditional requests (avoid unnecessary transfers)
- [ ] Queue is cleared on conflict resolution (stale items removed)
