/**
 * Unit tests for src/services/sync/conflict-detector.ts
 * Vitest port of conflict-detector.spec.ts (which used node:test and was never picked up)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared store object so the same get/put functions are used in both
// conflict-detector source code (storeConflict → store.get) and tests
const mockStore = {
  get: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../src/services/db', () => {
  const mockIdb = {
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => mockStore),
      done: Promise.resolve(),
    })),
  };
  return {
    getDB: vi.fn(() => mockIdb),
    getMetadata: vi.fn(),
    setMetadata: vi.fn(),
  };
});

import {
  detectConflict,
  resolveConflict,
  storeConflict,
  storeConflicts,
  getConflicts,
  clearConflict,
  clearAllConflicts,
} from '../../src/services/sync/conflict-detector';
import type { GistRecord } from '../../src/services/db';
import type { GistConflict } from '../../src/services/sync/conflict-detector';
import { getDB, getMetadata, setMetadata } from '../../src/services/db';

describe('ConflictDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectConflict', () => {
    it('returns null for identical gists', () => {
      const local = {
        id: 'gist123',
        description: 'Original description',
        public: true,
        updatedAt: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } as GistRecord['files'][string] },
        syncStatus: 'synced',
      } as GistRecord;

      const remote = {
        id: 'gist123',
        description: 'Original description',
        public: true,
        updated_at: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      };

      expect(detectConflict(local, remote as Parameters<typeof detectConflict>[1])).toBeNull();
    });

    it('detects conflict when description changes', () => {
      const local = {
        id: 'gist123',
        description: 'Local description',
        public: true,
        updatedAt: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } as GistRecord['files'][string] },
        syncStatus: 'synced',
      } as GistRecord;

      const remote = {
        id: 'gist123',
        description: 'Remote description',
        public: true,
        updated_at: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      };

      const result = detectConflict(local, remote as Parameters<typeof detectConflict>[1]);
      expect(result).not.toBeNull();
      expect(result!.conflictingFields).toEqual(['description']);
    });

    it('detects conflict when public status changes', () => {
      const local = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updatedAt: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } as GistRecord['files'][string] },
        syncStatus: 'synced',
      } as GistRecord;

      const remote = {
        id: 'gist123',
        description: 'Desc',
        public: false,
        updated_at: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      };

      const result = detectConflict(local, remote as Parameters<typeof detectConflict>[1]);
      expect(result).not.toBeNull();
      expect(result!.conflictingFields).toEqual(['public']);
    });

    it('detects content conflict when remote is newer and size differs', () => {
      const local = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updatedAt: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } as GistRecord['files'][string] },
        syncStatus: 'synced',
      } as GistRecord;

      const remote = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updated_at: '2026-01-01T11:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 200 } },
      };

      const result = detectConflict(local, remote as Parameters<typeof detectConflict>[1]);
      expect(result).not.toBeNull();
      expect(result!.conflictingFields).toEqual(['content']);
    });

    it('does NOT detect conflict when remote is newer but content identical', () => {
      const local = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updatedAt: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } as GistRecord['files'][string] },
        syncStatus: 'synced',
      } as GistRecord;

      const remote = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updated_at: '2026-01-01T11:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      };

      expect(detectConflict(local, remote as Parameters<typeof detectConflict>[1])).toBeNull();
    });

    it('detects content conflict when file count differs', () => {
      const local = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updatedAt: '2026-01-01T10:00:00Z',
        files: {
          'file1.txt': { filename: 'file1.txt', size: 100 } as GistRecord['files'][string],
          'file2.txt': { filename: 'file2.txt', size: 50 } as GistRecord['files'][string],
        },
        syncStatus: 'synced',
      } as GistRecord;

      const remote = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updated_at: '2026-01-01T11:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      };

      const result = detectConflict(local, remote as Parameters<typeof detectConflict>[1]);
      expect(result).not.toBeNull();
      expect(result!.conflictingFields).toContain('content');
    });

    it('detects content conflict when file names differ', () => {
      const local = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updatedAt: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } as GistRecord['files'][string] },
        syncStatus: 'synced',
      } as GistRecord;

      const remote = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updated_at: '2026-01-01T11:00:00Z',
        files: { 'file2.txt': { filename: 'file2.txt', size: 100 } },
      };

      const result = detectConflict(local, remote as Parameters<typeof detectConflict>[1]);
      expect(result).not.toBeNull();
      expect(result!.conflictingFields).toContain('content');
    });
  });

  describe('storeConflict / storeConflicts', () => {
    it('stores a single conflict via storeConflict', async () => {
      const conflict: GistConflict = {
        gistId: 'gist-1',
        localVersion: {} as GistRecord,
        remoteVersion: {} as GistConflict['remoteVersion'],
        detectedAt: new Date().toISOString(),
        conflictingFields: ['description'],
      };
      await storeConflict(conflict);

      const db = getDB();
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');
      expect(store.get).toHaveBeenCalledWith('sync-conflicts');
      expect(store.put).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'sync-conflicts',
          value: [conflict],
        })
      );
      await expect(tx.done).resolves.toBeUndefined();
    });

    it('merges multiple conflicts via storeConflicts', async () => {
      const conflict1: GistConflict = {
        gistId: 'gist-1',
        localVersion: {} as GistRecord,
        remoteVersion: {} as GistConflict['remoteVersion'],
        detectedAt: new Date().toISOString(),
        conflictingFields: ['description'],
      };
      const conflict2: GistConflict = {
        gistId: 'gist-2',
        localVersion: {} as GistRecord,
        remoteVersion: {} as GistConflict['remoteVersion'],
        detectedAt: new Date().toISOString(),
        conflictingFields: ['public'],
      };

      await storeConflicts([conflict1, conflict2]);

      const db = getDB();
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');
      expect(store.put).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'sync-conflicts',
          value: expect.arrayContaining([conflict1, conflict2]),
        })
      );
    });

    it('does nothing when storeConflicts receives empty array', async () => {
      await storeConflicts([]);
      const db = getDB();
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe('getConflicts', () => {
    it('returns conflicts from metadata', async () => {
      vi.mocked(getMetadata).mockResolvedValue([
        { gistId: 'gist-1', conflictingFields: ['description'] },
      ] as GistConflict[]);

      const result = await getConflicts();
      expect(result).toHaveLength(1);
      expect(result[0].gistId).toBe('gist-1');
    });

    it('returns empty array when no conflicts stored', async () => {
      vi.mocked(getMetadata).mockResolvedValue(undefined);
      const result = await getConflicts();
      expect(result).toEqual([]);
    });
  });

  describe('clearConflict', () => {
    it('removes a specific conflict by gistId', async () => {
      vi.mocked(getMetadata).mockResolvedValue([
        { gistId: 'gist-1', conflictingFields: ['description'] },
        { gistId: 'gist-2', conflictingFields: ['public'] },
      ] as GistConflict[]);

      await clearConflict('gist-1');

      expect(setMetadata).toHaveBeenCalledWith('sync-conflicts', [
        { gistId: 'gist-2', conflictingFields: ['public'] },
      ]);
    });
  });

  describe('clearAllConflicts', () => {
    it('clears all stored conflicts', async () => {
      await clearAllConflicts();
      expect(setMetadata).toHaveBeenCalledWith('sync-conflicts', []);
    });
  });

  describe('resolveConflict', () => {
    const local = {
      id: '123',
      description: 'Local',
      starred: true,
      syncStatus: 'synced',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      public: true,
      files: {},
      htmlUrl: '',
      gitPullUrl: '',
      gitPushUrl: '',
      lastSyncedAt: '2026-01-01T00:00:00Z',
    } as unknown as GistRecord;

    const remote = {
      id: '123',
      description: 'Remote',
      files: { 'f.txt': { filename: 'f.txt', type: 'text/plain', size: 10 } },
      html_url: 'url',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T12:00:00Z',
      public: true,
    };

    const conflict: GistConflict = {
      gistId: '123',
      localVersion: local,
      remoteVersion: remote as unknown as GistConflict['remoteVersion'],
      detectedAt: '2026-01-01T12:00:00Z',
      conflictingFields: ['description'],
    };

    it('local-wins keeps local description and sets pending', () => {
      const result = resolveConflict(conflict, 'local-wins');
      expect(result.description).toBe('Local');
      expect(result.syncStatus).toBe('pending');
    });

    it('remote-wins takes remote description and preserves starred', () => {
      const result = resolveConflict(conflict, 'remote-wins');
      expect(result.description).toBe('Remote');
      expect(result.syncStatus).toBe('synced');
      expect(result.starred).toBe(true);
    });

    it('manual sets conflict status', () => {
      const result = resolveConflict(conflict, 'manual');
      expect(result.syncStatus).toBe('conflict');
    });

    it('throws for unknown strategy', () => {
      expect(() => resolveConflict(conflict, 'unknown' as never)).toThrow('Unknown resolution strategy');
    });
  });
});
