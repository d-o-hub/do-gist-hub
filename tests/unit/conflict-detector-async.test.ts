import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/db', () => ({
  getDB: vi.fn(),
  getMetadata: vi.fn(),
  setMetadata: vi.fn(),
}));

import { getDB, getMetadata, setMetadata } from '../../src/services/db';
import type { GistConflict } from '../../src/services/sync/conflict-detector';
import {
  clearAllConflicts,
  clearConflict,
  getConflicts,
  storeConflict,
  storeConflicts,
} from '../../src/services/sync/conflict-detector';

function makeConflict(gistId: string): GistConflict {
  return {
    gistId,
    detectedAt: '2026-01-01T00:00:00Z',
    conflictingFields: ['content'],
    localVersion: {
      id: gistId,
      description: 'local',
      files: {},
      htmlUrl: '',
      gitPullUrl: '',
      gitPushUrl: '',
      createdAt: '',
      updatedAt: '',
      starred: false,
      public: true,
      syncStatus: 'synced',
    },
    remoteVersion: {
      id: gistId,
      node_id: '',
      git_pull_url: '',
      git_push_url: '',
      html_url: '',
      files: {},
      public: true,
      created_at: '',
      updated_at: '',
      description: 'remote',
      comments: 0,
      user: null,
      comments_url: '',
    },
  };
}

describe('conflict-detector async operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('storeConflicts', () => {
    it('returns early for empty array', async () => {
      await storeConflicts([]);
      expect(getDB).not.toHaveBeenCalled();
    });

    it('stores conflicts via IndexedDB transaction', async () => {
      const putFn = vi.fn().mockResolvedValue(undefined);
      const donePromise = Promise.resolve();
      const _conflictMap = new Map<string, GistConflict>();
      const getFn = vi.fn().mockResolvedValue({ value: [] });

      vi.mocked(getDB).mockReturnValue({
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            get: getFn,
            put: putFn,
          }),
          done: donePromise,
        }),
      } as never);

      await storeConflicts([makeConflict('g1')]);

      expect(getDB).toHaveBeenCalled();
      expect(putFn).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'sync-conflicts',
          value: expect.arrayContaining([expect.objectContaining({ gistId: 'g1' })]),
        })
      );
    });

    it('merges with existing conflicts', async () => {
      const existing = makeConflict('g1');
      existing.conflictingFields = ['description'];

      const getFn = vi.fn().mockResolvedValue({ value: [existing] });
      const putFn = vi.fn().mockResolvedValue(undefined);

      vi.mocked(getDB).mockReturnValue({
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            get: getFn,
            put: putFn,
          }),
          done: Promise.resolve(),
        }),
      } as never);

      const newConflict = makeConflict('g2');
      await storeConflicts([newConflict]);

      expect(putFn).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.arrayContaining([
            expect.objectContaining({ gistId: 'g1' }),
            expect.objectContaining({ gistId: 'g2' }),
          ]),
        })
      );
    });
  });

  describe('storeConflict', () => {
    it('delegates to storeConflicts', async () => {
      const putFn = vi.fn().mockResolvedValue(undefined);
      vi.mocked(getDB).mockReturnValue({
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ value: [] }),
            put: putFn,
          }),
          done: Promise.resolve(),
        }),
      } as never);

      await storeConflict(makeConflict('single'));

      expect(putFn).toHaveBeenCalled();
    });
  });

  describe('getConflicts', () => {
    it('returns stored conflicts', async () => {
      const conflicts = [makeConflict('g1')];
      vi.mocked(getMetadata).mockResolvedValue(conflicts);

      const result = await getConflicts();
      expect(result).toEqual(conflicts);
      expect(getMetadata).toHaveBeenCalledWith('sync-conflicts');
    });

    it('returns empty array when no conflicts stored', async () => {
      vi.mocked(getMetadata).mockResolvedValue(undefined);

      const result = await getConflicts();
      expect(result).toEqual([]);
    });
  });

  describe('clearConflict', () => {
    it('removes a specific conflict by gistId', async () => {
      const existing = [makeConflict('g1'), makeConflict('g2')];
      vi.mocked(getMetadata).mockResolvedValue(existing);
      vi.mocked(setMetadata).mockResolvedValue(undefined);

      await clearConflict('g1');

      expect(setMetadata).toHaveBeenCalledWith('sync-conflicts', [makeConflict('g2')]);
    });

    it('handles empty conflict list', async () => {
      vi.mocked(getMetadata).mockResolvedValue([]);
      vi.mocked(setMetadata).mockResolvedValue(undefined);

      await clearConflict('g1');

      expect(setMetadata).toHaveBeenCalledWith('sync-conflicts', []);
    });
  });

  describe('clearAllConflicts', () => {
    it('sets conflicts to empty array', async () => {
      vi.mocked(setMetadata).mockResolvedValue(undefined);

      await clearAllConflicts();

      expect(setMetadata).toHaveBeenCalledWith('sync-conflicts', []);
    });
  });
});
