import { safeWarn } from './security/logger';
/**
 * IndexedDB Service
 * Offline-first local storage for gists and app data
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { APP } from '@/config/app.config';

// Schema version
const DB_VERSION = 3;
const DB_NAME = APP.dbName;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DBSchemaIndex = any;

/**
 * Database Schema Definition
 */
export interface GistDBSchema extends DBSchema {
  gists: {
    key: string;
    value: GistRecord;
    indexes: {
      'by-updated-at': string;
      'by-starred': boolean;
      'by-sync-status': string;
    };
  };
  pendingWrites: {
    key: number;
    value: PendingWrite;
    indexes: {
      'by-created-at': number;
      'by-gist-id': string;
    };
  };
  metadata: {
    key: string;
    value: MetadataRecord;
  };
  etags: {
    key: string;
    value: ETagRecord;
  };
  logs: {
    key: number;
    value: LogEntry;
    indexes: {
      'by-timestamp': number;
      'by-level': string;
    };
  };
  [key: string]: DBSchemaIndex;
}

/**
 * Gist Record stored in IndexedDB
 */
export interface GistRecord {
  id: string;
  description: string | null;
  files: Record<string, GistFile>;
  htmlUrl: string;
  gitPullUrl: string;
  gitPushUrl: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  public: boolean;
  owner?: GistOwner;
  truncated?: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  lastSyncedAt?: string;
  localVersion?: number;
  remoteVersion?: number;
}

/**
 * Individual file within a gist
 */
export interface GistFile {
  filename: string;
  type?: string;
  language?: string;
  rawUrl?: string;
  size?: number;
  truncated?: boolean;
  content?: string; // Stored locally for offline access
}

/**
 * Gist owner information
 */
export interface GistOwner {
  login: string;
  id: number;
  avatarUrl: string;
  htmlUrl: string;
}

/**
 * Pending write operation (for offline queue)
 */
export interface PendingWrite {
  id?: number;
  gistId: string;
  action: 'create' | 'update' | 'delete' | 'star' | 'unstar' | 'fork';
  payload: unknown;
  createdAt: number;
  retryCount: number;
  lastAttemptAt?: number;
  error?: string;
  /** Remote `updated_at` timestamp at queue time; used for pre-write conflict detection */
  expectedRemoteVersion?: string;
}

/**
 * Metadata records (app settings, sync state, etc.)
 */
export interface MetadataRecord {
  key: string;
  value: unknown;
  updatedAt: number;
}

/**
 * ETag record for API caching
 */
export interface ETagRecord {
  url: string;
  etag: string;
  data: unknown;
  updatedAt: number;
}

/**
 * Log entry stored in IndexedDB
 */
export interface LogEntry {
  id?: number;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

let dbInstance: IDBPDatabase<GistDBSchema> | null = null;

/**
 * Initialize IndexedDB database
 */
export async function initIndexedDB(): Promise<IDBPDatabase<GistDBSchema>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<GistDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      safeWarn(`[IndexedDB] Upgrading from ${oldVersion} to ${newVersion}`);

      if (oldVersion < 1) {
        // Create gists store
        const gistStore = db.createObjectStore('gists', { keyPath: 'id' });
        gistStore.createIndex('by-updated-at', 'updatedAt');
        gistStore.createIndex('by-starred', 'starred');
        gistStore.createIndex('by-sync-status', 'syncStatus');

        // Create pending writes store (queue for offline operations)
        const pendingStore = db.createObjectStore('pendingWrites', {
          keyPath: 'id',
          autoIncrement: true,
        });
        pendingStore.createIndex('by-created-at', 'createdAt');
        pendingStore.createIndex('by-gist-id', 'gistId');

        // Create metadata store
        db.createObjectStore('metadata', { keyPath: 'key' });
      }

      if (oldVersion < 2) {
        // Create logs store
        const logStore = db.createObjectStore('logs', {
          keyPath: 'id',
          autoIncrement: true,
        });
        logStore.createIndex('by-timestamp', 'timestamp');
        logStore.createIndex('by-level', 'level');
      }

      if (oldVersion < 3) {
        // Create etags store
        db.createObjectStore('etags', { keyPath: 'url' });
      }
    },

    blocked() {
      safeWarn('[IndexedDB] Database blocked by another connection');
    },

    blocking() {
      safeWarn('[IndexedDB] Database blocking upgrade');
      dbInstance?.close();
    },

    terminated() {
      safeWarn('[IndexedDB] Database connection terminated');
      dbInstance = null;
    },
  });

  return dbInstance;
}

/**
 * Get database instance (must call initIndexedDB first)
 */
export function getDB(): IDBPDatabase<GistDBSchema> {
  if (!dbInstance) {
    throw new Error('[IndexedDB] Database not initialized. Call initIndexedDB() first.');
  }
  return dbInstance;
}

/**
 * Close database connection
 */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Store gist in local database
 */
export async function saveGist(gist: GistRecord): Promise<void> {
  const db = getDB();
  await db.put('gists', {
    ...gist,
    syncStatus: gist.syncStatus || 'synced',
    lastSyncedAt: new Date().toISOString(),
  });
}

/**
 * Store multiple gists in local database using a single transaction
 */
