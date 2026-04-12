# IndexedDB Schema Reference

Complete schema definition, migration guide, and API patterns for Gist Hub's local database.

## Database Overview

| Property | Value |
|----------|-------|
| Database name | `gist-hub` |
| Current version | `1` |
| Object stores | `gists`, `syncQueue`, `appState` |
| Access pattern | Offline-first, optimistic writes |

---

## Schema Definition

### Object Store: `gists`

Primary store for cached GitHub gists. Source of truth for offline reads.

| Field | Type | Index | Notes |
|-------|------|-------|-------|
| `id` | `string` | **primaryKey** | Gist ID (e.g., `"abc123def"`) |
| `node_id` | `string` | | GitHub's node ID (opaque) |
| `description` | `string \| null` | | Gist description/title |
| `public` | `boolean` | | Whether gist is public |
| `owner` | `string` | | GitHub username |
| `files` | `Record<string, GistFile>` | | Map of filename to file data |
| `starred` | `boolean` | | Local star status |
| `createdAt` | `string` | | ISO 8601 creation timestamp |
| `updatedAt` | `string` | **index** | ISO 8601 last update (used for sync ordering) |
| `syncedAt` | `string` | | ISO 8601 when last synced from GitHub |
| `syncStatus` | `'synced' \| 'pending' \| 'conflict'` | **index** | Current sync state |
| `etag` | `string \| undefined` | | GitHub ETag for conditional requests |

```typescript
interface GistRecord {
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

interface GistFileRecord {
  filename: string;
  content: string;
  type: string;       // MIME type
  language: string;   // Detected language
  size: number;       // Bytes
  truncated?: boolean;
  raw_url?: string;
}
```

### Object Store: `syncQueue`

Write-ahead queue for offline operations. Items are processed FIFO when back online.

| Field | Type | Index | Notes |
|-------|------|-------|-------|
| `id` | `number` (auto) | **primaryKey** | Auto-increment ID |
| `gistId` | `string` | **index** | Associated gist ID |
| `action` | `'create' \| 'update' \| 'delete' \| 'star' \| 'unstar'` | | Sync action type |
| `payload` | `unknown` | | Action-specific data |
| `createdAt` | `number` | **index** | Unix timestamp (used for ordering) |
| `attempts` | `number` | | Number of sync attempts |
| `lastError` | `string \| undefined` | | Last error message |
| `nextRetryAt` | `number \| undefined` | | When to retry (for backoff) |

```typescript
interface SyncQueueItem {
  id: number;
  gistId: string;
  action: 'create' | 'update' | 'delete' | 'star' | 'unstar';
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
  nextRetryAt?: number;
}
```

### Object Store: `appState`

Key-value store for application settings and metadata.

| Field | Type | Index | Notes |
|-------|------|-------|-------|
| `key` | `string` | **primaryKey** | Setting key |
| `value` | `unknown` | | Serialized value |
| `updatedAt` | `number` | | Unix timestamp |

```typescript
interface AppStateEntry {
  key: string;
  value: unknown;
  updatedAt: number;
}
```

Known state keys:
- `auth.patHash` -- SHA-256 hash of PAT (for validation, never store raw PAT)
- `auth.username` -- Authenticated GitHub username
- `auth.lastValidatedAt` -- When PAT was last validated
- `settings.theme` -- `'light' | 'dark' | 'auto'`
- `settings.itemsPerPage` -- Number of gists per page
- `cache.lastFullSyncAt` -- When last full sync completed
- `cache.gistListPage` -- Last fetched page number for pagination

---

## Database Class Implementation

