/**
 * Unit tests for GistStore
 *
 * NOTE: Every beforeEach explicitly sets ALL mock return values because
 * vi.clearAllMocks() resets mock call counts and some implementations.
 * Never rely on mock.fn(() => defaultVal) surviving clearAllMocks.
 *
 * Also: gistStore is a singleton, so we call init() in the outer
 * beforeEach to reset its internal state between tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mocks (hoisted) ----

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
  resolveConflict: vi.fn((_: unknown, strategy: string) => ({
    id: 'resolved-gist',
    description: 'Resolved',
    files: {},
    starred: false,
    syncStatus: 'synced',
  })),
  storeConflicts: vi.fn(),
  getConflicts: vi.fn(() => []),
  clearConflict: vi.fn(),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

vi.mock('../../src/services/github/auth', () => ({
  isAuthenticated: vi.fn().mockResolvedValue(true),
}));

// ---- Imports (after mocks) ----

import {
  getAllGists as dbGetAllGists,
  saveGist as dbSaveGist,
  deleteGist as dbDeleteGist,
  saveGists,
} from '../../src/services/db';

import * as GitHub from '../../src/services/github/client';
import networkMonitor from '../../src/services/network/offline-monitor';
import syncQueue from '../../src/services/sync/queue';
import { isAuthenticated } from '../../src/services/github/auth';
import { safeError } from '../../src/services/security/logger';

import gistStore from '../../src/stores/gist-store';

// ---- Helpers ----

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

function makeGitHubGist(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    description: `Gist ${id}`,
    files: {
      'test.txt': {
        filename: 'test.txt',
        content: 'hello',
        raw_url: `https://api.github.com/gists/${id}/raw`,
        size: 5,
        type: 'text/plain',
        language: 'Text',
      },
    },
    html_url: `https://gist.github.com/${id}`,
    git_pull_url: `https://api.github.com/gists/${id}/git/pull`,
    git_push_url: `https://api.github.com/gists/${id}/git/push`,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    public: true,
    owner: {
      login: 'testuser',
      id: 1,
      avatar_url: 'https://avatars.githubusercontent.com/u/1',
      html_url: 'https://github.com/testuser',
    },
    ...overrides,
  };
}

/** Reset all mocks that loadGists depends on (called by init()) */
function resetGistMocks() {
  vi.mocked(GitHub.listGists).mockResolvedValue({ data: [] });
  vi.mocked(GitHub.listStarredGists).mockResolvedValue({ data: [] });
  vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
  vi.mocked(isAuthenticated).mockResolvedValue(true);
  vi.mocked(syncQueue.queueOperation).mockResolvedValue(1);
}

/** Clear GitHub mock call counts after init() calls loadGists internally */
function clearGistMockCalls() {
  vi.mocked(GitHub.listGists).mockClear();
  vi.mocked(GitHub.listStarredGists).mockClear();
}

// ---- Tests ----