export async function saveGists(gists: GistRecord[]): Promise<void> {
  if (gists.length === 0) return;

  const db = getDB();
  const tx = db.transaction('gists', 'readwrite');
  const now = new Date().toISOString();

  // Initiate all puts and await their creation
  await Promise.all(
    gists.map((gist) =>
      tx.store.put({
        ...gist,
        syncStatus: gist.syncStatus || 'synced',
        lastSyncedAt: now,
      })
    )
  );

  // Await transaction completion
  await tx.done;
}

/**
 * Get gist from local database
 */
export async function getGist(id: string): Promise<GistRecord | undefined> {
  const db = getDB();
  return await db.get('gists', id);
}

/**
 * Get all gists from local database
 */
export async function getAllGists(): Promise<GistRecord[]> {
  const db = getDB();
  return await db.getAll('gists');
}

/**
 * Delete gist from local database
 */
export async function deleteGist(id: string): Promise<void> {
  const db = getDB();
  await db.delete('gists', id);
}

/**
 * Queue a write operation for later sync
 */
export async function queueWrite(
  write: Omit<PendingWrite, 'id' | 'createdAt' | 'retryCount'>
): Promise<number> {
  const db = getDB();
  const id = await db.add('pendingWrites', {
    ...write,
    createdAt: Date.now(),
    retryCount: 0,
  });
  return id;
}

/**
 * Get all pending writes
 */
export async function getPendingWrites(): Promise<PendingWrite[]> {
  const db = getDB();
  return await db.getAll('pendingWrites');
}

/**
 * Remove pending write after successful sync
 */
export async function removePendingWrite(id: number): Promise<void> {
  const db = getDB();
  await db.delete('pendingWrites', id);
}

/**
 * Update pending write retry count
 */
export async function updatePendingWriteError(id: number, error: string): Promise<void> {
  const db = getDB();
  const write = await db.get('pendingWrites', id);
  if (write) {
    await db.put('pendingWrites', {
      ...write,
      retryCount: write.retryCount + 1,
      lastAttemptAt: Date.now(),
      error,
    });
  }
}

/**
 * Store metadata
 */
export async function setMetadata(key: string, value: unknown): Promise<void> {
  const db = getDB();
  await db.put('metadata', {
    key,
    value,
    updatedAt: Date.now(),
  });
}

/**
 * Get metadata
 */
export async function getMetadata<T>(key: string): Promise<T | undefined> {
  const db = getDB();
  const record = await db.get('metadata', key);
  return record?.value as T;
}

/**
 * Store ETag information
 */
export const setEtag = async (url: string, etag: string, data: unknown): Promise<void> => {
  const db = getDB();
  await db.put('etags', {
    url,
    etag,
    data,
    updatedAt: Date.now(),
  });
};

/**
 * Get ETag information
 */
export const getEtag = async (url: string): Promise<ETagRecord | undefined> => {
  const db = getDB();
  return await db.get('etags', url);
};

/**
 * Clear all data (for logout/reset)
 */
export const clearAllData = async (): Promise<void> => {
  const db = getDB();
  const tx = db.transaction(['gists', 'pendingWrites', 'metadata', 'logs', 'etags'], 'readwrite');
  await tx.objectStore('gists').clear();
  await tx.objectStore('pendingWrites').clear();
  await tx.objectStore('metadata').clear();
  await tx.objectStore('logs').clear();
  await tx.objectStore('etags').clear();
  await tx.done;
};

/**
 * Export data for backup.
 * Sentinel: Filters out sensitive encryption keys and tokens from the export
 * to prevent potential exposure of secrets in plain-text backup files.
 */
export async function exportData(): Promise<string> {
  const db = getDB();
  const gists = await db.getAll('gists');
  const pendingWrites = await db.getAll('pendingWrites');
  const metadata = await db.getAll('metadata');
  const logs = await db.getAll('logs');

  // Sentinel: Sensitive secrets (PATs and encryption keys) are excluded from
  // standard exports. This ensures that a compromised backup file does not
  // leak credentials, although it requires re-authentication on restore.
  const SENSITIVE_METADATA_KEYS = ['gist-hub-master-key', 'github-pat-enc', 'github-pat'];
  const safeMetadata = metadata.filter((m) => !SENSITIVE_METADATA_KEYS.includes(m.key));

  const data = {
    version: '3.0.0',
    exportedAt: new Date().toISOString(),
    gists,
    pendingWrites,
    metadata: safeMetadata,
    logs,
  };

  return JSON.stringify(data);
}

/**
 * Import data from backup
 */
export async function importData(json: string): Promise<void> {
  const db = getDB();
  const data = JSON.parse(json);

  const tx = db.transaction(['gists', 'pendingWrites', 'metadata', 'logs'], 'readwrite');

  // Clear existing data
  // Import gists
  // Import pending writes
  // Import metadata
  // Import logs
  const storeDataMap: Record<string, unknown[]> = {
    gists: data.gists,
    pendingWrites: data.pendingWrites,
    metadata: data.metadata,
    logs: data.logs || [],
  };

  for (const [storeName, items] of Object.entries(storeDataMap)) {
    const store = tx.objectStore(storeName as never);
    await store.clear();
    await Promise.all(items.map((item) => store.put(item)));
  }

  await tx.done;
}
