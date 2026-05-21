
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { SENSITIVE_METADATA_KEYS, exportData, initIndexedDB, setMetadata } from '../../src/services/db';

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
    await setMetadata('github-refresh-token', { secret: 'refresh' });
    await setMetadata('theme-preference', 'dark');

    const exportedJson = await exportData();
    const data = JSON.parse(exportedJson);

    const keys = data.metadata.map((m: any) => m.key);

    expect(keys).toContain('theme-preference');
    expect(keys).not.toContain('gist-hub-master-key');
    expect(keys).not.toContain('github-pat-enc');
    expect(keys).not.toContain('github-pat');
    expect(keys).not.toContain('github-refresh-token');
  });

  it('should verify the presence of sensitive keys in SENSITIVE_METADATA_KEYS array', () => {
    expect(SENSITIVE_METADATA_KEYS).toContain('github-pat-enc');
    expect(SENSITIVE_METADATA_KEYS).toContain('github-refresh-token');
    expect(SENSITIVE_METADATA_KEYS).toContain('gist-hub-master-key');
  });
});