describe('GistStore', () => {
  // Outer beforeEach resets singleton state AND all mock implementations
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(dbGetAllGists).mockResolvedValue([]);
    resetGistMocks();
    // Reset singleton's internal state by re-initializing with empty data
    await gistStore.init();
    // Clear call counts from init() -> loadGists()
    clearGistMockCalls();
  });

  // ---- init ----

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

    it('skips API call when not authenticated', async () => {
      vi.mocked(isAuthenticated).mockResolvedValue(false);

      await gistStore.init();

      expect(GitHub.listGists).not.toHaveBeenCalled();
    });

    it('loads from GitHub when online and authenticated', async () => {
      await gistStore.init();

      expect(GitHub.listGists).toHaveBeenCalled();
      expect(GitHub.listStarredGists).toHaveBeenCalled();
    });
  });

  describe('getLoading / getError', () => {
    it('returns loading state', () => {
      expect(gistStore.getLoading()).toBe(false);
    });

    it('returns error state', () => {
      expect(gistStore.getError()).toBeNull();
    });

    it('returns last app error', () => {
      expect(gistStore.getLastAppError()).toBeNull();
    });
  });

  // ---- getGists / getGist ----

  describe('getGists', () => {
    it('returns empty array after init', () => {
      expect(gistStore.getGists()).toEqual([]);
    });
  });

  describe('getGist', () => {
    it('returns undefined for non-existent gist', async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([]);
      await gistStore.init();
      expect(gistStore.getGist('non-existent')).toBeUndefined();
    });

    it('returns existing gist by id', async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([makeGistRecord('gist-1')] as never[]);
      await gistStore.init();
      const result = gistStore.getGist('gist-1');
      expect(result?.description).toBe('Gist gist-1');
    });
  });

  // ---- Subscribe ----

  describe('subscribe', () => {
    it('calls listener immediately with current gists', () => {
      const listener = vi.fn();
      gistStore.subscribe(listener);
      expect(listener).toHaveBeenCalledWith([]);
    });

    it('returns unsubscribe function that removes listener', async () => {
      const listener = vi.fn();
      const unsubscribe = gistStore.subscribe(listener);

      unsubscribe();

      vi.mocked(dbGetAllGists).mockResolvedValue([makeGistRecord('gist-1')] as never[]);
      await gistStore.reloadFromDb();

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  // ---- reloadFromDb ----

  describe('reloadFromDb', () => {
    it('reloads gists from IndexedDB', async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([makeGistRecord('gist-1')] as never[]);
      await gistStore.init();
      clearGistMockCalls();

      vi.mocked(dbGetAllGists).mockResolvedValue([
        makeGistRecord('gist-1'),
        makeGistRecord('gist-2'),
      ] as never[]);

      await gistStore.reloadFromDb();
      expect(gistStore.getGists()).toHaveLength(2);
    });
  });

  // ---- subscribe + listeners ----

  describe('listeners', () => {
    it('notifies listeners on state changes', async () => {
      const listener = vi.fn();
      vi.mocked(dbGetAllGists).mockResolvedValue([makeGistRecord('gist-1')] as never[]);

      gistStore.subscribe(listener);
      await gistStore.init();

      expect(listener).toHaveBeenCalled();
    });
  });

  // ---- createGist ----

  describe('createGist', () => {
    beforeEach(async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([]);
      await gistStore.init();
      clearGistMockCalls();
    });

    it('queues operation when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      await gistStore.createGist('Test', true, { 'test.txt': 'content' });

      expect(syncQueue.queueOperation).toHaveBeenCalledWith(
        expect.any(String),
        'create',
        expect.objectContaining({ description: 'Test' }),
      );
    });

    it('creates gist via API when online and replaces temp record', async () => {
      const createdGist = makeGitHubGist('api-1', { description: 'API Created' });
      vi.mocked(GitHub.createGist).mockResolvedValue(createdGist);

      const result = await gistStore.createGist('API Created', true, { 'test.txt': 'content' });

      expect(GitHub.createGist).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'API Created' }),
      );
      expect(dbSaveGist).toHaveBeenCalled();
      expect(result?.description).toBe('API Created');
      expect(result?.id).toBe('api-1');
    });

    it('rolls back temp record on API failure', async () => {
      vi.mocked(GitHub.createGist).mockRejectedValue(new Error('API Error'));

      const result = await gistStore.createGist('Failed', true, { 'test.txt': 'content' });

      expect(result).toBeNull();
      expect(gistStore.getGists()).toHaveLength(0);
    });

    it('returns null when offline (queued)', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      const result = await gistStore.createGist('Offline', false, { 'test.txt': 'data' });

      expect(result).toBeNull();
    });
  });

  // ---- updateGist ----

  describe('updateGist', () => {
    beforeEach(async () => {
      const existing = makeGistRecord('gist-1', { description: 'Original' });
      vi.mocked(dbGetAllGists).mockResolvedValue([existing] as never[]);
      await gistStore.init();
      clearGistMockCalls();
    });

    it('queues operation when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      await gistStore.updateGist('gist-1', { description: 'Offline update' });

      expect(syncQueue.queueOperation).toHaveBeenCalledWith(
        'gist-1',
        'update',
        expect.objectContaining({ description: 'Offline update' }),
      );
    });

    it('updates gist via API when online and saves to DB', async () => {
      const updatedGist = makeGitHubGist('gist-1', { description: 'Updated via API' });
      vi.mocked(GitHub.updateGist).mockResolvedValue(updatedGist);

      const result = await gistStore.updateGist('gist-1', { description: 'Updated via API' });

      expect(GitHub.updateGist).toHaveBeenCalledWith(
        'gist-1',
        expect.objectContaining({ description: 'Updated via API' }),
      );
      expect(dbSaveGist).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(gistStore.getGist('gist-1')?.description).toBe('Updated via API');
    });

    it('rolls back to original state on API failure', async () => {
      const originalDescription = gistStore.getGist('gist-1')?.description;

      vi.mocked(GitHub.updateGist).mockRejectedValue(new Error('API Error'));

      const result = await gistStore.updateGist('gist-1', { description: 'New desc' });

      expect(result).toBe(false);
      expect(gistStore.getGist('gist-1')?.description).toBe(originalDescription);
    });
  });

  // ---- deleteGist ----

  describe('deleteGist', () => {
    beforeEach(async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([makeGistRecord('gist-1')] as never[]);
      await gistStore.init();
      clearGistMockCalls();
    });

    it('queues operation when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      await gistStore.deleteGist('gist-1');

      expect(syncQueue.queueOperation).toHaveBeenCalledWith('gist-1', 'delete', {});
    });

    it('deletes gist via API when online and removes from store', async () => {
      vi.mocked(GitHub.deleteGist).mockResolvedValue(undefined);

      const result = await gistStore.deleteGist('gist-1');

      expect(GitHub.deleteGist).toHaveBeenCalledWith('gist-1');
      expect(dbDeleteGist).toHaveBeenCalledWith('gist-1');
      expect(result).toBe(true);
      expect(gistStore.getGist('gist-1')).toBeUndefined();
    });

    it('rolls back deletion on API failure', async () => {
      vi.mocked(GitHub.deleteGist).mockRejectedValue(new Error('API Error'));

      const result = await gistStore.deleteGist('gist-1');

      expect(result).toBe(false);
      expect(gistStore.getGist('gist-1')).toBeDefined();
    });

    it('queues operation when offline and removes from store', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      const result = await gistStore.deleteGist('gist-1');

      expect(syncQueue.queueOperation).toHaveBeenCalledWith('gist-1', 'delete', {});
      expect(result).toBe(true);
      expect(gistStore.getGist('gist-1')).toBeUndefined();
    });

    it('rolls back deletion if queueOperation fails', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);
      vi.mocked(syncQueue.queueOperation).mockRejectedValue(new Error('Queue Error'));

      const result = await gistStore.deleteGist('gist-1');

      expect(result).toBe(false);
      expect(gistStore.getGist('gist-1')).toBeDefined();
      expect(vi.mocked(safeError)).toHaveBeenCalledWith(
        '[GistStore] Failed to delete gist',
        expect.any(Error)
      );
    });

    it('returns true for non-existent gist when offline (no-op success)', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);
      vi.mocked(dbGetAllGists).mockResolvedValue([] as never[]);
      await gistStore.init();

      const result = await gistStore.deleteGist('non-existent');
      expect(result).toBe(true);
    });
  });

  // ---- toggleStar ----

  describe('toggleStar', () => {
    beforeEach(async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([
        makeGistRecord('gist-1', { starred: false }),
      ] as never[]);
      await gistStore.init();
      clearGistMockCalls();
    });

    it('queues operation when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      await gistStore.toggleStar('gist-1');

      expect(syncQueue.queueOperation).toHaveBeenCalledWith(
        'gist-1',
        'star',
        expect.any(Object),
      );
    });

    it('toggles star on via API when online', async () => {
      vi.mocked(GitHub.starGist).mockResolvedValue(undefined);

      const result = await gistStore.toggleStar('gist-1');

      expect(GitHub.starGist).toHaveBeenCalledWith('gist-1');
      expect(dbSaveGist).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(gistStore.getGist('gist-1')?.starred).toBe(true);
    });

    it('toggles star off via API when online', async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([
        makeGistRecord('gist-1', { starred: true }),
      ] as never[]);
      await gistStore.init();

      vi.mocked(GitHub.unstarGist).mockResolvedValue(undefined);

      const result = await gistStore.toggleStar('gist-1');

      expect(GitHub.unstarGist).toHaveBeenCalledWith('gist-1');
      expect(dbSaveGist).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(gistStore.getGist('gist-1')?.starred).toBe(false);
    });

    it('rolls back star state on API failure', async () => {
      vi.mocked(GitHub.starGist).mockRejectedValue(new Error('API Error'));

      const result = await gistStore.toggleStar('gist-1');

      expect(result).toBe(false);
      expect(gistStore.getGist('gist-1')?.starred).toBe(false);
    });

    it('returns false for non-existent gist', async () => {
      const result = await gistStore.toggleStar('non-existent');
      expect(result).toBe(false);
    });
  });

  // ---- filterGists / searchGists ----

  describe('filterGists / searchGists', () => {
    beforeEach(async () => {
      const gists = [
        makeGistRecord('gist-1', { starred: false }),
        makeGistRecord('gist-2', { starred: true }),
        makeGistRecord('gist-3', { starred: false }),
      ];
      vi.mocked(dbGetAllGists).mockResolvedValue(gists as never[]);
      await gistStore.init();
      clearGistMockCalls();
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

    it('searches by description', () => {
      const results = gistStore.searchGists('gist-1');
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('gist-1');
    });

    it('searches by filename', () => {
      const results = gistStore.searchGists('test.txt');
      expect(results).toHaveLength(3);
    });

    it('returns all gists for empty query', () => {
      const results = gistStore.searchGists('');
      expect(results).toHaveLength(3);
    });

    it('returns all gists for whitespace-only query', () => {
      const results = gistStore.searchGists('   ');
      expect(results).toHaveLength(3);
    });

    it('is case insensitive', () => {
      const results = gistStore.searchGists('GIST-1');
      expect(results).toHaveLength(1);
    });

    it('returns empty array for non-matching query', () => {
      const results = gistStore.searchGists('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  // ---- loadGists ----

  describe('loadGists', () => {
    beforeEach(async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([]);
      await gistStore.init();
      clearGistMockCalls();
    });

    it('skips API call when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      await gistStore.loadGists();

      expect(GitHub.listGists).not.toHaveBeenCalled();
    });

    it('fetches own and starred gists from GitHub', async () => {
      vi.mocked(GitHub.listGists).mockResolvedValue({
        data: [makeGitHubGist('gist-1', { description: 'Own gist' })],
      });
      vi.mocked(GitHub.listStarredGists).mockResolvedValue({ data: [] });

      await gistStore.loadGists();

      expect(GitHub.listGists).toHaveBeenCalled();
      expect(GitHub.listStarredGists).toHaveBeenCalled();
    });

    it('saves fetched gists to IndexedDB', async () => {
      const ownGist = makeGitHubGist('gist-1');
      vi.mocked(GitHub.listGists).mockResolvedValue({ data: [ownGist] });
      vi.mocked(GitHub.listStarredGists).mockResolvedValue({ data: [] });

      await gistStore.loadGists();

      expect(saveGists).toHaveBeenCalled();
    });

    it('marks gists as starred when they appear in starred gists', async () => {
      const ownGist = makeGitHubGist('starred-gist');
      vi.mocked(GitHub.listGists).mockResolvedValue({ data: [ownGist] });
      vi.mocked(GitHub.listStarredGists).mockResolvedValue({ data: [ownGist] });

      await gistStore.loadGists();

      expect(gistStore.getGist('starred-gist')?.starred).toBe(true);
    });

    it('includes gists that are only in starred list', async () => {
      const starredOnly = makeGitHubGist('starred-only');
      vi.mocked(GitHub.listGists).mockResolvedValue({ data: [] });
      vi.mocked(GitHub.listStarredGists).mockResolvedValue({ data: [starredOnly] });

      await gistStore.loadGists();

      expect(gistStore.getGist('starred-only')).toBeDefined();
      expect(gistStore.getGist('starred-only')?.starred).toBe(true);
    });
  });

  // ---- hydrateGist ----

  describe('hydrateGist', () => {
    beforeEach(async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([makeGistRecord('gist-1')] as never[]);
      await gistStore.init();
      clearGistMockCalls();
    });

    it('returns cached gist when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      const result = await gistStore.hydrateGist('gist-1');
      expect(result?.id).toBe('gist-1');
      expect(GitHub.getGist).not.toHaveBeenCalled();
    });

    it('fetches full gist from API when online', async () => {
      const fullGist = makeGitHubGist('gist-1', {
        description: 'Full detail',
        files: {
          'main.js': {
            filename: 'main.js',
            content: 'console.log("full")',
            raw_url: 'https://api.github.com/gists/gist-1/raw',
            size: 20,
            type: 'application/javascript',
            language: 'JavaScript',
          },
        },
      });
      vi.mocked(GitHub.getGist).mockResolvedValue(fullGist);

      const result = await gistStore.hydrateGist('gist-1');
      expect(GitHub.getGist).toHaveBeenCalledWith('gist-1');
      expect(dbSaveGist).toHaveBeenCalled();
      expect(result?.description).toBe('Full detail');
    });

    it('falls back to cached gist on API failure', async () => {
      vi.mocked(GitHub.getGist).mockRejectedValue(new Error('API Error'));

      const result = await gistStore.hydrateGist('gist-1');
      expect(result?.id).toBe('gist-1');
    });

    it('returns null for non-existent gist when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      const result = await gistStore.hydrateGist('non-existent');
      expect(result).toBeNull();
    });
  });

  // ---- resolveGistConflict ----

  describe('resolveGistConflict', () => {
    beforeEach(async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([]);
      await gistStore.init();
      clearGistMockCalls();
    });

    it('does nothing when no conflict exists for gistId', async () => {
      const { getConflicts } = await import('../../src/services/sync/conflict-detector');
      vi.mocked(getConflicts).mockResolvedValue([]);

      await gistStore.resolveGistConflict('non-existent', 'remote-wins');
      expect(dbSaveGist).not.toHaveBeenCalled();
    });
  });
});
