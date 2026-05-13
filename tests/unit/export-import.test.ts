/**
 * Unit tests for src/services/export-import.ts
 * Covers exportAllGists, importGists, ExportData, ImportResult
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db module — all exports become vi.fn()
vi.mock('../../src/services/db', () => ({
  getAllGists: vi.fn(),
  getGist: vi.fn(),
  getDB: vi.fn(() => ({
    put: vi.fn(),
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        put: vi.fn(),
      })),
    })),
  })),
  saveGists: vi.fn(),
  isDBReady: vi.fn(() => true),
}));

vi.mock('../../src/services/sync/conflict-detector', () => ({
  detectConflict: vi.fn(() => null),
  storeConflict: vi.fn(),
}));

import { exportAllGists, importGists } from '../../src/services/export-import';
import * as db from '../../src/services/db';
import * as conflictDetector from '../../src/services/sync/conflict-detector';

const mockGist = {
  id: 'gist-1',
  description: 'Test gist',
  files: {
    'test.ts': { filename: 'test.ts', language: 'typescript', content: 'const x = 1;' },
  },
  htmlUrl: 'https://gist.github.com/gist-1',
  gitPullUrl: 'https://gist.github.com/gist-1.git',
  gitPushUrl: 'https://gist.github.com/gist-1.git',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-15T12:00:00Z',
  starred: false,
  public: true,
  owner: { login: 'test', id: 1, avatarUrl: '', htmlUrl: '' },
  syncStatus: 'synced',
  lastSyncedAt: '2026-01-15T12:00:00Z',
};

describe('ExportImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getAllGists).mockResolvedValue([mockGist]);
    vi.mocked(db.getGist).mockResolvedValue(mockGist);
    vi.mocked(db.saveGists).mockResolvedValue(undefined);
  });

  describe('exportAllGists', () => {
    it('creates a Blob with correct export data', async () => {
      const blob = await exportAllGists();
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });

    it('contains correct metadata in the exported JSON', async () => {
      const blob = await exportAllGists();
      const text = await blob.text();
      const data = JSON.parse(text);

      expect(data.version).toBe('3.0.0');
      expect(data.metadata.total).toBe(1);
      expect(data.gists).toHaveLength(1);
      expect(data.gists[0].id).toBe('gist-1');
    });

    it('counts starred gists in metadata', async () => {
      const starred = { ...mockGist, starred: true };
      vi.mocked(db.getAllGists).mockResolvedValue([mockGist, starred]);

      const blob = await exportAllGists();
      const data = JSON.parse(await blob.text());
      expect(data.metadata.starred).toBe(1);
    });

    it('calls getAllGists from db', async () => {
      await exportAllGists();
      expect(db.getAllGists).toHaveBeenCalled();
    });
  });

  describe('importGists', () => {
    it('imports new gists from a valid file', async () => {
      vi.mocked(db.getGist).mockResolvedValue(undefined);

      const file = new File(
        [
          JSON.stringify({
            version: '3.0.0',
            exportedAt: '2026-02-01T00:00:00Z',
            gists: [mockGist],
            metadata: { total: 1, starred: 0 },
          }),
        ],
        'export.json',
        { type: 'application/json' }
      );

      const result = await importGists(file);
      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('skips unchanged existing gists', async () => {
      vi.mocked(db.getGist).mockResolvedValue(mockGist);

      const file = new File(
        [
          JSON.stringify({
            version: '3.0.0',
            exportedAt: '2026-02-01T00:00:00Z',
            gists: [mockGist],
            metadata: { total: 1, starred: 0 },
          }),
        ],
        'export.json',
        { type: 'application/json' }
      );

      const result = await importGists(file);
      expect(result.skipped).toBe(1);
      expect(result.imported).toBe(0);
    });

    it('reports errors for invalid file format', async () => {
      const file = new File(['not json'], 'bad.json', { type: 'application/json' });
      const result = await importGists(file);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('parse');
    });

    it('reports errors for missing gists array', async () => {
      const file = new File(
        [
          JSON.stringify({
            version: '3.0.0',
            exportedAt: '2026-02-01T00:00:00Z',
            metadata: { total: 0, starred: 0 },
          }),
        ],
        'bad.json',
        { type: 'application/json' }
      );

      const result = await importGists(file);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('missing gists array');
    });
  });
});
