import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/services/db', () => ({
  getAllGists: vi.fn(),
  saveGist: vi.fn(),
  deleteGist: vi.fn(),
  saveGists: vi.fn(),
}));

vi.mock('../../src/services/github/client', () => ({
  listGists: vi.fn(),
  listStarredGists: vi.fn(),
  createGist: vi.fn(),
  updateGist: vi.fn(),
  deleteGist: vi.fn(),
  starGist: vi.fn(),
  unstarGist: vi.fn(),
  getGist: vi.fn(),
}));

vi.mock('../../src/services/network/offline-monitor', () => ({
  default: {
    isOnline: vi.fn(() => true),
    subscribe: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../src/services/sync/queue', () => ({
  default: {
    queueOperation: vi.fn(),
    processQueue: vi.fn(),
  },
}));

vi.mock('../../src/services/sync/conflict-detector', () => ({
  detectConflict: vi.fn(),
  resolveConflict: vi.fn(),
  storeConflicts: vi.fn(),
  getConflicts: vi.fn(() => []),
  clearConflict: vi.fn(),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import {
  getAllGists as dbGetAllGists,
  saveGist as dbSaveGist,
  deleteGist as dbDeleteGist,
  saveGists,
} from '../../src/services/db';

import * as GitHub from '../../src/services/github/client';
import networkMonitor from '../../src/services/network/offline-monitor';
import syncQueue from '../../src/services/sync/queue';

import gistStore from '../../src/stores/gist-store';

// ── Helpers ─────────────────────────────────────────────────────────

function makeGistRecord(id: string, overrides: Record<string, unknown> = {}) {
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

// ── Tests ─────────────────────────────────────────────────────────────

describe('GistStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dbGetAllGists).mockResolvedValue([]);
  });

  // ── init ────────────────────────────────────────────────────────

  describe('init', () => {
    it('loads gists from IndexedDB on init', async () => {
      const existingGists = [makeGistRecord('gist-1'), makeGistRecord('gist-2')];
      vi.mocked(dbGetAllGists).mockResolvedValue(existingGists as never[]);

      await gistStore.init();

      expect(dbGetAllGists).toHaveBeenCalled();
    });

    it('skips API call when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      await gistStore.init();

      expect(GitHub.listGists).not.toHaveBeenCalled();
    });
  });

  // ── getGists ───────────────────────────────────────────────────

  describe('getGists', () => {
    it('returns empty array initially', () => {
      expect(gistStore.getGists()).toEqual([]);
    });
  });

  // ── getGist ────────────────────────────────────────────────────

  describe('getGist', () => {
    it('returns undefined for non-existent gist', async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([]);
      await gistStore.init();
      expect(gistStore.getGist('non-existent')).toBeUndefined();
    });
  });

  // ── createGist ──────────────────────────────────────────────────────

  describe('createGist', () => {
    beforeEach(async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([]);
      await gistStore.init();
    });

    it('queues operation when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      await gistStore.createGist('Test', true, { 'test.txt': 'content' });

      expect(syncQueue.queueOperation).toHaveBeenCalledWith(
        expect.any(String),
        'create',
        expect.objectContaining({ description: 'Test' })
      );
    });
  });

  // ── updateGist ──────────────────────────────────────────────────────

  describe('updateGist', () => {
    beforeEach(async () => {
      const existing = makeGistRecord('gist-1', { description: 'Original' });
      vi.mocked(dbGetAllGists).mockResolvedValue([existing] as never[]);
      await gistStore.init();
    });

    it('queues operation when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      await gistStore.updateGist('gist-1', { description: 'Offline update' });

      expect(syncQueue.queueOperation).toHaveBeenCalledWith(
        'gist-1',
        'update',
        expect.objectContaining({ description: 'Offline update' })
      );
    });
  });

  // ── deleteGist ────────────────────────────────────────────────────

  describe('deleteGist', () => {
    beforeEach(async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([makeGistRecord('gist-1')] as never[]);
      await gistStore.init();
    });

    it('queues operation when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      await gistStore.deleteGist('gist-1');

      expect(syncQueue.queueOperation).toHaveBeenCalledWith('gist-1', 'delete', {});
    });
  });

  // ── toggleStar ─────────────────────────────────────────────────────

  describe('toggleStar', () => {
    beforeEach(async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([
        makeGistRecord('gist-1', { starred: false }),
      ] as never[]);
      await gistStore.init();
    });

    it('queues operation when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      await gistStore.toggleStar('gist-1');

      expect(syncQueue.queueOperation).toHaveBeenCalledWith(
        'gist-1',
        'star',
        expect.any(Object)
      );
    });
  });

  // ── filterGists / searchGists ─────────────────────────────────────

  describe('filterGists / searchGists', () => {
    beforeEach(async () => {
      const gists = [
        makeGistRecord('gist-1', { starred: false }),
        makeGistRecord('gist-2', { starred: true }),
        makeGistRecord('gist-3', { starred: false }),
      ];
      vi.mocked(dbGetAllGists).mockResolvedValue(gists as never[]);
      await gistStore.init();
    });

    it('filters by starred', () => {
      const starred = gistStore.filterGists('starred');
      expect(starred).toHaveLength(1);
      expect(starred[0]?.id).toBe('gist-2');
    });

    it('filters by mine (not starred)', () => {
      const mine = gistStore.filterGists('mine');
      expect(mine).toHaveLength(2);
      expect(mine.some((g) => g.id === 'gist-2')).toBe(false);
    });

    it('returns all for "all" filter', () => {
      const all = gistStore.filterGists('all');
      expect(all).toHaveLength(3);
    });
  });

  // ── loadGists ────────────────────────────────────────────────────

  describe('loadGists', () => {
    beforeEach(async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([]);
      await gistStore.init();
    });

    it('skips API call when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      await gistStore.loadGists();

      expect(GitHub.listGists).not.toHaveBeenCalled();
    });
  });
});
