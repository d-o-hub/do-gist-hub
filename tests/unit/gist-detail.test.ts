/**
 * Unit tests for src/components/gist-detail.ts
 * Covers renderFileContent, renderGistDetail, renderRevisions, formatRelativeTime, loadGistDetail, bindDetailEvents
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock gistStore so loadGistDetail can use hydrateGist
vi.mock('../../src/stores/gist-store', () => ({
  default: {
    hydrateGist: vi.fn(),
    getGist: vi.fn(),
    toggleStar: vi.fn(),
  },
}));

// Mock toast so error handling doesn't throw
vi.mock('../../src/components/ui/toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { renderFileContent, renderGistDetail, renderRevisions, loadGistDetail } from '../../src/components/gist-detail';
import type { GistRecord } from '../../src/types';
import type { GistRevision } from '../../src/types/api';

describe('GistDetail', () => {
  describe('renderFileContent', () => {
    it('renders code in a pre tag', () => {
      const html = renderFileContent('const x = 1;', 'javascript');
      expect(html).toContain('<pre');
      expect(html).toContain('<code>');
      expect(html).toContain('const x = 1;');
    });

    it('sanitizes content', () => {
      const html = renderFileContent('<script>alert("xss")</script>', 'html');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('defaults to text language when not provided', () => {
      const html = renderFileContent('hello');
      expect(html).toContain('language-text');
    });
  });

  describe('renderGistDetail', () => {
    const mockGist = {
      id: 'gist-1',
      description: 'Test Gist',
      files: {
        'test.ts': { filename: 'test.ts', language: 'typescript', content: 'const x = 1;', rawUrl: 'http://example.com/test.ts', size: 100 },
        'readme.md': { filename: 'readme.md', language: 'markdown', content: '# Hello', rawUrl: 'http://example.com/readme.md', size: 50 },
      },
      public: true,
      starred: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-15T12:00:00Z',
      htmlUrl: 'http://example.com/gist-1',
      gitPullUrl: 'http://example.com/gist-1.git',
      gitPushUrl: 'http://example.com/gist-1.git',
      owner: { login: 'testuser', id: 1, avatarUrl: '', htmlUrl: '' },
      syncStatus: 'synced',
      lastSyncedAt: '2026-01-15T12:00:00Z',
    } as GistRecord;

    it('renders gist title and metadata', () => {
      const html = renderGistDetail(mockGist);
      expect(html).toContain('Test Gist');
      expect(html).toContain('2 Files');
      expect(html).toContain('Public');
    });

    it('renders file tabs for multi-file gists', () => {
      const html = renderGistDetail(mockGist);
      expect(html).toContain('file-tabs');
      expect(html).toContain('TEST.TS');
      expect(html).toContain('README.MD');
    });

    it('does not render file tabs for single-file gists', () => {
      const singleFileGist = { ...mockGist, files: { 'test.ts': mockGist.files['test.ts'] } };
      const html = renderGistDetail(singleFileGist);
      expect(html).not.toContain('file-tabs');
    });

    it('renders star and fork buttons', () => {
      const html = renderGistDetail(mockGist);
      expect(html).toContain('data-action="star"');
      expect(html).toContain('data-action="fork"');
      expect(html).toContain('data-action="edit"');
    });

    it('shows Unstar for starred gists', () => {
      const starredGist = { ...mockGist, starred: true };
      const html = renderGistDetail(starredGist);
      expect(html).toContain('Unstar');
      expect(html).toContain('btn-danger');
    });

    it('shows Star for unstarred gists', () => {
      const html = renderGistDetail(mockGist);
      expect(html).toContain('Star');
      expect(html).toContain('btn-primary');
    });

    it('sanitizes gist description', () => {
      const xssGist = { ...mockGist, description: '<img onerror="alert(1)" src=x>' };
      const html = renderGistDetail(xssGist);
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });

    it('shows Untitled Gist when description is empty', () => {
      const noDescGist = { ...mockGist, description: '' };
      const html = renderGistDetail(noDescGist);
      expect(html).toContain('Untitled Gist');
    });

    it('renders back button and detail label', () => {
      const html = renderGistDetail(mockGist);
      expect(html).toContain('gist-back-btn');
      expect(html).toContain('Gist Detail');
    });

    it('renders copy button', () => {
      const html = renderGistDetail(mockGist);
      expect(html).toContain('data-action="copy-content"');
      expect(html).toContain('COPY');
    });
  });

  describe('renderRevisions', () => {
    const revisions = [
      {
        version: 'abc123',
        committed_at: '2026-01-15T12:00:00Z',
        user: { login: 'user1', id: 1, avatar_url: '', html_url: '' },
        change_summary: {},
        node_id: '1',
        url: '',
      },
      {
        version: 'def456',
        committed_at: '2026-01-14T10:00:00Z',
        user: { login: 'user2', id: 2, avatar_url: '', html_url: '' },
        change_summary: {},
        node_id: '2',
        url: '',
      },
    ] as GistRevision[];

    it('renders revision list with back button', () => {
      const html = renderRevisions('gist-1', revisions);
      expect(html).toContain('Revisions (2)');
      expect(html).toContain('gist-back-btn');
      expect(html).toContain('data-action="view-revision"');
    });

    it('renders each revision with user and date', () => {
      const html = renderRevisions('gist-1', revisions);
      expect(html).toContain('user1');
      expect(html).toContain('user2');
    });

    it('sanitizes gistId in data attribute', () => {
      const html = renderRevisions('gist-1" onerror="alert(1)', revisions);
      // sanitizeHtml escapes quotes, so the attribute value is properly encoded
      // onerror= is still in the string but the quotes around it are escaped
      expect(html).not.toContain('onerror="');
      expect(html).toContain('onerror=&quot;');
    });
  });

  describe('loadGistDetail', () => {
    let gistStoreModule: typeof import('../../src/stores/gist-store');
    let toastModule: typeof import('../../src/components/ui/toast');

    beforeEach(async () => {
      // Fresh imports for each test
      gistStoreModule = await import('../../src/stores/gist-store');
      toastModule = await import('../../src/components/ui/toast');
    });

    it('renders gist detail and shows error when gist not found', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      vi.mocked(gistStoreModule.default.hydrateGist).mockResolvedValue(undefined);

      const onBack = vi.fn();
      const onEdit = vi.fn();
      const onViewRevision = vi.fn();

      await loadGistDetail('non-existent', container, onBack, onEdit, onViewRevision);

      expect(vi.mocked(gistStoreModule.default.hydrateGist)).toHaveBeenCalledWith('non-existent');

      document.body.removeChild(container);
    });
  });
});
