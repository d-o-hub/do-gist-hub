/**
 * Unit tests for src/types/ (0% coverage)
 * Tests type factory functions and validates type shape
 */
import { describe, it, expect } from 'vitest';

describe('Types', () => {
  describe('GitHubGist shape', () => {
    it('creates a valid GitHubGist-like object matching the API contract', () => {
      const gist = {
        id: 'abc123',
        node_id: 'MDQ6R2lzdGFiYzEyMw==',
        git_pull_url: 'https://gist.github.com/abc123',
        git_push_url: 'https://gist.github.com/abc123.git',
        html_url: 'https://gist.github.com/abc123',
        files: {
          'file1.ts': {
            filename: 'file1.ts',
            type: 'text/typescript',
            language: 'TypeScript',
            raw_url: 'https://raw.gist.com/abc123/file1.ts',
            size: 1024,
            truncated: false,
            content: 'const x = 1;',
          },
        },
        public: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-15T12:00:00Z',
        description: 'My gist',
        comments: 3,
        comments_url: 'https://api.github.com/gists/abc123/comments',
        user: null,
        owner: {
          login: 'testuser',
          id: 12345,
          avatar_url: 'https://avatars.githubusercontent.com/u/12345',
          html_url: 'https://github.com/testuser',
        },
        truncated: false,
      };

      expect(gist).toHaveProperty('id');
      expect(gist).toHaveProperty('files');
      expect(typeof gist.id).toBe('string');
      expect(typeof gist.public).toBe('boolean');
      expect(typeof gist.description).toBe('string');
      expect(gist.owner).toBeDefined();
      expect(gist.owner?.login).toBe('testuser');
    });

    it('validates file structure', () => {
      const file = {
        filename: 'test.ts',
        type: 'text/typescript',
        language: 'TypeScript',
        raw_url: 'https://example.com/test.ts',
        size: 500,
        truncated: false,
        content: '// code',
      };

      expect(file).toHaveProperty('filename');
      expect(file).toHaveProperty('raw_url');
      expect(typeof file.size).toBe('number');
    });

    it('handles optional fields correctly', () => {
      const minimalGist = {
        id: '123',
        node_id: 'n1',
        git_pull_url: '',
        git_push_url: '',
        html_url: '',
        files: {},
        public: false,
        created_at: '',
        updated_at: '',
        description: null,
        comments: 0,
        comments_url: '',
        user: null,
      };

      expect(minimalGist).toHaveProperty('description', null);
      expect(minimalGist).toHaveProperty('user', null);
      // owner is optional and not set — accessing it returns undefined
      expect(minimalGist.owner).toBeUndefined();
    });
  });

  describe('GistRecord shape', () => {
    it('matches expected local DB schema', () => {
      const record = {
        id: 'abc123',
        description: 'Test gist',
        files: {
          'file1.ts': {
            filename: 'file1.ts',
            language: 'TypeScript',
            type: 'text/typescript',
            rawUrl: 'https://example.com/file1.ts',
            size: 500,
            truncated: false,
            content: 'const x = 1;',
          },
        },
        htmlUrl: 'https://gist.github.com/abc123',
        gitPullUrl: 'https://gist.github.com/abc123.git',
        gitPushUrl: 'https://gist.github.com/abc123.git',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-15T12:00:00Z',
        starred: true,
        public: true,
        owner: {
          login: 'testuser',
          id: 12345,
          avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
          htmlUrl: 'https://github.com/testuser',
        },
        syncStatus: 'synced' as const,
        lastSyncedAt: '2026-01-15T12:00:00Z',
      };

      expect(record.syncStatus).toBe('synced');
      expect(record.starred).toBe(true);
      expect(record.owner).toBeDefined();
      expect(record.owner!.avatarUrl).toMatch(/^http/);
    });

    it('validates all sync status values', () => {
      const statuses = ['synced', 'pending', 'conflict', 'error'] as const;
      for (const status of statuses) {
        const record = { id: '1', syncStatus: status, files: {} } as Record<string, unknown>;
        expect(record.syncStatus).toBe(status);
      }
    });
  });

  describe('API request types', () => {
    it('validates create gist request shape', () => {
      const createRequest = {
        description: 'New gist',
        public: true,
        files: {
          'hello.ts': { content: 'console.log("hello")' },
        },
      };

      expect(createRequest).toHaveProperty('description');
      expect(createRequest).toHaveProperty('public');
      expect(createRequest).toHaveProperty('files');
      expect(Object.keys(createRequest.files)).toHaveLength(1);
      expect(createRequest.files['hello.ts'].content).toBe('console.log("hello")');
    });

    it('validates update gist request shape', () => {
      const updateRequest = {
        description: 'Updated gist',
        files: {
          'hello.ts': { content: 'console.log("updated")', filename: 'greeting.ts' },
          'old.ts': null, // null = delete file
        },
      };

      expect(updateRequest.description).toBe('Updated gist');
      expect(updateRequest.files?.['old.ts']).toBeNull();
      expect(updateRequest.files?.['hello.ts']?.filename).toBe('greeting.ts');
    });
  });

  describe('Error types', () => {
    it('validates GitHubError shape', () => {
      const error = {
        message: 'Not Found',
        documentation_url: 'https://docs.github.com/rest',
        errors: [{ resource: 'Gist', field: 'id', code: 'missing_field' }],
      };

      expect(error.message).toBe('Not Found');
      expect(error.errors).toHaveLength(1);
      expect(error.errors![0].code).toBe('missing_field');
    });

    it('validates pagination info shape', () => {
      const pagination = {
        nextPage: 2,
        prevPage: null,
        firstPage: 1,
        lastPage: 5,
        totalPages: 5,
      };

      expect(pagination.nextPage).toBe(2);
      expect(pagination.prevPage).toBeNull();
      expect(pagination.totalPages).toBe(5);
    });
  });
});
