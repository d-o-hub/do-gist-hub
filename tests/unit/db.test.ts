import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { openDB, deleteDB } from 'idb';

import {
  initIndexedDB,
  getDB,
  closeDB,
  saveGist,
  saveGists,
  getGist,
  flushGistWrites,
  getAllGists,
  deleteGist,
  queueWrite,
  getPendingWrites,
  removePendingWrite,
  updatePendingWriteError,
  setMetadata,
  getMetadata,
  clearAllData,
  type GistRecord,
} from '../../src/services/db';

// ─── Helpers ───────────────────────────────────────────────────────────

function makeGistRecord(id: string, overrides: Partial<GistRecord> = {}): GistRecord {
  return {
    id,
    description: `Gist ${id}`,
    files: { 'test.txt': { filename: 'test.txt', content: 'hello' } },
    htmlUrl: `https://gist.github.com/${id}`,
    gitPullUrl: `https://api.github.com/gists/${id}/git/pull`,
    gitPushUrl: `https://api.github.com/gists/${id}/git/push`,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    starred: false,
    public: true,
    syncStatus: 'synced',
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────

describe('db', () => {
  beforeEach(async () => {
    await closeDB();
    try {
      await deleteDB('d-o-gist-hub-db');
    } catch {
      // Ignore if DB doesn't exist
    }
  });

  afterEach(async () => {
    await closeDB();
    try {
      await deleteDB('d-o-gist-hub-db');
    } catch {
      // Ignore
    }
  });

  // ── initIndexedDB ──────────────────────────────────────────────────

  describe('initIndexedDB', () => {
    it('creates database with correct name and version', async () => {
      const db = await initIndexedDB();
      expect(db.name).toBe('d-o-gist-hub-db');
      expect(db.version).toBe(2);
    });

    it('creates object stores: gists, pendingWrites, metadata, logs', async () => {
      const db = await initIndexedDB();
      expect(db.objectStoreNames.contains('gists')).toBe(true);
      expect(db.objectStoreNames.contains('pendingWrites')).toBe(true);
      expect(db.objectStoreNames.contains('metadata')).toBe(true);
      expect(db.objectStoreNames.contains('logs')).toBe(true);
    });

    it('returns cached instance on subsequent calls', async () => {
      const db1 = await initIndexedDB();
      const db2 = await initIndexedDB();
      expect(db1).toBe(db2);
    });

    it('creates indexes on gists store', async () => {
      const db = await initIndexedDB();
      const transaction = db.transaction('gists', 'readonly');
      const store = transaction.objectStore('gists');
      expect(store.indexNames.contains('by-updated-at')).toBe(true);
      expect(store.indexNames.contains('by-starred')).toBe(true);
      expect(store.indexNames.contains('by-sync-status')).toBe(true);
    });
  });

  // ── getDB ──────────────────────────────────────────────────────────

  describe('getDB', () => {
    it('throws if called before initIndexedDB', () => {
      expect(() => getDB()).toThrow('[IndexedDB] Database not initialized');
    });

    it('returns the database instance after init', async () => {
      await initIndexedDB();
      const db = getDB();
      expect(db).toBeDefined();
      expect(db.name).toBe('d-o-gist-hub-db');
    });
  });

  // ── saveGist / getGist ────────────────────────────────────────────

  describe('saveGist / getGist', () => {
    beforeEach(async () => {
      await initIndexedDB();
    });

    it('saves a gist and retrieves it by id', async () => {
      const record = makeGistRecord('gist-1');
      await saveGist(record);
      await flushGistWrites();

      const result = await getGist('gist-1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('gist-1');
      expect(result?.description).toBe('Gist gist-1');
      expect(result?.files['test.txt']?.content).toBe('hello');
    });

    it('returns undefined for non-existent gist', async () => {
      const result = await getGist('non-existent');
      expect(result).toBeUndefined();
    });

    it('overwrites existing gist with same id', async () => {
      const record1 = makeGistRecord('gist-1', { description: 'First' });
      const record2 = makeGistRecord('gist-1', { description: 'Second' });

      await saveGist(record1);
      await saveGist(record2);
      await flushGistWrites();

      const result = await getGist('gist-1');
      expect(result?.description).toBe('Second');
    });

    it('sets default syncStatus to synced if not provided', async () => {
      const record = makeGistRecord('gist-1', { syncStatus: undefined as never });
      await saveGist(record);
      await flushGistWrites();

      const result = await getGist('gist-1');
      expect(result?.syncStatus).toBe('synced');
    });
  });

  // ── saveGists (batch) ────────────────────────────────────────────

  describe('saveGists', () => {
    beforeEach(async () => {
      await initIndexedDB();
    });

    it('saves multiple gists in a single transaction', async () => {
      const records = [
        makeGistRecord('gist-1'),
        makeGistRecord('gist-2'),
        makeGistRecord('gist-3'),
      ];

      await saveGists(records);

      const all = await getAllGists();
      expect(all).toHaveLength(3);
    });

    it('handles empty array without error', async () => {
      await expect(saveGists([])).resolves.not.toThrow();
    });
  });

  // ── getAllGists ──────────────────────────────────────────────────

  describe('getAllGists', () => {
    beforeEach(async () => {
      await initIndexedDB();
    });

    it('returns all saved gists', async () => {
      await saveGist(makeGistRecord('a'));
      await saveGist(makeGistRecord('b'));
      await flushGistWrites();

      const all = await getAllGists();
      expect(all).toHaveLength(2);
    });

    it('returns empty array when no gists exist', async () => {
      const all = await getAllGists();
      expect(all).toEqual([]);
    });
  });

  // ── deleteGist ───────────────────────────────────────────────────

  describe('deleteGist', () => {
    beforeEach(async () => {
      await initIndexedDB();
    });

    it('removes a gist by id', async () => {
      await saveGist(makeGistRecord('to-delete'));
      await flushGistWrites();
      expect(await getGist('to-delete')).toBeDefined();

      await deleteGist('to-delete');
      expect(await getGist('to-delete')).toBeUndefined();
    });

    it('does not throw when deleting non-existent gist', async () => {
      await expect(deleteGist('non-existent')).resolves.not.toThrow();
    });
  });

  // ── queueWrite / getPendingWrites ────────────────────────────────

  describe('pending writes queue', () => {
    beforeEach(async () => {
      await initIndexedDB();
    });

    it('adds a write to the pending queue', async () => {
      const id = await queueWrite({
        gistId: 'gist-1',
        action: 'create',
        payload: { description: 'test' },
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('number');

      const writes = await getPendingWrites();
      expect(writes).toHaveLength(1);
      expect(writes[0]?.gistId).toBe('gist-1');
      expect(writes[0]?.action).toBe('create');
      expect(writes[0]?.retryCount).toBe(0);
    });

    it('sets createdAt timestamp on queued writes', async () => {
      const before = Date.now();
      await queueWrite({
        gistId: 'gist-1',
        action: 'update',
        payload: {},
      });
      const after = Date.now();

      const writes = await getPendingWrites();
      expect(writes[0]?.createdAt).toBeGreaterThanOrEqual(before);
      expect(writes[0]?.createdAt).toBeLessThanOrEqual(after);
    });

    it('retrieves multiple pending writes', async () => {
      await queueWrite({ gistId: 'b', action: 'update', payload: {} });
      await queueWrite({ gistId: 'a', action: 'create', payload: {} });
      await queueWrite({ gistId: 'c', action: 'delete', payload: {} });

      const writes = await getPendingWrites();
      expect(writes).toHaveLength(3);
    });
  });

  // ── removePendingWrite ────────────────────────────────────────────

  describe('removePendingWrite', () => {
    beforeEach(async () => {
      await initIndexedDB();
    });

    it('removes a pending write by id', async () => {
      const id = await queueWrite({
        gistId: 'gist-1',
        action: 'create',
        payload: {},
      });

      await removePendingWrite(id);
      const writes = await getPendingWrites();
      expect(writes).toHaveLength(0);
    });
  });

  // ── updatePendingWriteError ────────────────────────────────────────

  describe('updatePendingWriteError', () => {
    beforeEach(async () => {
      await initIndexedDB();
    });

    it('increments retry count and stores error message', async () => {
      const id = await queueWrite({
        gistId: 'gist-1',
        action: 'create',
        payload: {},
      });

      await updatePendingWriteError(id, 'Network error');

      const writes = await getPendingWrites();
      expect(writes[0]?.retryCount).toBe(1);
      expect(writes[0]?.error).toBe('Network error');
    });
  });

  // ── setMetadata / getMetadata ────────────────────────────────────

  describe('metadata', () => {
    beforeEach(async () => {
      await initIndexedDB();
    });

    it('stores and retrieves metadata value', async () => {
      await setMetadata('test-key', { foo: 'bar' });
      const value = await getMetadata<{ foo: string }>('test-key');
      expect(value).toEqual({ foo: 'bar' });
    });

    it('returns undefined for non-existent key', async () => {
      const value = await getMetadata('non-existent');
      expect(value).toBeUndefined();
    });

    it('overwrites existing metadata', async () => {
      await setMetadata('key', 'v1');
      await setMetadata('key', 'v2');
      const value = await getMetadata<string>('key');
      expect(value).toBe('v2');
    });
  });

  // ── clearAllData ─────────────────────────────────────────────────

  describe('clearAllData', () => {
    it('clears all object stores', async () => {
      await initIndexedDB();
      await saveGist(makeGistRecord('gist-1'));
      await queueWrite({ gistId: 'gist-1', action: 'create', payload: {} });
      await setMetadata('key', 'value');

      await clearAllData();

      expect(await getAllGists()).toHaveLength(0);
      expect(await getPendingWrites()).toHaveLength(0);
      expect(await getMetadata('key')).toBeUndefined();
    });
  });
});
