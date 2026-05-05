import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';

import {
  initIndexedDB,
  closeDB,
  saveGist,
  getGist,
  getAllGists,
  queueWrite,
  getPendingWrites,
  flushGistWrites,
  GistRecord,
} from '../../src/services/db';

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

describe('db optimizations', () => {
  beforeEach(async () => {
    await closeDB();
    try {
      await deleteDB('d-o-gist-hub-db');
    } catch {
      // Ignore
    }
    await initIndexedDB();
  });

  afterEach(async () => {
    await closeDB();
    try {
      await deleteDB('d-o-gist-hub-db');
    } catch {
      // Ignore
    }
  });

  describe('batch writes', () => {
    it('batches multiple saveGist calls', async () => {
      await saveGist(makeGistRecord('gist-1'));
      await saveGist(makeGistRecord('gist-2'));
      await saveGist(makeGistRecord('gist-3'));

      // Check in-memory consistency (we now return pending writes in getAllGists)
      const allMerged = await getAllGists();
      expect(allMerged).toHaveLength(3);

      await flushGistWrites();

      const allAfter = await getAllGists();
      expect(allAfter).toHaveLength(3);
    });

    it('flushes on closeDB', async () => {
      await saveGist(makeGistRecord('gist-close'));
      await closeDB(); // Should flush

      await initIndexedDB();
      const result = await getGist('gist-close');
      expect(result).toBeDefined();
    });
  });

  describe('sync queue deduplication', () => {
    it('deduplicates pending writes with same gistId and action', async () => {
      await queueWrite({
        gistId: 'gist-sync',
        action: 'update',
        payload: { v: 1 },
      });

      await queueWrite({
        gistId: 'gist-sync',
        action: 'update',
        payload: { v: 2 },
      });

      const writes = await getPendingWrites();
      expect(writes).toHaveLength(1);
      expect((writes[0].payload as any).v).toBe(2);
    });
  });
});
