/**
 * Unit tests for src/components/gist-detail.ts
 * Covers renderFileContent, renderGistDetail, renderRevisions, formatRelativeTime, loadGistDetail, bindDetailEvents
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock gistStore
vi.mock('../../src/stores/gist-store', () => ({
  default: {
    hydrateGist: vi.fn(),
    getGist: vi.fn(),
    toggleStar: vi.fn(),
    deleteGist: vi.fn(),
    updateGist: vi.fn(),
  },
}));

// Mock GitHub client
vi.mock('../../src/services/github/client', () => ({
  listGistRevisions: vi.fn(),
}));

// Mock toast
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
  renderFileContent,
  renderGistDetail,
  renderRevisions,
  loadGistDetail,
  bindDetailEvents,
} from '../../src/components/gist-detail';

describe('GistDetail', () => {
  describe('renderFileContent', () => {
    it('renders code in a pre tag', () => {
      const html = renderFileContent('const x = 1;', 'javascript');
      expect(html).toContain('<pre');
      expect(html).toContain('<code>');
      expect(html).toContain('const x = 1;');
    });
  });

  describe('renderGistDetail', () => {
    const mockGist = {
      id: 'gist-1',
      description: 'Test Gist',
      files: {
        'test.ts': { filename: 'test.ts', language: 'typescript', content: 'const x = 1;', rawUrl: 'http://example.com/test.ts' },
        'readme.md': { filename: 'readme.md', language: 'markdown', content: '# Hello', rawUrl: 'http://example.com/readme.md' },
      },
      public: true,
      starred: false,
      updatedAt: '2026-01-15T12:00:00Z',
      htmlUrl: 'http://example.com/gist-1',
    } as any;

    it('renders file tabs with proper casing and roving tabindex', () => {
      const html = renderGistDetail(mockGist);
      expect(html).toContain('file-tabs');
      expect(html).toContain('test.ts');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('tabindex="-1"');
      expect(html).toContain('id="file-content-area-gist-1"');
    });

    it('renders copy button with proper casing', () => {
      const html = renderGistDetail(mockGist);
      expect(html).toContain('Copy');
      expect(html).not.toContain('COPY');
    });
  });

  describe('bindDetailEvents', () => {
    let container: HTMLElement;
    let onBack: any, onEdit: any, onViewRevision: any;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = `
        <div class="gist-detail" data-gist-id="gist-1">
          <header class="detail-header">
            <button id="gist-back-btn">Back</button>
            <button data-action="star">Star</button>
            <button data-action="edit">Edit</button>
            <button data-action="revisions">Revisions</button>
            <button data-action="copy-url">Copy URL</button>
            <button data-action="share">Share</button>
          </header>
          <div class="file-tabs" role="tablist">
            <button class="chip file-tab active" data-file-key="test.ts" id="tab-gist-1-0" role="tab" aria-selected="true" tabindex="0">test.ts</button>
            <button class="chip file-tab" data-file-key="readme.md" id="tab-gist-1-1" role="tab" aria-selected="false" tabindex="-1">readme.md</button>
          </div>
          <div class="file-content-area" id="file-content-area-gist-1">
            <pre><code>content</code></pre>
          </div>
          <div class="file-info" id="file-info">
            <button data-action="copy-content">Copy</button>
          </div>
        </div>
      `;
      document.body.appendChild(container);
      onBack = vi.fn();
      onEdit = vi.fn();
      onViewRevision = vi.fn();
    });

    afterEach(() => {
      document.body.innerHTML = '';
      vi.clearAllMocks();
    });

    it('calls onBack', () => {
      bindDetailEvents(container, { onBack, onEdit, onViewRevision });
      container.querySelector('#gist-back-btn')?.dispatchEvent(new MouseEvent('click'));
      expect(onBack).toHaveBeenCalled();
    });

    it('calls onEdit', () => {
      bindDetailEvents(container, { onBack, onEdit, onViewRevision });
      container.querySelector('[data-action="edit"]')?.dispatchEvent(new MouseEvent('click'));
      expect(onEdit).toHaveBeenCalledWith('gist-1');
    });

    it('switches tabs and updates tabindex on click', async () => {
      const gistStoreModule = await import('../../src/stores/gist-store');
      vi.mocked(gistStoreModule.default.getGist).mockReturnValue({
        id: 'gist-1',
        files: {
          'test.ts': { content: 'c1', language: 'ts' },
          'readme.md': { content: 'c2', language: 'md' }
        }
      } as any);

      bindDetailEvents(container, { onBack, onEdit, onViewRevision });

      const firstTab = container.querySelector('#tab-gist-1-0') as HTMLElement;
      const secondTab = container.querySelector('#tab-gist-1-1') as HTMLElement;

      secondTab.click();

      await vi.waitFor(() => {
        expect(secondTab.classList.contains('active')).toBe(true);
        expect(secondTab.getAttribute('tabindex')).toBe('0');
        expect(firstTab.getAttribute('tabindex')).toBe('-1');
      });
    });

    it('navigates tabs with ArrowRight and ArrowLeft', () => {
      bindDetailEvents(container, { onBack, onEdit, onViewRevision });

      const firstTab = container.querySelector('#tab-gist-1-0') as HTMLElement;
      const secondTab = container.querySelector('#tab-gist-1-1') as HTMLElement;

      firstTab.focus();

      // ArrowRight
      container.querySelector('.file-tabs')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(document.activeElement).toBe(secondTab);
      expect(secondTab.getAttribute('tabindex')).toBe('0');
      expect(firstTab.getAttribute('tabindex')).toBe('-1');

      // ArrowLeft
      container.querySelector('.file-tabs')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      expect(document.activeElement).toBe(firstTab);
    });

    it('handles Home and End keys for tab navigation', () => {
      bindDetailEvents(container, { onBack, onEdit, onViewRevision });

      const firstTab = container.querySelector('#tab-gist-1-0') as HTMLElement;
      const secondTab = container.querySelector('#tab-gist-1-1') as HTMLElement;

      firstTab.focus();

      // End
      container.querySelector('.file-tabs')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      expect(document.activeElement).toBe(secondTab);

      // Home
      container.querySelector('.file-tabs')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      expect(document.activeElement).toBe(firstTab);
    });

    it('copies content to clipboard', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });

      bindDetailEvents(container, { onBack, onEdit, onViewRevision });

      const copyBtn = container.querySelector('[data-action="copy-content"]') as HTMLElement;
      copyBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledWith('content');
      });
    });

    it('handles star toggle', async () => {
        const gistStoreModule = await import('../../src/stores/gist-store');
        vi.mocked(gistStoreModule.default.toggleStar).mockResolvedValue(true);
        bindDetailEvents(container, { onBack, onEdit, onViewRevision });
        container.querySelector('[data-action="star"]')?.dispatchEvent(new MouseEvent('click'));
        await vi.waitFor(() => {
            expect(gistStoreModule.default.toggleStar).toHaveBeenCalledWith('gist-1');
        });
    });

    it('handles revisions loading', async () => {
        const { listGistRevisions } = await import('../../src/services/github/client');
        vi.mocked(listGistRevisions).mockResolvedValue([]);
        bindDetailEvents(container, { onBack, onEdit, onViewRevision });
        container.querySelector('[data-action="revisions"]')?.dispatchEvent(new MouseEvent('click'));
        await vi.waitFor(() => {
            expect(listGistRevisions).toHaveBeenCalledWith('gist-1');
        });
    });

    it('handles copy url', async () => {
        const gistStoreModule = await import('../../src/stores/gist-store');
        vi.mocked(gistStoreModule.default.getGist).mockReturnValue({ htmlUrl: 'http://url' } as any);
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

        bindDetailEvents(container, { onBack, onEdit, onViewRevision });
        container.querySelector('[data-action="copy-url"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        await vi.waitFor(() => {
            expect(writeText).toHaveBeenCalledWith('http://url');
        });
    });

    it('handles share', async () => {
        const gistStoreModule = await import('../../src/stores/gist-store');
        vi.mocked(gistStoreModule.default.getGist).mockReturnValue({ htmlUrl: 'http://url', files: {} } as any);
        const share = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'share', { value: share, configurable: true });

        bindDetailEvents(container, { onBack, onEdit, onViewRevision });
        container.querySelector('[data-action="share"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        await vi.waitFor(() => {
            expect(share).toHaveBeenCalled();
        });
    });
  });

  describe('loadGistDetail', () => {
      it('loads and renders gist', async () => {
        const gistStoreModule = await import('../../src/stores/gist-store');
        vi.mocked(gistStoreModule.default.hydrateGist).mockResolvedValue({ id: 'g1', files: {} } as any);
        const div = document.createElement('div');
        await loadGistDetail('g1', div, vi.fn(), vi.fn(), vi.fn());
        expect(div.innerHTML).toContain('gist-detail');
      });
  });

  describe('renderRevisions', () => {
      it('renders revisions list', () => {
          const html = renderRevisions('g1', [{ version: 'v1', committed_at: '2026-01-01', user: { login: 'u1' } }] as any);
          expect(html).toContain('revisions-list');
          expect(html).toContain('v1');
      });
  });
});
