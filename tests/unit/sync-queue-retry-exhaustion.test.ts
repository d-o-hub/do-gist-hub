import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GistRecord } from '../../src/services/db';
import * as db from '../../src/services/db';
import * as github from '../../src/services/github';
import networkMonitor from '../../src/services/network/offline-monitor';
import { safeError } from '../../src/services/security/logger';
import { type SyncAction, SyncQueue } from '../../src/services/sync/queue';
import type { GitHubGist } from '../../src/types/api';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../src/services/db', () => ({
  getPendingWrites: vi.fn(),
  queueWrite: vi.fn(),
  removePendingWrite: vi.fn(),
  updatePendingWriteError: vi.fn(),
  saveGist: vi.fn(),
  deleteGist: vi.fn(),
  getGist: vi.fn(),
}));

vi.mock('../../src/services/network/offline-monitor', () => ({
  default: {
    isOnline: vi.fn(() => true),
    subscribe: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../src/services/github', () => ({
  createGist: vi.fn(),
  updateGist: vi.fn(),
  deleteGist: vi.fn(),
  starGist: vi.fn(),
  unstarGist: vi.fn(),
  forkGist: vi.fn(),
  getGist: vi.fn(),
}));

vi.mock('../../src/services/github/rate-limiter', () => ({
  isSafeToRequest: vi.fn(() => true),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

vi.mock('../../src/services/sync/conflict-detector', () => ({
  detectConflict: vi.fn(),
  storeConflict: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMockGist(id: string): GitHubGist {
  return {
    id,
    node_id: `node_${id}`,
    git_pull_url: `https://api.github.com/gists/${id}/git/pull`,
    git_push_url: `https://api.github.com/gists/${id}/git/push`,
    html_url: `https://gist.github.com/${id}`,
    files: {},
    public: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: null,
    comments: 0,
    user: null,
    comments_url: `https://api.github.com/gists/${id}/comments`,
  };
}

interface SyncQueueAccess {
  calculateBackoff(attempt: number, retryAfterMs?: number): number;
  delay(ms: number): Promise<void>;
  githubGistToRecord(gist: GitHubGist): GistRecord;
}

const SyncQueueAccess = SyncQueue as unknown as SyncQueueAccess;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SyncQueue retry exhaustion and dedup', () => {
  let queue: SyncQueue;

  beforeEach(() => {
    queue = new SyncQueue();
    vi.clearAllMocks();
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    queue.destroy();
  });

  // ── processQueue catch block (line 120) ─────────────────────────────────

  describe('processQueue error catch', () => {
    it('catches and logs error when getPendingWrites rejects', async () => {
      vi.spyOn(SyncQueueAccess, 'delay').mockResolvedValue(undefined);
      const error = new Error('IndexedDB connection lost');
      vi.mocked(db.getPendingWrites).mockRejectedValue(error);

      await queue.processQueue();

      expect(safeError).toHaveBeenCalledWith('[SyncQueue] Error processing queue:', error);
    });

    it('resets isSyncing flag after error', async () => {
      vi.spyOn(SyncQueueAccess, 'delay').mockResolvedValue(undefined);
      vi.mocked(db.getPendingWrites).mockRejectedValue(new Error('db error'));

      await queue.processQueue();

      vi.mocked(db.getPendingWrites).mockResolvedValue([]);
      await queue.processQueue();
      expect(db.getPendingWrites).toHaveBeenCalledTimes(2);
    });
  });

  // ── executeWrite conflict check catch (line 151) ────────────────────────

  describe('pre-write conflict check error', () => {
    it('logs error and proceeds when conflict check network call fails', async () => {
      vi.spyOn(SyncQueueAccess, 'delay').mockResolvedValue(undefined);
      vi.mocked(db.getPendingWrites).mockResolvedValue([
        {
          id: 1,
          gistId: 'gist-1',
          action: 'update' as SyncAction,
          payload: { description: 'updated' },
          createdAt: 1000,
          retryCount: 0,
          expectedRemoteVersion: '2026-01-01T10:00:00Z',
        },
      ]);
      vi.mocked(github.getGist).mockRejectedValue(
        new Error('network failure during conflict check')
      );
      vi.mocked(github.updateGist).mockResolvedValue(makeMockGist('gist-1'));

      await queue.processQueue();

      expect(safeError).toHaveBeenCalledWith(
        '[SyncQueue] Pre-write conflict check failed for gist-1:',
        expect.any(Error)
      );
      expect(github.updateGist).toHaveBeenCalledTimes(1);
      expect(db.removePendingWrite).toHaveBeenCalledWith(1);
    });
  });

  // ── githubGistToRecord file transformation (line 215) ───────────────────

  describe('githubGistToRecord file transformation', () => {
    it('transforms multiple files with full data', () => {
      const gist = makeMockGist('gist-full');
      gist.files = {
        'file1.ts': {
          filename: 'file1.ts',
          type: 'text/typescript',
          language: 'TypeScript',
          raw_url: 'https://raw.gist.com/file1.ts',
          size: 100,
          truncated: false,
          content: 'const x = 1;',
        },
        'file2.json': {
          filename: 'file2.json',
          type: 'application/json',
          language: 'JSON',
          raw_url: 'https://raw.gist.com/file2.json',
          size: 50,
          truncated: false,
          content: '{"key": "value"}',
        },
      };

      const record = SyncQueueAccess.githubGistToRecord(gist);

      expect(record.files['file1.ts']).toEqual({
        filename: 'file1.ts',
        type: 'text/typescript',
        language: 'TypeScript',
        rawUrl: 'https://raw.gist.com/file1.ts',
        size: 100,
        truncated: false,
        content: 'const x = 1;',
      });
      expect(record.files['file2.json']).toEqual({
        filename: 'file2.json',
        type: 'application/json',
        language: 'JSON',
        rawUrl: 'https://raw.gist.com/file2.json',
        size: 50,
        truncated: false,
        content: '{"key": "value"}',
      });
    });

    it('handles files with only required fields', () => {
      const gist = makeMockGist('gist-minimal');
      gist.files = {
        'readme.md': {
          filename: 'readme.md',
        },
      };

      const record = SyncQueueAccess.githubGistToRecord(gist);

      expect(record.files['readme.md']).toEqual({
        filename: 'readme.md',
        type: undefined,
        language: undefined,
        rawUrl: undefined,
        size: undefined,
        truncated: undefined,
        content: undefined,
      });
    });

    it('handles empty files object', () => {
      const gist = makeMockGist('gist-empty');

      const record = SyncQueueAccess.githubGistToRecord(gist);

      expect(record.files).toEqual({});
    });

    it('transforms owner when present', () => {
      const gist = makeMockGist('gist-owned');
      gist.owner = {
        login: 'testuser',
        id: 42,
        avatar_url: 'https://avatars.example.com/42',
        html_url: 'https://github.com/testuser',
      };

      const record = SyncQueueAccess.githubGistToRecord(gist);

      expect(record.owner).toEqual({
        login: 'testuser',
        id: 42,
        avatarUrl: 'https://avatars.example.com/42',
        htmlUrl: 'https://github.com/testuser',
      });
    });

    it('sets owner to undefined when gist has no owner', () => {
      const gist = makeMockGist('gist-no-owner');
      gist.owner = undefined;

      const record = SyncQueueAccess.githubGistToRecord(gist);

      expect(record.owner).toBeUndefined();
    });
  });

  // ── Retry exhaustion ──────────────────────────────────────────────────

  describe('retry exhaustion', () => {
    it('stores error and does not remove write when retryCount >= MAX_RETRIES', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(db.getPendingWrites).mockResolvedValue([
          {
            id: 1,
            gistId: 'gist-1',
            action: 'create' as SyncAction,
            payload: {},
            createdAt: 1000,
            retryCount: 3,
          },
        ]);
        vi.mocked(github.createGist).mockRejectedValue(new Error('network error'));

        const processPromise = queue.processQueue();
        await vi.runAllTimersAsync();
        await processPromise;

        expect(db.updatePendingWriteError).toHaveBeenCalledWith(1, 'network error');
        expect(db.removePendingWrite).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('stores error but does not remove write when retryCount is below MAX_RETRIES', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(db.getPendingWrites).mockResolvedValue([
          {
            id: 1,
            gistId: 'gist-1',
            action: 'create' as SyncAction,
            payload: {},
            createdAt: 1000,
            retryCount: 1,
          },
        ]);
        vi.mocked(github.createGist).mockRejectedValue(new Error('network error'));

        const processPromise = queue.processQueue();
        await vi.runAllTimersAsync();
        await processPromise;

        expect(db.updatePendingWriteError).toHaveBeenCalledWith(1, 'network error');
        expect(db.removePendingWrite).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // ── Dedup invalidation ───────────────────────────────────────────────

  describe('dedup invalidation', () => {
    it('processes create then delete for same gist in order', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(db.getPendingWrites).mockResolvedValue([
          {
            id: 1,
            gistId: 'gist-dedup',
            action: 'create' as SyncAction,
            payload: { description: 'temp gist' },
            createdAt: 1000,
            retryCount: 0,
          },
          {
            id: 2,
            gistId: 'gist-dedup',
            action: 'delete' as SyncAction,
            payload: undefined,
            createdAt: 2000,
            retryCount: 0,
          },
        ]);
        vi.mocked(github.createGist).mockResolvedValue(makeMockGist('gist-dedup'));
        vi.mocked(github.deleteGist).mockResolvedValue(undefined);

        const processPromise = queue.processQueue();
        await vi.runAllTimersAsync();
        await processPromise;

        const createCallOrder = vi.mocked(github.createGist).mock.invocationCallOrder[0];
        const deleteCallOrder = vi.mocked(github.deleteGist).mock.invocationCallOrder[0];
        expect(createCallOrder).toBeLessThan(deleteCallOrder);
        expect(db.saveGist).toHaveBeenCalledTimes(1);
        expect(db.removePendingWrite).toHaveBeenCalledWith(1);
        expect(db.removePendingWrite).toHaveBeenCalledWith(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('processes two updates for same gist in order', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(db.getPendingWrites).mockResolvedValue([
          {
            id: 1,
            gistId: 'gist-supersede',
            action: 'update' as SyncAction,
            payload: { description: 'first version' },
            createdAt: 1000,
            retryCount: 0,
          },
          {
            id: 2,
            gistId: 'gist-supersede',
            action: 'update' as SyncAction,
            payload: { description: 'second version' },
            createdAt: 2000,
            retryCount: 0,
          },
        ]);
        vi.mocked(github.updateGist).mockResolvedValue(makeMockGist('gist-supersede'));

        const processPromise = queue.processQueue();
        await vi.runAllTimersAsync();
        await processPromise;

        expect(github.updateGist).toHaveBeenCalledTimes(2);
        expect(db.removePendingWrite).toHaveBeenCalledWith(1);
        expect(db.removePendingWrite).toHaveBeenCalledWith(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
