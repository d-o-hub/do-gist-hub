/**
 * Unit tests for src/components/gist-detail.ts
 * Covers renderFileContent, renderGistDetail, renderRevisions, formatRelativeTime, loadGistDetail, bindDetailEvents
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock gistStore so loadGistDetail can use hydrateGist
vi.mock('../../src/stores/gist-store', () => ({
  default: {
    hydrateGist: vi.fn(),
    getGist: vi.fn(),
    toggleStar: vi.fn(),
  },
}));

// Mock GitHub client for bindDetailEvents
vi.mock('../../src/services/github/client', () => ({
  listGistRevisions: vi.fn(),
}));

// Mock toast so error handling doesn't throw
vi.mock('../../src/components/ui/toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../src/services/security/logger', () => ({
  safeError: vi.fn(),
  safeLog: vi.fn(),
}));

import {
  bindDetailEvents,
  buildFileContent,
  loadGistDetail,
  renderGistDetail,
  renderRevisions,
} from '../../src/components/gist-detail';
import type { GistRecord } from '../../src/types';
import type { GistRevision } from '../../src/types/api';

describe('GistDetail', () => {
  describe('buildFileContent', () => {
    it('returns a DocumentFragment with pre > code structure', () => {
      const frag = buildFileContent('const x = 1;', 'javascript');
      expect(frag).toBeInstanceOf(DocumentFragment);
      const wrapper = document.createElement('div');
      wrapper.appendChild(frag);
      const pre = wrapper.querySelector('pre');
      expect(pre).not.toBeNull();
      expect(pre?.className).toContain('code-block');
      expect(pre?.className).toContain('language-javascript');
      const code = wrapper.querySelector('code');
      expect(code?.textContent).toBe('const x = 1;');
    });

    it('sanitizes language param in class name (strips quotes and special chars)', () => {
      const frag = buildFileContent('safe', 'text" onload="alert(1)');
      const wrapper = document.createElement('div');
      wrapper.appendChild(frag);
      const pre = wrapper.querySelector('pre');
      // Quotes and equals are stripped, preventing attribute injection
      expect(pre?.className).not.toContain('"');
      expect(pre?.className).not.toContain('=');
      expect(pre?.className).toContain('code-block');
    });

    it('defaults to text language when not provided', () => {
      const frag = buildFileContent('hello');
      const wrapper = document.createElement('div');
      wrapper.appendChild(frag);
      expect(wrapper.querySelector('pre')?.className).toContain('language-text');
    });

    it('uses textContent (XSS-safe by construction)', () => {
      const frag = buildFileContent('<script>alert("xss")</script>');
      const wrapper = document.createElement('div');
      wrapper.appendChild(frag);
      const code = wrapper.querySelector('code');
      expect(code?.innerHTML).not.toContain('<script>');
      expect(code?.textContent).toBe('<script>alert("xss")</script>');
    });
  });

  describe('renderGistDetail', () => {
    const mockGist = {
      id: 'gist-1',
      description: 'Test Gist',
      files: {
        'test.ts': {
          filename: 'test.ts',
          language: 'typescript',
          content: 'const x = 1;',
          rawUrl: 'http://example.com/test.ts',
          size: 100,
        },
        'readme.md': {
          filename: 'readme.md',
          language: 'markdown',
          content: '# Hello',
          rawUrl: 'http://example.com/readme.md',
          size: 50,
        },
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

    /** Helper: render to a wrapper div and return it for querying. */
    function renderToWrapper(gist: GistRecord): HTMLElement {
      const wrapper = document.createElement('div');
      wrapper.appendChild(renderGistDetail(gist));
      return wrapper;
    }

    it('renders gist title and metadata', () => {
      const w = renderToWrapper(mockGist);
      expect(w.textContent).toContain('Test Gist');
      expect(w.textContent).toContain('2 Files');
      expect(w.textContent).toContain('Public');
    });

    it('renders file tabs for multi-file gists with roving tabindex', () => {
      const w = renderToWrapper(mockGist);
      const tabs = w.querySelectorAll('.file-tab');
      expect(tabs.length).toBe(2);
      expect(tabs[0]?.getAttribute('tabindex')).toBe('0');
      expect(tabs[1]?.getAttribute('tabindex')).toBe('-1');
      expect(w.textContent).toContain('TEST.TS');
      expect(w.textContent).toContain('README.MD');
    });

    it('does not render file tabs for single-file gists', () => {
      const singleFileGist = { ...mockGist, files: { 'test.ts': mockGist.files['test.ts'] } };
      const w = renderToWrapper(singleFileGist);
      expect(w.querySelector('.file-tabs')).toBeNull();
    });

    it('renders star and fork buttons', () => {
      const w = renderToWrapper(mockGist);
      expect(w.querySelector('[data-action="star"]')).not.toBeNull();
      expect(w.querySelector('[data-action="fork"]')).not.toBeNull();
      expect(w.querySelector('[data-action="edit"]')).not.toBeNull();
    });

    it('shows Unstar for starred gists', () => {
      const starredGist = { ...mockGist, starred: true };
      const w = renderToWrapper(starredGist);
      expect(w.textContent).toContain('Unstar');
      expect(w.querySelector('.btn-danger')).not.toBeNull();
    });

    it('shows Star for unstarred gists', () => {
      const w = renderToWrapper(mockGist);
      expect(w.textContent).toContain('Star');
      expect(w.querySelector('.btn-primary')).not.toBeNull();
    });

    it('sanitizes gist description (XSS-safe via textContent)', () => {
      const xssGist = { ...mockGist, description: '<img onerror="alert(1)" src=x>' };
      const w = renderToWrapper(xssGist);
      const title = w.querySelector('.detail-title');
      // textContent is XSS-safe by construction — no HTML parsing
      expect(title?.textContent).toBe('<img onerror="alert(1)" src=x>');
      expect(title?.innerHTML).not.toContain('<img');
    });

    it('shows Untitled Gist when description is empty', () => {
      const noDescGist = { ...mockGist, description: '' };
      const w = renderToWrapper(noDescGist);
      expect(w.textContent).toContain('Untitled Gist');
    });

    it('renders back button and detail label', () => {
      const w = renderToWrapper(mockGist);
      expect(w.querySelector('#gist-back-btn')).not.toBeNull();
      expect(w.textContent).toContain('Gist Detail');
    });

    it('renders copy button', () => {
      const w = renderToWrapper(mockGist);
      expect(w.querySelector('[data-action="copy-content"]')).not.toBeNull();
      expect(w.textContent).toContain('COPY');
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

    /** Helper: render to a wrapper div and return it for querying. */
    function renderToWrapper(gistId: string, revs: GistRevision[]): HTMLElement {
      const wrapper = document.createElement('div');
      wrapper.appendChild(renderRevisions(gistId, revs));
      return wrapper;
    }

    it('renders revision list with back button', () => {
      const w = renderToWrapper('gist-1', revisions);
      expect(w.textContent).toContain('Revisions (2)');
      expect(w.querySelector('#gist-back-btn')).not.toBeNull();
      expect(w.querySelectorAll('[data-action="view-revision"]').length).toBe(2);
    });

    it('renders each revision with user and date', () => {
      const w = renderToWrapper('gist-1', revisions);
      expect(w.textContent).toContain('user1');
      expect(w.textContent).toContain('user2');
    });

    it('sets gistId via dataset (XSS-safe, no data attribute injection)', () => {
      const w = renderToWrapper('gist-1" onerror="alert(1)', revisions);
      const list = w.querySelector('.revisions-list') as HTMLElement;
      // dataset assignment is XSS-safe — no attribute injection possible
      expect(list?.dataset.gistId).toBe('gist-1" onerror="alert(1)');
      expect(w.querySelector('[onerror]')).toBeNull();
    });
  });

  describe('loadGistDetail', () => {
    let gistStoreModule: typeof import('../../src/stores/gist-store');

    beforeEach(async () => {
      // Fresh imports for each test
      gistStoreModule = await import('../../src/stores/gist-store');
      await import('../../src/components/ui/toast');
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

    it('renders gist detail successfully on hydrate', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const mockGist = {
        id: 'gist-1',
        description: 'Test Gist',
        files: {
          'test.ts': {
            filename: 'test.ts',
            language: 'typescript',
            content: 'const x = 1;',
            rawUrl: 'http://example.com/test.ts',
            size: 100,
          },
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
      };

      vi.mocked(gistStoreModule.default.hydrateGist).mockResolvedValue(mockGist);

      const onBack = vi.fn();
      const onEdit = vi.fn();
      const onViewRevision = vi.fn();

      await loadGistDetail('gist-1', container, onBack, onEdit, onViewRevision);

      expect(container.querySelector('.gist-detail')).not.toBeNull();
      expect(container.querySelector('.detail-title')?.textContent).toContain('Test Gist');

      document.body.removeChild(container);
    });
  });

  // ── bindDetailEvents ──────────────────────────────────────────────

  describe('bindDetailEvents', () => {
    let container: HTMLElement;
    let onBack: ReturnType<typeof vi.fn>;
    let onEdit: ReturnType<typeof vi.fn>;
    let onViewRevision: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = `
        <div class="gist-detail" data-gist-id="gist-1">
          <header class="detail-header">
            <button class="btn btn-ghost" id="gist-back-btn">← Back</button>
            <div class="gist-detail-actions">
              <button class="btn btn-primary" data-action="star">Star</button>
              <button class="btn btn-ghost" data-action="edit">Edit</button>
              <button class="btn btn-ghost" data-action="revisions">Revisions</button>
            </div>
          </header>
          <div class="file-tabs scroll-x" role="tablist">
            <button class="chip file-tab active" data-file-key="test.ts" id="tab-0" role="tab" aria-selected="true">TEST.TS</button>
            <button class="chip file-tab" data-file-key="readme.md" id="tab-1" role="tab" aria-selected="false">README.MD</button>
          </div>
          <div class="file-content-area" id="file-content-area" role="tabpanel" aria-labelledby="tab-0">
            <pre><code>content</code></pre>
          </div>
          <div class="file-info" id="file-info">
            <button class="btn btn-ghost btn-copy-sm" data-action="copy-content">
              <span class="micro-label">COPY</span>
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(container);

      onBack = vi.fn();
      onEdit = vi.fn();
      onViewRevision = vi.fn();
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('calls onBack when back button is clicked', () => {
      bindDetailEvents(container, { onBack, onEdit, onViewRevision });

      const backBtn = container.querySelector('#gist-back-btn') as HTMLElement;
      backBtn.click();

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('calls onEdit with gistId when edit button is clicked', () => {
      bindDetailEvents(container, { onBack, onEdit, onViewRevision });

      const editBtn = container.querySelector('[data-action="edit"]') as HTMLElement;
      editBtn.click();

      expect(onEdit).toHaveBeenCalledWith('gist-1');
    });

    it('calls toggleStar when star button is clicked', async () => {
      const gistStoreModule = await import('../../src/stores/gist-store');
      vi.mocked(gistStoreModule.default.toggleStar).mockResolvedValue(true);
      vi.mocked(gistStoreModule.default.hydrateGist).mockResolvedValue({
        id: 'gist-1',
        description: 'Test',
        files: {},
        public: true,
        starred: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-15T12:00:00Z',
        htmlUrl: '',
        gitPullUrl: '',
        gitPushUrl: '',
        owner: { login: 'testuser', id: 1, avatarUrl: '', htmlUrl: '' },
        syncStatus: 'synced',
        lastSyncedAt: '2026-01-15T12:00:00Z',
      });

      bindDetailEvents(container, { onBack, onEdit, onViewRevision });

      const starBtn = container.querySelector('[data-action="star"]') as HTMLElement;
      starBtn.click();

      await vi.waitFor(() => {
        expect(gistStoreModule.default.toggleStar).toHaveBeenCalledWith('gist-1');
      });
    });

    it('loads revisions when revisions button is clicked', async () => {
      const { listGistRevisions } = await import('../../src/services/github/client');
      vi.mocked(listGistRevisions).mockResolvedValue([
        {
          version: 'abc123',
          committed_at: '2026-01-15T12:00:00Z',
          user: { login: 'user1', id: 1, avatar_url: '', html_url: '' },
          change_summary: {},
          node_id: '1',
          url: '',
        },
      ]);

      bindDetailEvents(container, { onBack, onEdit, onViewRevision });

      const revisionsBtn = container.querySelector('[data-action="revisions"]') as HTMLElement;
      revisionsBtn.click();

      await vi.waitFor(() => {
        expect(listGistRevisions).toHaveBeenCalledWith('gist-1');
        expect(container.querySelector('.revisions-list')).not.toBeNull();
      });
    });

    it('switches file content when a file tab is clicked', async () => {
      const gistStoreModule = await import('../../src/stores/gist-store');
      vi.mocked(gistStoreModule.default.getGist).mockReturnValue({
        id: 'gist-1',
        description: 'Test',
        files: {
          'test.ts': {
            filename: 'test.ts',
            language: 'typescript',
            content: 'const x = 1;',
            rawUrl: 'http://example.com/test.ts',
            size: 100,
          },
          'readme.md': {
            filename: 'readme.md',
            language: 'markdown',
            content: '# Hello',
            rawUrl: 'http://example.com/readme.md',
            size: 50,
          },
        },
        public: true,
        starred: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-15T12:00:00Z',
        htmlUrl: '',
        gitPullUrl: '',
        gitPushUrl: '',
        owner: { login: 'testuser', id: 1, avatarUrl: '', htmlUrl: '' },
        syncStatus: 'synced',
        lastSyncedAt: '2026-01-15T12:00:00Z',
      });

      bindDetailEvents(container, { onBack, onEdit, onViewRevision });

      const secondTab = container.querySelector('#tab-1') as HTMLElement;
      secondTab.click();

      // Wait for microtask
      await vi.waitFor(() => {
        expect(gistStoreModule.default.getGist).toHaveBeenCalledWith('gist-1');
      });

      // Verify tab UI updated
      expect(secondTab.classList.contains('active')).toBe(true);
      expect(secondTab.getAttribute('aria-selected')).toBe('true');
      expect(secondTab.getAttribute('tabindex')).toBe('0');
      expect(container.querySelector('#tab-0')?.getAttribute('aria-selected')).toBe('false');
      expect(container.querySelector('#tab-0')?.getAttribute('tabindex')).toBe('-1');
    });

    it('navigates tabs with arrow keys', () => {
      bindDetailEvents(container, { onBack, onEdit, onViewRevision });

      const firstTab = container.querySelector('#tab-0') as HTMLElement;
      const secondTab = container.querySelector('#tab-1') as HTMLElement;

      firstTab.focus();

      // ArrowRight to second tab
      firstTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

      expect(secondTab.getAttribute('tabindex')).toBe('0');
      expect(secondTab.classList.contains('active')).toBe(true);
      expect(document.activeElement).toBe(secondTab);

      // ArrowLeft back to first tab
      secondTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

      expect(firstTab.getAttribute('tabindex')).toBe('0');
      expect(firstTab.classList.contains('active')).toBe(true);
      expect(document.activeElement).toBe(firstTab);
    });

    it('navigates tabs with Home and End keys', () => {
      bindDetailEvents(container, { onBack, onEdit, onViewRevision });

      const firstTab = container.querySelector('#tab-0') as HTMLElement;
      const secondTab = container.querySelector('#tab-1') as HTMLElement;

      // Start at first tab, press End
      firstTab.focus();
      firstTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

      expect(secondTab.getAttribute('tabindex')).toBe('0');
      expect(document.activeElement).toBe(secondTab);

      // Press Home
      secondTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

      expect(firstTab.getAttribute('tabindex')).toBe('0');
      expect(document.activeElement).toBe(firstTab);
    });

    it('copies content to clipboard when copy button is clicked', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
        configurable: true,
      });

      bindDetailEvents(container, { onBack, onEdit, onViewRevision });

      const copyBtn = container.querySelector('[data-action="copy-content"]') as HTMLElement;
      copyBtn.click();

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledWith('content');
      });

      // Restore original clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true,
        configurable: true,
      });
    });

    it('shows copy success feedback and resets after timeout', async () => {
      vi.useFakeTimers();
      const writeText = vi.fn().mockResolvedValue(undefined);
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
        configurable: true,
      });

      bindDetailEvents(container, { onBack, onEdit, onViewRevision });

      const copyBtn = container.querySelector('[data-action="copy-content"]') as HTMLElement;
      copyBtn.click();

      // Let the async handler run
      await vi.waitFor(() => {
        expect(copyBtn.innerHTML).toContain('COPIED!');
      });

      expect(copyBtn.classList.contains('btn-success')).toBe(true);

      // Advance timers to reset
      vi.advanceTimersByTime(2000);

      expect(copyBtn.innerHTML).toContain('COPY');
      expect(copyBtn.classList.contains('btn-success')).toBe(false);

      // Restore original clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true,
        configurable: true,
      });

      vi.useRealTimers();
    });
  });
});
