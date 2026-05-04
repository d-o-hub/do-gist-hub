import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncQueue, type SyncAction } from '../../src/services/sync/queue';
import * as db from '../../src/services/db';
import networkMonitor from '../../src/services/network/offline-monitor';
import * as github from '../../src/services/github';
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

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

vi.mock('../../src/services/sync/conflict-detector', () => ({
  detectConflict: vi.fn(),
  storeConflict: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Minimal GitHubGist shape for test mocks. */
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

/** Cast to access private static members for testing. */
interface SyncQueueStatic {
  calculateBackoff(attempt: number, retryAfterMs?: number): number;
  delay(ms: number): Promise<void>;
}

const SyncQueueStatic = SyncQueue as unknown as SyncQueueStatic;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SyncQueue', () => {
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

  // ── init ──────────────────────────────────────────────────────────────────

  describe('init', () => {
    it('should subscribe to network monitor and register window listener', () => {
      queue.init();
      expect(networkMonitor.subscribe).toHaveBeenCalledWith(expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('app:online', expect.any(Function));
    });
  });

  // ── queueOperation ────────────────────────────────────────────────────────

  describe('queueOperation', () => {
    it('queues a create operation when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);
      vi.mocked(db.queueWrite).mockResolvedValue(1);

      const id = await queue.queueOperation('gist-1', 'create', { description: 'test' });

      expect(db.queueWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          gistId: 'gist-1',
          action: 'create',
          payload: { description: 'test' },
          lastAttemptAt: undefined,
          error: undefined,
        })
      );
      expect(id).toBe(1);
    });

    it('queues an update operation when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);
      vi.mocked(db.queueWrite).mockResolvedValue(2);

      const id = await queue.queueOperation('gist-2', 'update', { description: 'updated' });

      expect(db.queueWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          gistId: 'gist-2',
          action: 'update',
          payload: { description: 'updated' },
        })
      );
      expect(id).toBe(2);
    });

    it('queues a delete operation when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);
      vi.mocked(db.queueWrite).mockResolvedValue(3);

      const id = await queue.queueOperation('gist-3', 'delete', undefined);

      expect(db.queueWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          gistId: 'gist-3',
          action: 'delete',
          payload: undefined,
        })
      );
      expect(id).toBe(3);
    });

    it('triggers processQueue when online', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
      vi.mocked(db.queueWrite).mockResolvedValue(4);
      const processQueueSpy = vi.spyOn(queue, 'processQueue').mockResolvedValue(undefined);

      await queue.queueOperation('gist-4', 'create', {});

      expect(processQueueSpy).toHaveBeenCalled();
      processQueueSpy.mockRestore();
    });

    it('does not trigger processQueue when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);
      vi.mocked(db.queueWrite).mockResolvedValue(5);
      const processQueueSpy = vi.spyOn(queue, 'processQueue').mockResolvedValue(undefined);

      await queue.queueOperation('gist-5', 'create', {});

      expect(processQueueSpy).not.toHaveBeenCalled();
      processQueueSpy.mockRestore();
    });
  });

  // ── processQueue ──────────────────────────────────────────────────────────

  describe('processQueue', () => {
    it('processes operations in FIFO order', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
      vi.mocked(db.getPendingWrites).mockResolvedValue([
        {
          id: 2,
          gistId: 'gist-b',
          action: 'update' as SyncAction,
          payload: { description: 'b' },
          createdAt: 2000,
          retryCount: 0,
        },
        {
          id: 1,
          gistId: 'gist-a',
          action: 'create' as SyncAction,
          payload: { description: 'a' },
          createdAt: 1000,
          retryCount: 0,
        },
        {
          id: 3,
          gistId: 'gist-c',
          action: 'delete' as SyncAction,
          payload: undefined,
          createdAt: 3000,
          retryCount: 0,
        },
      ]);

      vi.spyOn(SyncQueueStatic, 'delay').mockResolvedValue(undefined);
      vi.mocked(github.createGist).mockResolvedValue(makeMockGist('gist-a'));
      vi.mocked(github.updateGist).mockResolvedValue(makeMockGist('gist-b'));
      vi.mocked(github.deleteGist).mockResolvedValue(undefined);

      await queue.processQueue();

      expect(github.createGist).toHaveBeenCalledBefore(github.updateGist);
      expect(github.updateGist).toHaveBeenCalledBefore(github.deleteGist);
      expect(db.removePendingWrite).toHaveBeenCalledWith(1);
      expect(db.removePendingWrite).toHaveBeenCalledWith(2);
      expect(db.removePendingWrite).toHaveBeenCalledWith(3);
    });

    it('does nothing when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);
      await queue.processQueue();
      expect(db.getPendingWrites).not.toHaveBeenCalled();
    });

    it('does nothing when already syncing', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
      vi.mocked(db.getPendingWrites).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 20))
      );

      const p1 = queue.processQueue();
      const p2 = queue.processQueue();
      await Promise.all([p1, p2]);

      expect(db.getPendingWrites).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable error', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
      vi.mocked(db.getPendingWrites).mockResolvedValue([
        {
          id: 1,
          gistId: 'gist-1',
          action: 'create' as SyncAction,
          payload: {},
          createdAt: 1000,
          retryCount: 0,
        },
      ]);
      vi.spyOn(SyncQueueStatic, 'delay').mockResolvedValue(undefined);
      vi.mocked(github.createGist).mockRejectedValue(new Error('network error'));

      await queue.processQueue();

      expect(db.updatePendingWriteError).toHaveBeenCalledWith(1, 'network error');
    });

    it('does not retry on non-retryable error', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
      vi.mocked(db.getPendingWrites).mockResolvedValue([
        {
          id: 1,
          gistId: 'gist-1',
          action: 'create' as SyncAction,
          payload: {},
          createdAt: 1000,
          retryCount: 0,
        },
      ]);
      vi.spyOn(SyncQueueStatic, 'delay').mockResolvedValue(undefined);
      vi.mocked(github.createGist).mockRejectedValue(new Error('bad request'));

      await queue.processQueue();

      expect(db.updatePendingWriteError).toHaveBeenCalledWith(1, 'bad request');
    });
  });

  // ── getQueueLength ────────────────────────────────────────────────────────

  describe('getQueueLength', () => {
    it('returns correct count', async () => {
      vi.mocked(db.getPendingWrites).mockResolvedValue([
        {
          id: 1,
          gistId: 'gist-1',
          action: 'create' as SyncAction,
          payload: {},
          createdAt: 1000,
          retryCount: 0,
        },
        {
          id: 2,
          gistId: 'gist-2',
          action: 'update' as SyncAction,
          payload: {},
          createdAt: 2000,
          retryCount: 0,
        },
      ]);

      const length = await queue.getQueueLength();
      expect(length).toBe(2);
    });
  });

  // ── calculateBackoff ──────────────────────────────────────────────────────

  describe('calculateBackoff', () => {
    it('calculates exponential backoff with jitter', () => {
      const backoff0 = SyncQueueStatic.calculateBackoff(0);
      expect(backoff0).toBeGreaterThanOrEqual(1000);
      expect(backoff0).toBeLessThan(2000);

      const backoff1 = SyncQueueStatic.calculateBackoff(1);
      expect(backoff1).toBeGreaterThanOrEqual(2000);
      expect(backoff1).toBeLessThan(3000);

      const backoff2 = SyncQueueStatic.calculateBackoff(2);
      expect(backoff2).toBeGreaterThanOrEqual(4000);
      expect(backoff2).toBeLessThan(5000);
    });

    it('caps at max delay', () => {
      const backoff10 = SyncQueueStatic.calculateBackoff(10);
      expect(backoff10).toBeLessThanOrEqual(30000);
    });

    it('respects Retry-After value when provided', () => {
      const retryAfter = SyncQueueStatic.calculateBackoff(0, 5000);
      expect(retryAfter).toBe(5000);
    });
  });

  // ── destroy ───────────────────────────────────────────────────────────────

  describe('destroy', () => {
    it('cleans up network subscription', () => {
      const unsubscribeMock = vi.fn();
      vi.mocked(networkMonitor.subscribe).mockReturnValue(unsubscribeMock);

      queue.init();
      queue.destroy();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });
});
