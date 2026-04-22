import { test, expect } from '@playwright/test';

test.describe('IndexedDB Service', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should perform CRUD operations on gists', async ({ page }) => {
    const gist = {
      id: 'test-gist',
      description: 'Test Description',
      files: { 'test.txt': { filename: 'test.txt', content: 'test content' } },
      htmlUrl: 'https://gist.github.com/test-gist',
      gitPullUrl: 'https://gist.github.com/test-gist.git',
      gitPushUrl: 'https://gist.github.com/test-gist.git',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      starred: false,
      public: true,
      syncStatus: 'synced' as const
    };

    const result = await page.evaluate(async (g) => {
      const db = await import('/src/services/db.ts');
      await db.saveGist(g);
      const saved = await db.getGist(g.id);
      const all = await db.getAllGists();
      await db.deleteGist(g.id);
      const deleted = await db.getGist(g.id);
      return { saved, count: all.length, deleted };
    }, gist);

    expect(result.saved?.id).toBe(gist.id);
    expect(result.count).toBeGreaterThan(0);
    expect(result.deleted).toBeUndefined();
  });

  test('should queue and manage pending writes', async ({ page }) => {
    const write = {
      gistId: 'gist-1',
      action: 'update' as const,
      payload: { description: 'New description' }
    };

    const result = await page.evaluate(async (w) => {
      const db = await import('/src/services/db.ts');
      const id = await db.queueWrite(w);
      const pending = await db.getPendingWrites();
      await db.updatePendingWriteError(id, 'Sync failed');
      const updated = (await db.getPendingWrites())[0];
      await db.removePendingWrite(id);
      const remaining = await db.getPendingWrites();
      return { id, pendingCount: pending.length, retryCount: updated.retryCount, remainingCount: remaining.length };
    }, write);

    expect(result.id).toBeGreaterThan(0);
    expect(result.pendingCount).toBe(1);
    expect(result.retryCount).toBe(1);
    expect(result.remainingCount).toBe(0);
  });

  test('should manage metadata', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const db = await import('/src/services/db.ts');
      await db.setMetadata('test-key', 'test-value');
      return await db.getMetadata('test-key');
    });
    expect(result).toBe('test-value');
  });

  test('should export and import data', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const db = await import('/src/services/db.ts');
      await db.saveGist({ id: 'export-test', description: 'Export', files: {}, syncStatus: 'synced' } as any);
      const exported = await db.exportData();
      await db.clearAllData();
      const empty = await db.getAllGists();
      await db.importData(exported);
      const imported = await db.getAllGists();
      return { exported: !!exported, emptyCount: empty.length, importedCount: imported.length };
    });

    expect(result.exported).toBe(true);
    expect(result.emptyCount).toBe(0);
    expect(result.importedCount).toBe(1);
  });
});
