---
name: offline-indexeddb
description: Implement offline-first storage using IndexedDB with optimistic writes, sync queue, conflict detection, and schema migrations.
version: "0.1.0"
template_version: "0.1.0"
---

# Offline-indexeddb Skill

Implement IndexedDB as the local source of truth for offline-first behavior.

## When to Use

- Setting up local storage layer
- Implementing offline write queue
- Handling sync conflicts
- Migrating database schema

## IndexedDB Schema

```typescript
// src/services/storage/schema.ts
export const DB_NAME = 'gist-hub';
export const DB_VERSION = 1;

export interface GistRecord {
  id: string;
  node_id: string;
  description: string | null;
  public: boolean;
  owner: string;
  files: Record<string, GistFileRecord>;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
  syncedAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  etag?: string;
}

export interface GistFileRecord {
  filename: string;
  content: string;
  type: string;
  language: string;
  size: number;
}

export interface SyncQueueItem {
  id: string;
  gistId: string;
  action: 'create' | 'update' | 'delete' | 'star' | 'unstar';
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface AppState {
  key: string;
  value: unknown;
  updatedAt: number;
}
```

## Database Initialization

```typescript
// src/services/storage/database.ts
export class GistDatabase {
  private db: IDBDatabase | null = null;

  async open(version = DB_VERSION): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, version);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Gists store
        if (!db.objectStoreNames.contains('gists')) {
          const gistStore = db.createObjectStore('gists', { keyPath: 'id' });
          gistStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          gistStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('gistId', 'gistId', { unique: false });
          queueStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // App state store
        if (!db.objectStoreNames.contains('appState')) {
          db.createObjectStore('appState', { keyPath: 'key' });
        }
      };
    });
  }

  async close(): void {
    this.db?.close();
    this.db = null;
  }
}
```

## Optimistic Write Pattern

```typescript
// src/services/storage/optimistic-writes.ts
export class OptimisticWrites {
  private db: GistDatabase;
  private syncQueue: SyncQueue;

  constructor(db: GistDatabase, syncQueue: SyncQueue) {
    this.db = db;
    this.syncQueue = syncQueue;
  }

  async updateGist(gistId: string, updates: Partial<GistRecord>): Promise<void> {
    // 1. Update local DB immediately
    const gist = await this.db.getGist(gistId);
    if (!gist) throw new Error('Gist not found');

    const updated = { ...gist, ...updates, syncStatus: 'pending' as const };
    await this.db.putGist(updated);

    // 2. Queue sync operation
    await this.syncQueue.enqueue({
      gistId,
      action: 'update',
      payload: updates,
      createdAt: Date.now(),
      attempts: 0,
    });

    // 3. Trigger background sync
    this.syncQueue.processQueue();
  }
}
```

## Sync Queue with Retry

```typescript
// src/services/storage/sync-queue.ts
export class SyncQueue {
  private processing = false;
  private maxAttempts = 3;
  private backoffMs = 1000;

  async enqueue(item: Omit<SyncQueueItem, 'id' | 'attempts'>): Promise<void> {
    await this.db.addSyncQueueItem({
      ...item,
      attempts: 0,
      createdAt: Date.now(),
    });
  }

  async processQueue(): Promise<void> {
    if (this.processing || !navigator.onLine) return;

    this.processing = true;
    const items = await this.db.getPendingQueueItems();

    for (const item of items) {
      if (item.attempts >= this.maxAttempts) {
        await this.db.markQueueItemFailed(item.id, 'Max attempts exceeded');
        continue;
      }

      try {
        await this.syncItem(item);
        await this.db.removeQueueItem(item.id);
      } catch (error) {
        const backoff = this.backoffMs * Math.pow(2, item.attempts);
        await this.db.incrementQueueItemAttempts(item.id, backoff);
      }
    }

    this.processing = false;
  }
}
```

## Gotchas

- **Async API**: IndexedDB is event-based, wrap in Promises
- **Connection Management**: Close DB when not in use, reopen on demand
- **Schema Migrations**: Handle version upgrades with migration paths
- **Storage Limits**: IndexedDB has ~6% of disk space quota, monitor usage
- **Transaction Errors**: Handle `TransactionInactiveError` and `VersionError`
- **Conflict Detection**: Use `etag` and `updatedAt` to detect conflicts
- **Cleanup**: Clear old sync queue items periodically

## Required Outputs

- `src/services/storage/database.ts` - IndexedDB wrapper
- `src/services/storage/schema.ts` - Type definitions
- `src/services/storage/optimistic-writes.ts` - Optimistic write pattern
- `src/services/storage/sync-queue.ts` - Sync queue processor
- `src/services/storage/conflict-detector.ts` - Conflict detection
- `docs/api/storage.md` - Storage documentation

## Verification

```bash
# Test offline behavior
npm run test:offline

# Verify IndexedDB in DevTools
# Application > IndexedDB > gist-hub

# Check sync queue processing
npm run test:browser
```

## References

- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- https://developer.android.com/topic/architecture/data-layer/offline-first
- `AGENTS.md` - Offline-first rules
- `global-error-handling` skill - Error handling patterns
