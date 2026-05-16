import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncQueue, type SyncAction } from '../../src/services/sync/queue';
import * as db from '../../src/services/db';
import networkMonitor from '../../src/services/network/offline-monitor';
import * as github from '../../src/services/github';
import * as rateLimiter from '../../src/services/github/rate-limiter';
import * as conflictDetector from '../../src/services/sync/conflict-detector';
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
      expect(window.addEventListener).toHaveBeenCalledWith(
        'app:online',
        expect.any(Function),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
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
      const processQueueSpy = vi
        .spyOn(queue, 'processQueue')
        .mockResolvedValue(undefined);

      await queue.queueOperation('gist-4', 'create', {});

      expect(processQueueSpy).toHaveBeenCalled();
      processQueueSpy.mockRestore();
    });

    it('does not trigger processQueue when offline', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);
      vi.mocked(db.queueWrite).mockResolvedValue(5);
      const processQueueSpy = vi
        .spyOn(queue, 'processQueue')
        .mockResolvedValue(undefined);

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

      const createOrder = vi.mocked(github.createGist).mock.invocationCallOrder[0];
      const updateOrder = vi.mocked(github.updateGist).mock.invocationCallOrder[0];
      expect(createOrder).toBeLessThan(updateOrder);
      const deleteOrder = vi.mocked(github.deleteGist).mock.invocationCallOrder[0];
      expect(updateOrder).toBeLessThan(deleteOrder);
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

  // ── executeWrite ─────────────────────────────────────────────────────────

  describe('executeWrite', () => {
    it('handles star action via syncStar', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
      vi.mocked(db.getPendingWrites).mockResolvedValue([
        {
          id: 1,
          gistId: 'gist-1',
          action: 'star' as SyncAction,
          payload: undefined,
          createdAt: 1000,
          retryCount: 0,
        },
      ]);
      vi.spyOn(SyncQueueStatic, 'delay').mockResolvedValue(undefined);
      vi.mocked(github.starGist).mockResolvedValue(undefined);

      await queue.processQueue();

      expect(github.starGist).toHaveBeenCalledWith('gist-1');
    });

    it('handles unstar action via syncUnstar', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
      vi.mocked(db.getPendingWrites).mockResolvedValue([
        {
          id: 1,
          gistId: 'gist-1',
          action: 'unstar' as SyncAction,
          payload: undefined,
          createdAt: 1000,
          retryCount: 0,
        },
      ]);
      vi.spyOn(SyncQueueStatic, 'delay').mockResolvedValue(undefined);
      vi.mocked(github.unstarGist).mockResolvedValue(undefined);

      await queue.processQueue();

      expect(github.unstarGist).toHaveBeenCalledWith('gist-1');
    });

    it('handles fork action via syncFork', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
      vi.mocked(db.getPendingWrites).mockResolvedValue([
        {
          id: 1,
          gistId: 'gist-1',
          action: 'fork' as SyncAction,
          payload: undefined,
          createdAt: 1000,
          retryCount: 0,
        },
      ]);
      vi.spyOn(SyncQueueStatic, 'delay').mockResolvedValue(undefined);
      const forkedGist = makeMockGist('gist-forked');
      vi.mocked(github.forkGist).mockResolvedValue(forkedGist);

      await queue.processQueue();

      expect(github.forkGist).toHaveBeenCalledWith('gist-1');
    });

    it('detects pre-write conflict when expectedRemoteVersion mismatches', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
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
      vi.spyOn(SyncQueueStatic, 'delay').mockResolvedValue(undefined);
      const remoteGist = makeMockGist('gist-1');
      remoteGist.updated_at = '2026-01-15T12:00:00Z'; // Different from expected
      vi.mocked(github.getGist).mockResolvedValue(remoteGist);
      vi.mocked(db.getGist).mockResolvedValue({ id: 'gist-1', description: 'local' } as never);
      vi.mocked(conflictDetector.detectConflict).mockReturnValue({
        gistId: 'gist-1',
        conflictingFields: ['updated_at'],
        detectedAt: new Date().toISOString(),
      } as never);

      await queue.processQueue();

      expect(conflictDetector.storeConflict).toHaveBeenCalled();
      expect(db.removePendingWrite).not.toHaveBeenCalledWith(1);
    });

    it('handles unknown action gracefully', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
      vi.mocked(db.getPendingWrites).mockResolvedValue([
        {
          id: 5,
          gistId: 'gist-5',
          action: 'unknown' as SyncAction,
          payload: undefined,
          createdAt: 1000,
          retryCount: 0,
        },
      ]);
      vi.spyOn(SyncQueueStatic, 'delay').mockResolvedValue(undefined);

      await queue.processQueue();

      expect(db.updatePendingWriteError).toHaveBeenCalledWith(
        5,
        expect.stringContaining('Unknown action')
      );
    });
  });

  // ── isRetryableError ───────────────────────────────────────────────────

  describe('isRetryableError', () => {
    it('is retryable for network errors', () => {
      // Access via the SyncQueue type to test private static method
      const SyncQueueAny = SyncQueue as unknown as { isRetryableError(e: unknown): boolean };
      expect(SyncQueueAny.isRetryableError(new Error('network error'))).toBe(true);
      expect(SyncQueueAny.isRetryableError(new Error('fetch failed'))).toBe(true);
      expect(SyncQueueAny.isRetryableError(new Error('rate limit exceeded'))).toBe(true);
      expect(SyncQueueAny.isRetryableError(new Error('timeout'))).toBe(true);
    });

    it('is not retryable for non-network errors', () => {
      const SyncQueueAny = SyncQueue as unknown as { isRetryableError(e: unknown): boolean };
      expect(SyncQueueAny.isRetryableError(new Error('bad request'))).toBe(false);
      expect(SyncQueueAny.isRetryableError(new Error('not found'))).toBe(false);
    });

    it('is not retryable for non-Error values', () => {
      const SyncQueueAny = SyncQueue as unknown as { isRetryableError(e: unknown): boolean };
      expect(SyncQueueAny.isRetryableError('string error')).toBe(false);
      expect(SyncQueueAny.isRetryableError(null)).toBe(false);
    });
  });

  // ── rate limiter ───────────────────────────────────────────────────────

  describe('rate limiter integration', () => {
    it('pauses queue processing when rate limit is low', async () => {
      vi.mocked(rateLimiter.isSafeToRequest).mockReturnValue(false);
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

      await queue.processQueue();

      // Should not call createGist since rate limiter says not safe
      expect(github.createGist).not.toHaveBeenCalled();
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