```typescript
// src/services/storage/database.ts
const DB_NAME = 'gist-hub';
const DB_VERSION = 1;

export class GistDatabase implements Disposable {
  private db: IDBDatabase | null = null;
  private openPromise: Promise<void> | null = null;

  async open(version = DB_VERSION): Promise<void> {
    if (this.openPromise) return this.openPromise;

    this.openPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, version);

      request.onerror = () => {
        reject(new AppError(
          ErrorCode.INDEXEDDB_UNAVAILABLE,
          'Failed to open local database',
          request.error,
        ));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion || 0;
        this.runMigrations(db, oldVersion, version);
      };
    });

    return this.openPromise;
  }

  private runMigrations(db: IDBDatabase, oldVersion: number, newVersion: number): void {
    if (oldVersion < 1) {
      this.migrateV1(db);
    }
    // Future: if (oldVersion < 2) { this.migrateV2(db); }
  }

  private migrateV1(db: IDBDatabase): void {
    // Gists store
    const gistStore = db.createObjectStore('gists', { keyPath: 'id' });
    gistStore.createIndex('updatedAt', 'updatedAt', { unique: false });
    gistStore.createIndex('syncStatus', 'syncStatus', { unique: false });
    gistStore.createIndex('owner', 'owner', { unique: false });

    // Sync queue store
    const queueStore = db.createObjectStore('syncQueue', {
      keyPath: 'id',
      autoIncrement: true,
    });
    queueStore.createIndex('gistId', 'gistId', { unique: false });
    queueStore.createIndex('createdAt', 'createdAt', { unique: false });
    queueStore.createIndex('nextRetryAt', 'nextRetryAt', { unique: false });

    // App state store
    db.createObjectStore('appState', { keyPath: 'key' });
  }

  // -- Gist operations --

  async getGist(id: string): Promise<GistRecord | undefined> {
    await this.ensureOpen();
    return this.transaction('gists', 'readonly', (store) => {
      return promisifyRequest<GistRecord | undefined>(store.get(id));
    });
  }

  async getAllGists(sortBy: 'updatedAt' | 'createdAt' = 'updatedAt'): Promise<GistRecord[]> {
    await this.ensureOpen();
    return this.transaction('gists', 'readonly', (store) => {
      const index = store.index(sortBy);
      return promisifyRequest<GistRecord[]>(index.getAll(null, undefined, 'prev'));
    });
  }

  async putGist(gist: GistRecord): Promise<void> {
    await this.ensureOpen();
    return this.transaction('gists', 'readwrite', (store) => {
      return promisifyRequest(store.put(gist));
    });
  }

  async deleteGist(id: string): Promise<void> {
    await this.ensureOpen();
    return this.transaction('gists', 'readwrite', (store) => {
      return promisifyRequest(store.delete(id));
    });
  }

  // -- Sync queue operations --

  async enqueueSyncItem(item: Omit<SyncQueueItem, 'id' | 'attempts'>): Promise<void> {
    await this.ensureOpen();
    return this.transaction('syncQueue', 'readwrite', (store) => {
      return promisifyRequest(store.add({
        ...item,
        attempts: 0,
        createdAt: Date.now(),
      }));
    });
  }

  async getPendingQueueItems(): Promise<SyncQueueItem[]> {
    await this.ensureOpen();
    return this.transaction('syncQueue', 'readonly', (store) => {
      const index = store.index('createdAt');
      return promisifyRequest<SyncQueueItem[]>(index.getAll());
    });
  }

  async getDueQueueItems(): Promise<SyncQueueItem[]> {
    await this.ensureOpen();
    return this.transaction('syncQueue', 'readonly', (store) => {
      const index = store.index('nextRetryAt');
      const now = Date.now();
      return promisifyRequest<SyncQueueItem[]>(index.getAll(IDBKeyRange.upperBound(now)));
    });
  }

  async removeQueueItem(id: number): Promise<void> {
    await this.ensureOpen();
    return this.transaction('syncQueue', 'readwrite', (store) => {
      return promisifyRequest(store.delete(id));
    });
  }

  async updateQueueItem(id: number, updates: Partial<SyncQueueItem>): Promise<void> {
    await this.ensureOpen();
    return this.transaction('syncQueue', 'readwrite', async (store) => {
      const item = await promisifyRequest<SyncQueueItem>(store.get(id));
      if (!item) return;
      Object.assign(item, updates);
      return promisifyRequest(store.put(item));
    });
  }

  // -- App state operations --

  async getState<T>(key: string): Promise<T | undefined> {
    await this.ensureOpen();
    return this.transaction('appState', 'readonly', (store) => {
      return promisifyRequest<AppStateEntry | undefined>(store.get(key))
        .then(entry => entry?.value as T | undefined);
    });
  }

  async setState(key: string, value: unknown): Promise<void> {
    await this.ensureOpen();
    return this.transaction('appState', 'readwrite', (store) => {
      return promisifyRequest(store.put({
        key,
        value,
        updatedAt: Date.now(),
      }));
    });
  }

  // -- Maintenance --

  async clearSyncQueue(): Promise<void> {
    await this.ensureOpen();
    return this.transaction('syncQueue', 'readwrite', (store) => {
      return promisifyRequest(store.clear());
    });
  }

  async clearAll(): Promise<void> {
    await this.ensureOpen();
    return this.transaction(['gists', 'syncQueue', 'appState'], 'readwrite', (stores) => {
      const promises = stores.map(store => promisifyRequest(store.clear()));
      return Promise.all(promises);
    });
  }

  // -- Lifecycle --

  private async ensureOpen(): Promise<void> {
    if (!this.db) {
      await this.open();
    }
  }

  private transaction<Stores extends string | string[], T>(
    storeNames: Stores,
    mode: IDBTransactionMode,
    fn: (store: Stores extends string[] ? IDBObjectStore[] : IDBObjectStore) => T,
  ): T {
    const db = this.db!;
    const tx = db.transaction(storeNames as string | string[], mode);
    const stores = (Array.isArray(storeNames)
      ? storeNames.map(name => tx.objectStore(name))
      : tx.objectStore(storeNames)) as Stores extends string[] ? IDBObjectStore[] : IDBObjectStore;
    return fn(stores);
  }

  destroy(): void {
    this.db?.close();
    this.db = null;
    this.openPromise = null;
  }
}

// Utility: Wrap IDBRequest in Promise
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

---

## Migration Guide

### When to Increment Version

Increment `DB_VERSION` when you need to:
- Add a new object store
- Add a new index
- Change a field's type
- Add/remove fields

**Do not** increment version for:
- Adding new fields with default values (handled at application level)
- Changing non-schema logic

### Migration Pattern

```typescript
private runMigrations(db: IDBDatabase, oldVersion: number, newVersion: number): void {
  // Each migration is a case: it runs if oldVersion < targetVersion
  if (oldVersion < 1) this.migrateV1(db);
  if (oldVersion < 2) this.migrateV2(db);
  if (oldVersion < 3) this.migrateV3(db);
  // ...
}

