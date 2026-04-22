import { test, expect } from '@playwright/test';

test.describe('Sync Queue and Offline Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('queueWrite adds operation to pendingWrites store', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { initIndexedDB, queueWrite, getPendingWrites } = await import('../../src/services/db');
      await initIndexedDB();

      const writeId = await queueWrite({
        gistId: 'gist-queue-test-1',
        action: 'create',
        payload: {
          description: 'Queued create',
          public: true,
          files: { 'queued.js': { content: 'console.log("queued");' } },
        },
      });

      const pending = await getPendingWrites();
      return {
        writeId,
        pendingCount: pending.length,
        firstWrite: pending[0],
      };
    });

    expect(result.writeId).toBeGreaterThan(0);
    expect(result.pendingCount).toBe(1);
    expect(result.firstWrite.gistId).toBe('gist-queue-test-1');
    expect(result.firstWrite.action).toBe('create');
    expect(result.firstWrite.retryCount).toBe(0);
    expect(result.firstWrite.error).toBeUndefined();
  });

  test('multiple queued writes are stored in order', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { initIndexedDB, queueWrite, getPendingWrites } = await import('../../src/services/db');
      await initIndexedDB();

      // Queue multiple operations
      await queueWrite({
        gistId: 'gist-1',
        action: 'create',
        payload: { description: 'First' },
      });

      await queueWrite({
        gistId: 'gist-2',
        action: 'update',
        payload: { description: 'Second' },
      });

      await queueWrite({
        gistId: 'gist-3',
        action: 'delete',
        payload: {},
      });

      await queueWrite({
        gistId: 'gist-1',
        action: 'star',
        payload: {},
      });

      const pending = await getPendingWrites();
      return {
        count: pending.length,
        actions: pending.map(w => w.action),
        gistIds: pending.map(w => w.gistId),
      };
    });

    expect(result.count).toBe(4);
    expect(result.actions).toEqual(['create', 'update', 'delete', 'star']);
    expect(result.gistIds).toEqual(['gist-1', 'gist-2', 'gist-3', 'gist-1']);
  });

  test('queued write has correct createdAt timestamp', async ({ page }) => {
    const before = Date.now();

    const writeTime = await page.evaluate(async () => {
      const { initIndexedDB, queueWrite, getPendingWrites } = await import('../../src/services/db');
      await initIndexedDB();

      await queueWrite({
        gistId: 'timestamp-test',
        action: 'update',
        payload: {},
      });

      const pending = await getPendingWrites();
      return pending[0].createdAt;
    });

    const after = Date.now();

    expect(writeTime).toBeGreaterThanOrEqual(before);
    expect(writeTime).toBeLessThanOrEqual(after);
  });

  test('removePendingWrite deletes operation after successful sync', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { initIndexedDB, queueWrite, getPendingWrites, removePendingWrite } = await import('../../src/services/db');
      await initIndexedDB();

      await queueWrite({ gistId: 'gist-a', action: 'create', payload: {} });
      const id2 = await queueWrite({ gistId: 'gist-b', action: 'update', payload: {} });
      await queueWrite({ gistId: 'gist-c', action: 'delete', payload: {} });

      // Remove the middle one (simulating successful sync)
      await removePendingWrite(id2);

      const remaining = await getPendingWrites();
      return {
        remainingCount: remaining.length,
        remainingIds: remaining.map(w => w.id),
        removedId: id2,
      };
    });

    expect(result.remainingCount).toBe(2);
    expect(result.remainingIds).toContain(result.remainingIds[0]);
    expect(result.remainingIds).not.toContain(result.removedId);
  });

  test('updatePendingWriteError increments retry count and stores error', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { initIndexedDB, queueWrite, getPendingWrites, updatePendingWriteError } = await import('../../src/services/db');
      await initIndexedDB();

      const id = await queueWrite({
        gistId: 'retry-test',
        action: 'create',
        payload: {},
      });

      // Simulate first failure
      await updatePendingWriteError(id, 'Network error: fetch failed');

      let pending = await getPendingWrites();
      const first = pending.find(w => w.id === id)!;

      // Simulate second failure
      await updatePendingWriteError(id, 'Rate limit exceeded');

      pending = await getPendingWrites();
      const second = pending.find(w => w.id === id)!;

      return {
        firstRetryCount: first.retryCount,
        firstError: first.error,
        secondRetryCount: second.retryCount,
        secondError: second.error,
        lastAttemptAt: second.lastAttemptAt,
      };
    });

    expect(result.firstRetryCount).toBe(1);
    expect(result.firstError).toBe('Network error: fetch failed');
    expect(result.secondRetryCount).toBe(2);
    expect(result.secondError).toBe('Rate limit exceeded');
    expect(result.lastAttemptAt).toBeDefined();
    expect(result.lastAttemptAt).toBeGreaterThan(0);
  });

  test('all action types can be queued', async ({ page }) => {
    const actions: Array<'create' | 'update' | 'delete' | 'star' | 'unstar' | 'fork'> = [
      'create', 'update', 'delete', 'star', 'unstar', 'fork',
    ];

    const result = await page.evaluate(async (actionsToQueue: string[]) => {
      const { initIndexedDB, queueWrite, getPendingWrites } = await import('../../src/services/db');
      await initIndexedDB();

      for (const action of actionsToQueue) {
        await queueWrite({
          gistId: `gist-${action}`,
          action: action,
          payload: {},
        });
      }

      const pending = await getPendingWrites();
      return {
        count: pending.length,
        actions: pending.map(w => w.action),
      };
    }, actions);

    expect(result.count).toBe(6);
    expect(result.actions).toEqual(actions);
  });

  test('queue length is tracked correctly', async ({ page }) => {
    await page.evaluate(async () => {
      const w = window as unknown as { __queueLen1: number; __queueLen2: number; __queueLen3: number; };
      const { initIndexedDB, queueWrite, removePendingWrite, getPendingWrites } = await import('../../src/services/db');
      await initIndexedDB();

      const id1 = await queueWrite({ gistId: 'len-1', action: 'create', payload: {} });
      const id2 = await queueWrite({ gistId: 'len-2', action: 'update', payload: {} });

      let count = (await getPendingWrites()).length;
      w.__queueLen1 = count;

      await removePendingWrite(id1);

      count = (await getPendingWrites()).length;
      w.__queueLen2 = count;

      await removePendingWrite(id2);

      count = (await getPendingWrites()).length;
      w.__queueLen3 = count;
    });

    const len1 = await page.evaluate<number>(() => (window as unknown as { __queueLen1: number }).__queueLen1);
    const len2 = await page.evaluate(() => (window as Window & { __queueLen2: number }).__queueLen2);
    const len3 = await page.evaluate(() => (window as Window & { __queueLen3: number }).__queueLen3);

    expect(len1).toBe(2);
    expect(len2).toBe(1);
    expect(len3).toBe(0);
  });

  test('pending writes can be filtered by gistId using index', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { initIndexedDB, queueWrite, getPendingWrites } = await import('../../src/services/db');
      await initIndexedDB();

      // Queue writes for different gists
      await queueWrite({ gistId: 'gist-alpha', action: 'create', payload: {} });
      await queueWrite({ gistId: 'gist-alpha', action: 'update', payload: {} });
      await queueWrite({ gistId: 'gist-beta', action: 'star', payload: {} });
      await queueWrite({ gistId: 'gist-alpha', action: 'delete', payload: {} });

      const all = await getPendingWrites();
      const alphaWrites = all.filter(w => w.gistId === 'gist-alpha');
      const betaWrites = all.filter(w => w.gistId === 'gist-beta');

      return {
        totalWrites: all.length,
        alphaWrites: alphaWrites.length,
        alphaActions: alphaWrites.map(w => w.action),
        betaWrites: betaWrites.length,
      };
    });

    expect(result.totalWrites).toBe(4);
    expect(result.alphaWrites).toBe(3);
    expect(result.alphaActions).toEqual(['create', 'update', 'delete']);
    expect(result.betaWrites).toBe(1);
  });

  test('queue operations persist across page navigation', async ({ page }) => {
    // Queue writes on first page visit
    await page.evaluate(async () => {
      const { initIndexedDB, queueWrite } = await import('../../src/services/db');
      await initIndexedDB();

      await queueWrite({ gistId: 'persist-1', action: 'create', payload: {} });
      await queueWrite({ gistId: 'persist-2', action: 'update', payload: {} });
    });

    // Navigate away and back
    await page.goto('http://localhost:3000');

    // Verify writes still exist
    const persistCount = await page.evaluate(async () => {
      const { initIndexedDB, getPendingWrites } = await import('../../src/services/db');
      await initIndexedDB();
      const pending = await getPendingWrites();
      return pending.length;
    });

    expect(persistCount).toBe(2);
  });

  test('sync queue does not process when offline', async ({ page }) => {
    await page.context().setOffline(true);

    const queueState = await page.evaluate(async () => {
      const { initIndexedDB, queueWrite, getPendingWrites } = await import('../../src/services/db');
      await initIndexedDB();

      // Queue a write while offline
      await queueWrite({
        gistId: 'offline-queue-test',
        action: 'create',
        payload: { description: 'Created offline' },
      });

      const pending = await getPendingWrites();
      return {
        count: pending.length,
        firstWrite: pending[0],
      };
    });

    expect(queueState.count).toBe(1);
    expect(queueState.firstWrite.gistId).toBe('offline-queue-test');
    expect(queueState.firstWrite.error).toBeUndefined();
    expect(queueState.firstWrite.retryCount).toBe(0);
  });

  test('payload is stored with queued write for later sync', async ({ page }) => {
    const payloadData = await page.evaluate(async () => {
      const { initIndexedDB, queueWrite, getPendingWrites } = await import('../../src/services/db');
      await initIndexedDB();

      const complexPayload = {
        description: 'Complex gist',
        public: false,
        files: {
          'main.ts': { content: 'export const x = 1;' },
          'utils.ts': { content: 'export const y = 2;' },
        },
      };

      await queueWrite({
        gistId: 'payload-test',
        action: 'create',
        payload: complexPayload,
      });

      const pending = await getPendingWrites();
      return pending[0].payload;
    });

    expect(payloadData).toEqual({
      description: 'Complex gist',
      public: false,
      files: {
        'main.ts': { content: 'export const x = 1;' },
        'utils.ts': { content: 'export const y = 2;' },
      },
    });
  });

  test('queued writes sorted by createdAt for processing order', async ({ page }) => {
    const sorted = await page.evaluate(async () => {
      const { initIndexedDB, queueWrite, getPendingWrites } = await import('../../src/services/db');
      await initIndexedDB();

      // Queue in specific order with small delays
      await queueWrite({ gistId: 'first', action: 'create', payload: {} });
      await new Promise(r => setTimeout(r, 5));
      await queueWrite({ gistId: 'second', action: 'create', payload: {} });
      await new Promise(r => setTimeout(r, 5));
      await queueWrite({ gistId: 'third', action: 'create', payload: {} });

      const pending = await getPendingWrites();
      const sorted = pending.sort((a, b) => a.createdAt - b.createdAt);

      return {
        order: sorted.map(w => w.gistId),
        timestampsIncreasing: sorted.every((w, i) => i === 0 || w.createdAt >= sorted[i - 1].createdAt),
      };
    });

    expect(sorted.order).toEqual(['first', 'second', 'third']);
    expect(sorted.timestampsIncreasing).toBe(true);
  });
});
