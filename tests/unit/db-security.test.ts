
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { exportData, getDB, initIndexedDB, setMetadata } from '../../src/services/db';

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
    await setMetadata('github-refresh-expires', 123456789);
    await setMetadata('github-username', 'testuser');
    await setMetadata('llm-config', { apiKey: 'secret' });
    await setMetadata('theme-preference', 'dark');

    const exportedJson = await exportData();
    const data = JSON.parse(exportedJson);

    const keys = data.metadata.map((m: any) => m.key);

    expect(keys).toContain('theme-preference');
    expect(keys).not.toContain('gist-hub-master-key');
    expect(keys).not.toContain('github-pat-enc');
    expect(keys).not.toContain('github-pat');
    expect(keys).not.toContain('github-refresh-token');
    expect(keys).not.toContain('github-refresh-expires');
    expect(keys).not.toContain('github-username');
    expect(keys).not.toContain('llm-config');
  });

  it('should redact secrets from logs in exportData', async () => {
    const db = getDB();
    await db.add('logs', {
      timestamp: Date.now(),
      level: 'info',
      message: 'Fetching gist with ghp_000000000000000000000000000000000000',
      data: { token: 'github_pat_11AAAAAAA000000000000000000000000000000000000000000000' },
    });

    const exportedJson = await exportData();
    const data = JSON.parse(exportedJson);

    const log = data.logs[0];
    expect(log.message).toContain('[REDACTED]');
    expect(log.message).not.toContain('ghp_secret');
    expect(log.data.token).toBe('[REDACTED]');
  });
});
