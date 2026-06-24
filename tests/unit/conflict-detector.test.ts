import { describe, expect, it } from 'vitest';
import type { GistRecord } from '../../src/services/db';
import type { GistConflict } from '../../src/services/sync/conflict-detector';
import { detectConflict, resolveConflict } from '../../src/services/sync/conflict-detector.ts';
import type { GitHubGist } from '../../src/types/api';

describe('Conflict Detection Logic', () => {
  it('should detect no conflict for identical gists', () => {
    const local: Partial<GistRecord> = {
      id: 'gist123',
      description: 'Original description',
      public: true,
      updatedAt: '2026-01-01T10:00:00Z',
      files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      syncStatus: 'synced',
    };
    const remote: Partial<GitHubGist> = {
      id: 'gist123',
      description: 'Original description',
      public: true,
      updated_at: '2026-01-01T10:00:00Z',
      files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
    };

    expect(detectConflict(local as GistRecord, remote as GitHubGist)).toBeNull();
  });

  it('should detect conflict when description changes', () => {
    const local: Partial<GistRecord> = {
      id: 'gist123',
      description: 'Local description',
      public: true,
      updatedAt: '2026-01-01T10:00:00Z',
      files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      syncStatus: 'synced',
    };
    const remote: Partial<GitHubGist> = {
      id: 'gist123',
      description: 'Remote description',
      public: true,
      updated_at: '2026-01-01T10:00:00Z',
      files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
    };

    const result = detectConflict(local as GistRecord, remote as GitHubGist);
    expect(result).toBeTruthy();
    expect(result?.conflictingFields).toEqual(['description']);
  });

  it('should detect conflict when public status changes', () => {
    const local: Partial<GistRecord> = {
      id: 'gist123',
      description: 'Desc',
      public: true,
      updatedAt: '2026-01-01T10:00:00Z',
      files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      syncStatus: 'synced',
    };
    const remote: Partial<GitHubGist> = {
      id: 'gist123',
      description: 'Desc',
      public: false,
      updated_at: '2026-01-01T10:00:00Z',
      files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
    };

    const result = detectConflict(local as GistRecord, remote as GitHubGist);
    expect(result).toBeTruthy();
    expect(result?.conflictingFields).toEqual(['public']);
  });

  it('should detect conflict when content (size) changes and remote is newer', () => {
    const local: Partial<GistRecord> = {
      id: 'gist123',
      description: 'Desc',
      public: true,
      updatedAt: '2026-01-01T10:00:00Z',
      files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      syncStatus: 'synced',
    };
    const remote: Partial<GitHubGist> = {
      id: 'gist123',
      description: 'Desc',
      public: true,
      updated_at: '2026-01-01T11:00:00Z',
      files: { 'file1.txt': { filename: 'file1.txt', size: 200 } },
    };

    const result = detectConflict(local as GistRecord, remote as GitHubGist);
    expect(result).toBeTruthy();
    expect(result?.conflictingFields).toEqual(['content']);
  });

  it('should NOT detect conflict when remote is newer but content is identical', () => {
    const local: Partial<GistRecord> = {
      id: 'gist123',
      description: 'Desc',
      public: true,
      updatedAt: '2026-01-01T10:00:00Z',
      files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
      syncStatus: 'synced',
    };
    const remote: Partial<GitHubGist> = {
      id: 'gist123',
      description: 'Desc',
      public: true,
      updated_at: '2026-01-01T11:00:00Z',
      files: { 'file1.txt': { filename: 'file1.txt', size: 100 } },
    };

    expect(detectConflict(local as GistRecord, remote as GitHubGist)).toBeNull();
  });

  describe('resolveConflict', () => {
    const local: Partial<GistRecord> = {
      id: '123',
      description: 'Local',
      starred: true,
      syncStatus: 'synced',
    };
    const remote: Partial<GitHubGist> = {
      id: '123',
      description: 'Remote',
      files: { 'f.txt': { filename: 'f.txt', type: 'text/plain', size: 10 } },
      html_url: 'url',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T12:00:00Z',
      public: true,
    };
    const conflict: Partial<GistConflict> = {
      localVersion: local as GistRecord,
      remoteVersion: remote as GitHubGist,
    };

    it('local-wins: should keep local description and set pending', () => {
      const result = resolveConflict(conflict as GistConflict, 'local-wins');
      expect(result.description).toBe('Local');
      expect(result.syncStatus).toBe('pending');
    });

    it('remote-wins: should take remote description and preserve starred', () => {
      const result = resolveConflict(conflict as GistConflict, 'remote-wins');
      expect(result.description).toBe('Remote');
      expect(result.syncStatus).toBe('synced');
      expect(result.starred).toBe(true);
    });

    it('manual: should set conflict status', () => {
      const result = resolveConflict(conflict as GistConflict, 'manual');
      expect(result.syncStatus).toBe('conflict');
    });

    it('handles unknown strategy explicitly', () => {
      expect(() =>
        resolveConflict(conflict as GistConflict, 'unknown-strategy' as never)
      ).toThrow();
    });
  });
});
