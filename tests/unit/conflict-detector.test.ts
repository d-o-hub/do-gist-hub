/**
 * Unit tests for src/services/sync/conflict-detector.ts
 * Vitest port of conflict-detector.spec.ts (which used node:test and was never picked up)
 */
import { describe, it, expect } from 'vitest';
import { detectConflict, resolveConflict } from '../../src/services/sync/conflict-detector';
import type { GistRecord } from '../../src/services/db';
import type { GistConflict } from '../../src/services/sync/conflict-detector';

describe('ConflictDetector', () => {
  describe('detectConflict', () => {
    it('returns null for identical gists', () => {
      const local = {
        id: 'gist123',
        description: 'Original description',
        public: true,
        updatedAt: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } as GistRecord['files'][string] },
        syncStatus: 'synced',
      } as GistRecord;

      const remote = {
        id: 'gist123',
        description: 'Original description',
        public: true,
        updated_at: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      };

      expect(detectConflict(local, remote as Parameters<typeof detectConflict>[1])).toBeNull();
    });

    it('detects conflict when description changes', () => {
      const local = {
        id: 'gist123',
        description: 'Local description',
        public: true,
        updatedAt: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } as GistRecord['files'][string] },
        syncStatus: 'synced',
      } as GistRecord;

      const remote = {
        id: 'gist123',
        description: 'Remote description',
        public: true,
        updated_at: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      };

      const result = detectConflict(local, remote as Parameters<typeof detectConflict>[1]);
      expect(result).not.toBeNull();
      expect(result!.conflictingFields).toEqual(['description']);
    });

    it('detects conflict when public status changes', () => {
      const local = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updatedAt: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } as GistRecord['files'][string] },
        syncStatus: 'synced',
      } as GistRecord;

      const remote = {
        id: 'gist123',
        description: 'Desc',
        public: false,
        updated_at: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      };

      const result = detectConflict(local, remote as Parameters<typeof detectConflict>[1]);
      expect(result).not.toBeNull();
      expect(result!.conflictingFields).toEqual(['public']);
    });

    it('detects content conflict when remote is newer and size differs', () => {
      const local = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updatedAt: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } as GistRecord['files'][string] },
        syncStatus: 'synced',
      } as GistRecord;

      const remote = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updated_at: '2026-01-01T11:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 200 } },
      };

      const result = detectConflict(local, remote as Parameters<typeof detectConflict>[1]);
      expect(result).not.toBeNull();
      expect(result!.conflictingFields).toEqual(['content']);
    });

    it('does NOT detect conflict when remote is newer but content identical', () => {
      const local = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updatedAt: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } as GistRecord['files'][string] },
        syncStatus: 'synced',
      } as GistRecord;

      const remote = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updated_at: '2026-01-01T11:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      };

      expect(detectConflict(local, remote as Parameters<typeof detectConflict>[1])).toBeNull();
    });

    it('detects content conflict when file count differs', () => {
      const local = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updatedAt: '2026-01-01T10:00:00Z',
        files: {
          'file1.txt': { filename: 'file1.txt', size: 100 } as GistRecord['files'][string],
          'file2.txt': { filename: 'file2.txt', size: 50 } as GistRecord['files'][string],
        },
        syncStatus: 'synced',
      } as GistRecord;

      const remote = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updated_at: '2026-01-01T11:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      };

      const result = detectConflict(local, remote as Parameters<typeof detectConflict>[1]);
      expect(result).not.toBeNull();
      expect(result!.conflictingFields).toContain('content');
    });

    it('detects content conflict when file names differ', () => {
      const local = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updatedAt: '2026-01-01T10:00:00Z',
        files: { 'file1.txt': { filename: 'file1.txt', size: 100 } as GistRecord['files'][string] },
        syncStatus: 'synced',
      } as GistRecord;

      const remote = {
        id: 'gist123',
        description: 'Desc',
        public: true,
        updated_at: '2026-01-01T11:00:00Z',
        files: { 'file2.txt': { filename: 'file2.txt', size: 100 } },
      };

      const result = detectConflict(local, remote as Parameters<typeof detectConflict>[1]);
      expect(result).not.toBeNull();
      expect(result!.conflictingFields).toContain('content');
    });
  });

  describe('resolveConflict', () => {
    const local = {
      id: '123',
      description: 'Local',
      starred: true,
      syncStatus: 'synced',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      public: true,
      files: {},
      htmlUrl: '',
      gitPullUrl: '',
      gitPushUrl: '',
      lastSyncedAt: '2026-01-01T00:00:00Z',
    } as unknown as GistRecord;

    const remote = {
      id: '123',
      description: 'Remote',
      files: { 'f.txt': { filename: 'f.txt', type: 'text/plain', size: 10 } },
      html_url: 'url',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T12:00:00Z',
      public: true,
    };

    const conflict: GistConflict = {
      gistId: '123',
      localVersion: local,
      remoteVersion: remote as unknown as GistConflict['remoteVersion'],
      detectedAt: '2026-01-01T12:00:00Z',
      conflictingFields: ['description'],
    };

    it('local-wins keeps local description and sets pending', () => {
      const result = resolveConflict(conflict, 'local-wins');
      expect(result.description).toBe('Local');
      expect(result.syncStatus).toBe('pending');
    });

    it('remote-wins takes remote description and preserves starred', () => {
      const result = resolveConflict(conflict, 'remote-wins');
      expect(result.description).toBe('Remote');
      expect(result.syncStatus).toBe('synced');
      expect(result.starred).toBe(true);
    });

    it('manual sets conflict status', () => {
      const result = resolveConflict(conflict, 'manual');
      expect(result.syncStatus).toBe('conflict');
    });

    it('throws for unknown strategy', () => {
      expect(() => resolveConflict(conflict, 'unknown' as never)).toThrow('Unknown resolution strategy');
    });
  });
});
