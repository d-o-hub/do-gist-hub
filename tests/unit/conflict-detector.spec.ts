import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { detectConflict, resolveConflict } from '../../src/services/sync/conflict-detector.ts';
import type { GistRecord } from '../../src/services/db';
import type { GitHubGist } from '../../src/types/api';
import type { GistConflict } from '../../src/services/sync/conflict-detector';

describe('Conflict Detection Logic', () => {
  test('should detect no conflict for identical gists', () => {
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

    assert.equal(detectConflict(local as GistRecord, remote as GitHubGist), null);
  });

  test('should detect conflict when description changes', () => {
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
    assert.ok(result);
    assert.deepEqual(result.conflictingFields, ['description']);
  });

  test('should detect conflict when public status changes', () => {
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
    assert.ok(result);
    assert.deepEqual(result.conflictingFields, ['public']);
  });

  test('should detect conflict when content (size) changes and remote is newer', () => {
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
    assert.ok(result);
    assert.deepEqual(result.conflictingFields, ['content']);
  });

  test('should NOT detect conflict when remote is newer but content is identical', () => {
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

    assert.equal(detectConflict(local as GistRecord, remote as GitHubGist), null);
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

    test('local-wins: should keep local description and set pending', () => {
      const result = resolveConflict(conflict as GistConflict, 'local-wins');
      assert.equal(result.description, 'Local');
      assert.equal(result.syncStatus, 'pending');
    });

    test('remote-wins: should take remote description and preserve starred', () => {
      const result = resolveConflict(conflict as GistConflict, 'remote-wins');
      assert.equal(result.description, 'Remote');
      assert.equal(result.syncStatus, 'synced');
      assert.equal(result.starred, true);
    });

    test('manual: should set conflict status', () => {
      const result = resolveConflict(conflict as GistConflict, 'manual');
      assert.equal(result.syncStatus, 'conflict');
    });
  });
});
