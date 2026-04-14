/**
 * IndexedDB Service
 * Offline-first local storage for gists and app data
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { APP } from '@/config/app.config';

// Schema version
const DB_VERSION = 1;
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
  content?: string;  // Stored locally for offline access
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
}

/**
 * Metadata records (app settings, sync state, etc.)
 */
export interface MetadataRecord {
  key: string;
  value: unknown;
  updatedAt: number;
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
      console.log(`[IndexedDB] Upgrading from ${oldVersion} to ${newVersion}`);
      
      // Create gists store
      const gistStore = db.createObjectStore('gists', { keyPath: 'id' });
      gistStore.createIndex('by-updated-at', 'updatedAt');
      gistStore.createIndex('by-starred', 'starred');
      gistStore.createIndex('by-sync-status', 'syncStatus');
      
      // Create pending writes store (queue for offline operations)
      const pendingStore = db.createObjectStore('pendingWrites', { 
        keyPath: 'id', 
        autoIncrement: true 
      });
      pendingStore.createIndex('by-created-at', 'createdAt');
      pendingStore.createIndex('by-gist-id', 'gistId');
      
      // Create metadata store
      db.createObjectStore('metadata', { keyPath: 'key' });
    },
    
    blocked() {
      console.warn('[IndexedDB] Database blocked by another connection');
    },
    
    blocking() {
      console.warn('[IndexedDB] Database blocking upgrade');
      dbInstance?.close();
    },
    
    terminated() {
      console.warn('[IndexedDB] Database connection terminated');
      dbInstance = null;
    },
  });
  
  console.log('[IndexedDB] Initialized successfully');
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
    console.log('[IndexedDB] Connection closed');
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
  console.log(`[IndexedDB] Saved gist: ${gist.id}`);
}

/**
 * Get gist from local database
 */
export async function getGist(id: string): Promise<GistRecord | undefined> {
  const db = getDB();
  return db.get('gists', id);
}

/**
 * Get all gists from local database
 */
export async function getAllGists(): Promise<GistRecord[]> {
  const db = getDB();
  return db.getAll('gists');
}

/**
 * Delete gist from local database
 */
export async function deleteGist(id: string): Promise<void> {
  const db = getDB();
  await db.delete('gists', id);
  console.log(`[IndexedDB] Deleted gist: ${id}`);
}

/**
 * Queue a write operation for later sync
 */
export async function queueWrite(write: Omit<PendingWrite, 'id' | 'createdAt' | 'retryCount'>): Promise<number> {
  const db = getDB();
  const id = await db.add('pendingWrites', {
    ...write,
    createdAt: Date.now(),
    retryCount: 0,
  });
  console.log(`[IndexedDB] Queued write operation: ${write.action} for gist ${write.gistId}`);
  return id;
}

/**
 * Get all pending writes
 */
export async function getPendingWrites(): Promise<PendingWrite[]> {
  const db = getDB();
  return db.getAll('pendingWrites');
}

/**
 * Remove pending write after successful sync
 */
export async function removePendingWrite(id: number): Promise<void> {
  const db = getDB();
  await db.delete('pendingWrites', id);
  console.log(`[IndexedDB] Removed pending write: ${id}`);
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
 * Clear all data (for logout/reset)
 */
export async function clearAllData(): Promise<void> {
  const db = getDB();
  const tx = db.transaction(['gists', 'pendingWrites', 'metadata'], 'readwrite');
  await tx.objectStore('gists').clear();
  await tx.objectStore('pendingWrites').clear();
  await tx.objectStore('metadata').clear();
  await tx.done;
  console.log('[IndexedDB] All data cleared');
}

/**
 * Export data for backup
 */
export async function exportData(): Promise<string> {
  const db = getDB();
  const gists = await db.getAll('gists');
  const pendingWrites = await db.getAll('pendingWrites');
  const metadata = await db.getAll('metadata');
  
  const data = {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    gists,
    pendingWrites,
    metadata,
  };
  
  return JSON.stringify(data);
}

/**
 * Import data from backup
 */
export async function importData(json: string): Promise<void> {
  const db = getDB();
  const data = JSON.parse(json);
  
  const tx = db.transaction(['gists', 'pendingWrites', 'metadata'], 'readwrite');
  
  // Clear existing data
  await tx.objectStore('gists').clear();
  await tx.objectStore('pendingWrites').clear();
  await tx.objectStore('metadata').clear();
  
  // Import gists
  for (const gist of data.gists) {
    await tx.objectStore('gists').put(gist);
  }
  
  // Import pending writes
  for (const write of data.pendingWrites) {
    await tx.objectStore('pendingWrites').put(write);
  }
  
  // Import metadata
  for (const meta of data.metadata) {
    await tx.objectStore('metadata').put(meta);
  }
  
  await tx.done;
  console.log('[IndexedDB] Data imported successfully');
}
