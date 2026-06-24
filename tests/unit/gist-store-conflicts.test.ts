/**
 * Unit tests for GistStore conflict-resolution paths (Plan 038 D1)
 *
 * NOTE: Every beforeEach explicitly sets ALL mock return values because
 * vi.clearAllMocks() resets mock call counts and some implementations.
 * Never rely on mock.fn(() => defaultVal) surviving clearAllMocks.
 *
 * Also: gistStore is a singleton, so we call init() in the outer
 * beforeEach to reset its internal state between tests.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Mocks (hoisted) ----

vi.mock('../../src/services/db', () => ({
  getAllGists: vi.fn(),
  saveGist: vi.fn(),
  deleteGist: vi.fn(),
  saveGists: vi.fn(),
  createTag: vi.fn(),
  getAllTags: vi.fn().mockResolvedValue([]),
  deleteTag: vi.fn(),
  updateTag: vi.fn(),
  getTagsForGist: vi.fn().mockResolvedValue([]),
  assignTag: vi.fn(),
  removeTag: vi.fn(),
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
    syncStatus: strategy === 'remote-wins' ? ('synced' as const) : ('pending' as const),
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
  getTagsForGist as dbGetTagsForGist,
  saveGist as dbSaveGist,
  saveGists,
} from '../../src/services/db';
import { isAuthenticated } from '../../src/services/github/auth';
import * as GitHub from '../../src/services/github/client';
import networkMonitor from '../../src/services/network/offline-monitor';
import syncQueue from '../../src/services/sync/queue';

import gistStore from '../../src/stores/gist-store';

// ---- Helpers ----

function makeGistRecord(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    description: `Gist ${id}`,
    files: { 'test.txt': { filename: 'test.txt', content: 'hello', size: 5, type: 'text/plain' } },
    htmlUrl: `https://gist.github.com/${id}`,
    gitPullUrl: `https://api.github.com/gists/${id}/git/pull`,
    gitPushUrl: `https://api.github.com/gists/${id}/git/push`,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    starred: false,
    public: true,
    syncStatus: 'synced' as const,
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

describe('GistStore — conflict resolution', () => {
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

  // ---- loadGists: empty processedRecords ----

  describe('loadGists — empty processedRecords', () => {
    it('preserves existing gists when both API responses return empty', async () => {
      const existingGists = [makeGistRecord('gist-1'), makeGistRecord('gist-2')];
      vi.mocked(dbGetAllGists).mockResolvedValue(existingGists as never[]);
      await gistStore.init();
      clearGistMockCalls();

      await gistStore.loadGists();

      expect(saveGists).toHaveBeenCalledWith([]);
      expect(gistStore.getGists()).toHaveLength(2);
      expect(gistStore.getGist('gist-1')).toBeDefined();
      expect(gistStore.getGist('gist-2')).toBeDefined();
    });
  });

  // ---- loadGists: conflict detection ----

  describe('loadGists — conflict detection', () => {
    it('stores conflicts when detectConflict returns a conflict', async () => {
      const existingGists = [makeGistRecord('gist-1')];
      vi.mocked(dbGetAllGists).mockResolvedValue(existingGists as never[]);
      await gistStore.init();
      clearGistMockCalls();

      const { detectConflict, storeConflicts } = await import(
        '../../src/services/sync/conflict-detector'
      );
      const conflict = {
        gistId: 'gist-1',
        localVersion: existingGists[0],
        remoteVersion: makeGitHubGist('gist-1', { description: 'Remote desc' }),
        detectedAt: '2024-01-02T00:00:00Z',
        conflictingFields: ['description'],
      };
      vi.mocked(detectConflict).mockReturnValue(conflict);

      const apiGist = makeGitHubGist('gist-1', { description: 'Remote desc' });
      vi.mocked(GitHub.listGists).mockResolvedValue({ data: [apiGist] });

      await gistStore.loadGists();

      expect(vi.mocked(detectConflict)).toHaveBeenCalled();
      expect(vi.mocked(storeConflicts)).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ gistId: 'gist-1' })])
      );
    });

    it('does not store conflicts when detectConflict returns null', async () => {
      const existingGists = [makeGistRecord('gist-1')];
      vi.mocked(dbGetAllGists).mockResolvedValue(existingGists as never[]);
      await gistStore.init();
      clearGistMockCalls();

      const { detectConflict } = await import('../../src/services/sync/conflict-detector');
      vi.mocked(detectConflict).mockReturnValue(null);

      const { storeConflicts } = await import('../../src/services/sync/conflict-detector');

      const apiGist = makeGitHubGist('gist-1', { description: 'No conflict' });
      vi.mocked(GitHub.listGists).mockResolvedValue({ data: [apiGist] });

      await gistStore.loadGists();

      expect(vi.mocked(detectConflict)).toHaveBeenCalled();
      expect(vi.mocked(storeConflicts)).not.toHaveBeenCalled();
    });
  });

  // ---- hydrateGist: push new record ----

  describe('hydrateGist — new gist', () => {
    it('pushes and sorts when hydrated gist is not found in local array (idx === -1)', async () => {
      const existingGists = [makeGistRecord('gist-1')];
      vi.mocked(dbGetAllGists).mockResolvedValue(existingGists as never[]);
      await gistStore.init();
      clearGistMockCalls();

      const newGist = makeGitHubGist('gist-new', {
        description: 'Newly hydrated gist',
      });
      vi.mocked(GitHub.getGist).mockResolvedValue(newGist);

      const result = await gistStore.hydrateGist('gist-new');

      expect(result).toBeDefined();
      expect(result?.id).toBe('gist-new');
      expect(gistStore.getGist('gist-new')).toBeDefined();
      expect(gistStore.getGists()).toHaveLength(2);
      expect(GitHub.getGist).toHaveBeenCalledWith('gist-new');
      expect(dbSaveGist).toHaveBeenCalled();
    });
  });

  // ---- resolveGistConflict ----

  describe('resolveGistConflict', () => {
    it('updates existing record when gist is found in the array (idx !== -1)', async () => {
      const existingGists = [makeGistRecord('gist-1')];
      vi.mocked(dbGetAllGists).mockResolvedValue(existingGists as never[]);
      await gistStore.init();
      clearGistMockCalls();

      const { getConflicts, resolveConflict } = await import(
        '../../src/services/sync/conflict-detector'
      );
      const conflict = {
        gistId: 'gist-1',
        localVersion: existingGists[0],
        remoteVersion: makeGitHubGist('gist-1'),
        detectedAt: '2024-01-02T00:00:00Z',
        conflictingFields: ['content'],
      };
      vi.mocked(getConflicts).mockResolvedValue([conflict]);
      vi.mocked(resolveConflict).mockReturnValue(
        makeGistRecord('gist-1', { description: 'Resolved locally' })
      );

      await gistStore.resolveGistConflict('gist-1', 'local-wins');

      expect(vi.mocked(resolveConflict)).toHaveBeenCalledWith(conflict, 'local-wins');
      expect(dbSaveGist).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'gist-1', description: 'Resolved locally' })
      );
      const { clearConflict } = await import('../../src/services/sync/conflict-detector');
      expect(vi.mocked(clearConflict)).toHaveBeenCalledWith('gist-1');
      expect(gistStore.getGist('gist-1')?.description).toBe('Resolved locally');
    });

    it('pushes new record when gist is not found in the array (idx === -1)', async () => {
      const existingGists = [makeGistRecord('gist-1')];
      vi.mocked(dbGetAllGists).mockResolvedValue(existingGists as never[]);
      await gistStore.init();
      clearGistMockCalls();

      const { getConflicts, resolveConflict } = await import(
        '../../src/services/sync/conflict-detector'
      );
      const newRecord = makeGistRecord('gist-new', {
        description: 'Newly resolved gist',
      });
      const conflict = {
        gistId: 'gist-new',
        localVersion: existingGists[0],
        remoteVersion: makeGitHubGist('gist-new'),
        detectedAt: '2024-01-02T00:00:00Z',
        conflictingFields: ['content'],
      };
      vi.mocked(getConflicts).mockResolvedValue([conflict]);
      vi.mocked(resolveConflict).mockReturnValue(newRecord);

      await gistStore.resolveGistConflict('gist-new', 'remote-wins');

      expect(gistStore.getGists()).toHaveLength(2);
      expect(gistStore.getGist('gist-new')).toBeDefined();
    });

    it('calls processQueue when strategy is local-wins and online', async () => {
      const existingGists = [makeGistRecord('gist-1')];
      vi.mocked(dbGetAllGists).mockResolvedValue(existingGists as never[]);
      await gistStore.init();
      clearGistMockCalls();

      const { getConflicts, resolveConflict } = await import(
        '../../src/services/sync/conflict-detector'
      );
      const conflict = {
        gistId: 'gist-1',
        localVersion: existingGists[0],
        remoteVersion: makeGitHubGist('gist-1'),
        detectedAt: '2024-01-02T00:00:00Z',
        conflictingFields: ['content'],
      };
      vi.mocked(getConflicts).mockResolvedValue([conflict]);
      vi.mocked(resolveConflict).mockReturnValue(makeGistRecord('gist-1'));

      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);

      await gistStore.resolveGistConflict('gist-1', 'local-wins');

      expect(syncQueue.processQueue).toHaveBeenCalled();
    });

    it('does not call processQueue when strategy is remote-wins', async () => {
      const existingGists = [makeGistRecord('gist-1')];
      vi.mocked(dbGetAllGists).mockResolvedValue(existingGists as never[]);
      await gistStore.init();
      clearGistMockCalls();

      const { getConflicts, resolveConflict } = await import(
        '../../src/services/sync/conflict-detector'
      );
      const conflict = {
        gistId: 'gist-1',
        localVersion: existingGists[0],
        remoteVersion: makeGitHubGist('gist-1'),
        detectedAt: '2024-01-02T00:00:00Z',
        conflictingFields: ['content'],
      };
      vi.mocked(getConflicts).mockResolvedValue([conflict]);
      vi.mocked(resolveConflict).mockReturnValue(makeGistRecord('gist-1'));

      await gistStore.resolveGistConflict('gist-1', 'remote-wins');

      expect(syncQueue.processQueue).not.toHaveBeenCalled();
    });

    it('does not call processQueue when local-wins and offline', async () => {
      const existingGists = [makeGistRecord('gist-1')];
      vi.mocked(dbGetAllGists).mockResolvedValue(existingGists as never[]);
      await gistStore.init();
      clearGistMockCalls();

      const { getConflicts, resolveConflict } = await import(
        '../../src/services/sync/conflict-detector'
      );
      const conflict = {
        gistId: 'gist-1',
        localVersion: existingGists[0],
        remoteVersion: makeGitHubGist('gist-1'),
        detectedAt: '2024-01-02T00:00:00Z',
        conflictingFields: ['content'],
      };
      vi.mocked(getConflicts).mockResolvedValue([conflict]);
      vi.mocked(resolveConflict).mockReturnValue(makeGistRecord('gist-1'));

      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);

      await gistStore.resolveGistConflict('gist-1', 'local-wins');

      expect(syncQueue.processQueue).not.toHaveBeenCalled();
    });

    it('does nothing when no conflict exists for the given gistId', async () => {
      const { getConflicts } = await import('../../src/services/sync/conflict-detector');
      vi.mocked(getConflicts).mockResolvedValue([]);

      await gistStore.resolveGistConflict('non-existent', 'remote-wins');

      expect(dbSaveGist).not.toHaveBeenCalled();
    });
  });

  describe('tag operations', () => {
    it('creates a tag', async () => {
      const { createTag: dbCreateTag } = await import('../../src/services/db');
      vi.mocked(dbCreateTag).mockResolvedValue({
        id: 't1',
        name: 'bug',
        color: '#f00',
        gistIds: [],
      });
      const tag = await gistStore.createTag('bug', '#f00');
      expect(tag.id).toBe('t1');
    });

    it('renames a tag', async () => {
      const { updateTag: dbUpdateTag } = await import('../../src/services/db');
      vi.mocked(dbUpdateTag).mockResolvedValue(undefined);
      await gistStore.renameTag('t1', 'new-name');
      expect(dbUpdateTag).toHaveBeenCalledWith('t1', { name: 'new-name' });
    });

    it('deletes a tag', async () => {
      const { deleteTag: dbDeleteTag } = await import('../../src/services/db');
      vi.mocked(dbDeleteTag).mockResolvedValue(undefined);
      await gistStore.deleteTag('t1');
      expect(dbDeleteTag).toHaveBeenCalledWith('t1');
    });

    it('assigns a tag to gist', async () => {
      const { assignTag: dbAssignTag } = await import('../../src/services/db');
      vi.mocked(dbAssignTag).mockResolvedValue(undefined);
      await gistStore.assignTag('g1', 't1');
      expect(dbAssignTag).toHaveBeenCalledWith('g1', 't1');
    });

    it('removes a tag from gist', async () => {
      const { removeTag: dbRemoveTag } = await import('../../src/services/db');
      vi.mocked(dbRemoveTag).mockResolvedValue(undefined);
      await gistStore.removeTag('g1', 't1');
      expect(dbRemoveTag).toHaveBeenCalledWith('g1', 't1');
    });

    it('gets tags for gist', async () => {
      vi.mocked(dbGetTagsForGist).mockResolvedValue([
        { id: 't1', name: 'bug', color: '#f00', gistIds: ['g1'] },
      ]);
      const tags = await gistStore.getTagsForGist('g1');
      expect(tags).toHaveLength(1);
    });

    it('loads tags for gist into cache', async () => {
      vi.mocked(dbGetTagsForGist).mockResolvedValue([
        { id: 't1', name: 'bug', color: '#f00', gistIds: ['g1'] },
      ]);
      await gistStore.loadTagsForGist('g1');
      const cached = gistStore.getTagsFromCache('g1');
      expect(cached).toHaveLength(1);
    });

    it('getTagsFromCache returns empty array for uncached gist', () => {
      const cached = gistStore.getTagsFromCache('nonexistent');
      expect(cached).toEqual([]);
    });

    it('clears tag cache', async () => {
      vi.mocked(dbGetTagsForGist).mockResolvedValue([
        { id: 't1', name: 'bug', color: '#f00', gistIds: ['g1'] },
      ]);
      await gistStore.loadTagsForGist('g1');
      gistStore.clearTagCache();
      const cached = gistStore.getTagsFromCache('g1');
      expect(cached).toEqual([]);
    });

    it('filters gists by tag', async () => {
      vi.mocked(dbGetAllGists).mockResolvedValue([
        makeGistRecord('g1'),
        makeGistRecord('g2'),
      ] as never[]);
      await gistStore.init();
      clearGistMockCalls();

      vi.mocked(dbGetTagsForGist).mockResolvedValue([
        { id: 't1', name: 'bug', color: '#f00', gistIds: ['g1'] },
      ]);
      await gistStore.loadTagsForGist('g1');

      const filtered = gistStore.filterGistsByTag('t1');
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe('g1');
    });
  });
});