// Example: Future V2 migration adding a 'tags' field
private migrateV2(db: IDBDatabase): void {
  const gistStore = db.transaction.objectStore('gists');

  // Add new index
  if (!gistStore.indexNames.contains('starred')) {
    gistStore.createIndex('starred', 'starred', { unique: false });
  }

  // Walk existing records and add default value
  const cursorRequest = gistStore.openCursor();
  cursorRequest.onsuccess = (event) => {
    const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
    if (cursor) {
      const value = cursor.value;
      if (!value.tags) {
        value.tags = [];
        cursor.update(value);
      }
      cursor.continue();
    }
  };
}
```

### Migration Failure Recovery

```typescript
request.onupgradeneeded = (event) => {
  try {
    const db = (event.target as IDBOpenDBRequest).result;
    this.runMigrations(db, event.oldVersion || 0, DB_VERSION);
  } catch (error) {
    // Migration failed -- delete DB and start fresh
    console.error('[Database] Migration failed, resetting:', error);
    request.transaction?.abort();
    indexedDB.deleteDatabase(DB_NAME);
    // Re-open will trigger from version 0
    setTimeout(() => this.open(), 100);
  }
};
```

---

## Storage Quota Management

IndexedDB storage is bounded by browser quotas. Monitor usage:

```typescript
// src/services/storage/quota-monitor.ts
export async function checkStorageQuota(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
}> {
  if (!navigator.storage?.estimate) {
    return { usage: 0, quota: Infinity, percentUsed: 0 };
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage ?? 0;
  const quota = estimate.quota ?? Infinity;
  const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

  return { usage, quota, percentUsed };
}

// If quota exceeded, prune old gists
export async function pruneOldGists(db: GistDatabase): Promise<void> {
  const { percentUsed } = await checkStorageQuota();

  if (percentUsed < 80) return; // Under threshold

  // Remove oldest synced gists (not starred, not pending)
  const gists = await db.getAllGists();
  const toDelete = gists
    .filter(g => g.syncStatus === 'synced' && !g.starred)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .slice(0, Math.floor(gists.length * 0.3)); // Delete oldest 30%

  for (const gist of toDelete) {
    await db.deleteGist(gist.id);
  }
}
```

---

## Schema Checklist

When modifying the schema:

- [ ] Update TypeScript interfaces
- [ ] Add migration function (`migrateV{n}`)
- [ ] Increment `DB_VERSION`
- [ ] Handle migration failure (delete and recreate)
- [ ] Update this reference document
- [ ] Test migration with a copy of production-like data
- [ ] Verify rollback path (what if migration fails mid-way?)
