
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { exportData, initIndexedDB, setMetadata } from '../../src/services/db';

// Mock app config
vi.mock('@/config/app.config', () => ({
  APP: {
    dbName: 'test-db-' + Math.random(),
  },
}));

describe('exportData security', () => {
  beforeEach(async () => {
    await initIndexedDB();
  });

  it('should not include sensitive metadata keys in exportData', async () => {
    // Setup metadata with sensitive and non-sensitive keys
    await setMetadata('gist-hub-master-key', { secret: 'key' });
    await setMetadata('github-pat-enc', { secret: 'token' });
    await setMetadata('github-pat', 'legacy-token');
    await setMetadata('theme-preference', 'dark');

    const exportedJson = await exportData();
    const data = JSON.parse(exportedJson);

    const keys = data.metadata.map((m: any) => m.key);

    expect(keys).toContain('theme-preference');
    expect(keys).not.toContain('gist-hub-master-key');
    expect(keys).not.toContain('github-pat-enc');
    expect(keys).not.toContain('github-pat');
  });
});
