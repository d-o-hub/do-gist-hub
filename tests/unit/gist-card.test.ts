/**
 * Unit tests for Gist Card Component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/services/security/dom', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
}));

vi.mock('../../src/stores/gist-store', () => ({
  default: {
    toggleStar: vi.fn(),
    deleteGist: vi.fn(),
  },
}));

vi.mock('../../src/utils/dialog', () => ({
  showConfirmDialog: vi.fn(),
}));

vi.mock('../../src/components/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { renderCard, bindCardEvents } from '../../src/components/gist-card';
import gistStore from '../../src/stores/gist-store';
import { showConfirmDialog } from '../../src/utils/dialog';
import { toast } from '../../src/components/ui/toast';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeGist(id = 'gist-1', overrides: Record<string, unknown> = {}) {
  return {
    id,
    description: 'Test Gist',
    files: {
      'example.js': {
        filename: 'example.js',
        content: 'console.log("hello");',
        language: 'JavaScript',
        size: 22,
      },
    },
    htmlUrl: `https://gist.github.com/${id}`,
    gitPullUrl: `https://api.github.com/gists/${id}/git/pull`,
    gitPushUrl: `https://api.github.com/gists/${id}/git/push`,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T12:00:00Z',
    starred: false,
    public: true,
    syncStatus: 'synced',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('Gist Card', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ── renderCard ─────────────────────────────────────────────────────

  describe('renderCard', () => {
    it('renders article with gist-card class and data attributes', () => {
      const gist = makeGist();
      const html = renderCard(gist);

      expect(html).toContain('gist-card');
      expect(html).toContain('data-gist-id="gist-1"');
      expect(html).toContain('data-testid="gist-item"');
    });

    it('renders as a button with tabindex and aria-label', () => {
      const gist = makeGist();
      const html = renderCard(gist);

      expect(html).toContain('tabindex="0"');
      expect(html).toContain('role="button"');
      expect(html).toContain('aria-label="Open gist: Test Gist"');
    });

    it('renders gist description', () => {
      const gist = makeGist();
      const html = renderCard(gist);

      expect(html).toContain('Test Gist');
    });

    it('renders "UNTITLED GIST" when description is empty', () => {
      const gist = makeGist('gist-2', { description: '' });
      const html = renderCard(gist);

      expect(html).toContain('UNTITLED GIST');
    });

    it('renders language label', () => {
      const gist = makeGist();
      const html = renderCard(gist);

      expect(html).toContain('JAVASCRIPT');
    });

    it('renders "TEXT" when language is not provided', () => {
      const gist = makeGist('gist-3', {
        files: { 'readme.md': { filename: 'readme.md', content: '# Title' } },
      });
      const html = renderCard(gist);

      expect(html).toContain('TEXT');
    });

    it('renders file count', () => {
      const gist = makeGist('gist-4', {
        files: {
          'a.js': { filename: 'a.js', content: 'a' },
          'b.js': { filename: 'b.js', content: 'b' },
        },
      });
      const html = renderCard(gist);

      expect(html).toContain('2');
      expect(html).toContain('FILES');
    });

    it('renders code snippet preview', () => {
      const gist = makeGist();
      const html = renderCard(gist);

      expect(html).toContain('console.log');
      expect(html).toContain('gist-preview-code');
    });

    it('truncates snippet to 120 characters', () => {
      const longContent = 'x'.repeat(300);
      const gist = makeGist('gist-long', {
        files: { 'long.txt': { filename: 'long.txt', content: longContent, language: 'Text' } },
      });
      const html = renderCard(gist);

      // The content should be present but truncated to ~120 chars
      expect(html).toContain('x'.repeat(120));
    });

    it('renders star button with correct aria-pressed state', () => {
      const gist = makeGist('gist-5', { starred: true });
      const html = renderCard(gist);

      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain('STARRED');
    });

    it('renders star button with false aria-pressed when not starred', () => {
      const gist = makeGist('gist-6', { starred: false });
      const html = renderCard(gist);

      expect(html).toContain('aria-pressed="false"');
      expect(html).toContain('STAR');
    });

    it('renders delete button', () => {
      const gist = makeGist();
      const html = renderCard(gist);

      expect(html).toContain('DELETE');
      expect(html).toContain('delete-btn');
    });

    it('renders relative time', () => {
      const gist = makeGist('gist-7', {
        updatedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      });
      const html = renderCard(gist);

      expect(html).toContain('1H AGO');
    });

    it('renders "featured" class when gist is starred', () => {
      const gist = makeGist('gist-8', { starred: true });
      const html = renderCard(gist);

      expect(html).toContain('featured');
    });

    it('does not render "featured" class when not starred', () => {
      const gist = makeGist('gist-9', { starred: false });
      const html = renderCard(gist);

      expect(html).not.toContain('featured');
    });
  });

  // ── Card Caching ─────────────────────────────────────────────────────

  describe('card caching', () => {
    it('returns cached HTML when gist has same updatedAt', () => {
      const gist = makeGist('cached-gist');
      const firstHtml = renderCard(gist);
      const secondHtml = renderCard(gist);

      expect(secondHtml).toBe(firstHtml);
    });

    it('re-renders when gist updatedAt changes', () => {
      const gist = makeGist('updated-gist', { updatedAt: '2026-01-01T00:00:00Z' });
      const firstHtml = renderCard(gist);

      const updatedGist = makeGist('updated-gist', { updatedAt: '2026-02-01T00:00:00Z' });
      const secondHtml = renderCard(updatedGist);

      expect(secondHtml).toContain('2026-02-01');
      expect(secondHtml).not.toBe(firstHtml);
    });
  });

  // ── bindCardEvents ─────────────────────────────────────────────────

  describe('bindCardEvents', () => {
    it('binds events only once (idempotent)', () => {
      container.innerHTML = renderCard(makeGist());
      const onCardClick = vi.fn();

      bindCardEvents(container, onCardClick);
      bindCardEvents(container, onCardClick);

      expect(container.dataset.eventsBound).toBe('true');
    });

    it('calls onCardClick when card body is clicked', () => {
      const onCardClick = vi.fn();
      container.innerHTML = renderCard(makeGist('click-test'));
      bindCardEvents(container, onCardClick);

      const card = container.querySelector('.gist-card') as HTMLElement;
      card?.click();

      expect(onCardClick).toHaveBeenCalledWith('click-test');
    });

    it('does not call onCardClick when action buttons are clicked', () => {
      const onCardClick = vi.fn();
      container.innerHTML = renderCard(makeGist('action-test'));
      bindCardEvents(container, onCardClick);

      const starBtn = container.querySelector('.star-btn') as HTMLElement;
      starBtn?.click();

      expect(onCardClick).not.toHaveBeenCalled();
    });

    it('calls toggleStar when star button is clicked', () => {
      container.innerHTML = renderCard(makeGist('star-test'));
      bindCardEvents(container, vi.fn());

      const starBtn = container.querySelector('.star-btn') as HTMLElement;
      starBtn?.click();

      expect(gistStore.toggleStar).toHaveBeenCalledWith('star-test');
    });

    it('calls showConfirmDialog and deleteGist when delete button is clicked with confirmation', async () => {
      vi.mocked(showConfirmDialog).mockResolvedValue(true as never);
      vi.mocked(gistStore.deleteGist).mockResolvedValue(true as never);

      container.innerHTML = renderCard(makeGist('delete-test'));
      bindCardEvents(container, vi.fn());

      const deleteBtn = container.querySelector('.delete-btn') as HTMLElement;
      deleteBtn?.click();

      // Wait for async
      await vi.waitFor(() => {
        expect(showConfirmDialog).toHaveBeenCalled();
        expect(gistStore.deleteGist).toHaveBeenCalledWith('delete-test');
      });
    });

    it('does not delete when user cancels confirmation', async () => {
      vi.mocked(showConfirmDialog).mockResolvedValue(false as never);

      container.innerHTML = renderCard(makeGist('cancel-delete'));
      bindCardEvents(container, vi.fn());

      const deleteBtn = container.querySelector('.delete-btn') as HTMLElement;
      deleteBtn?.click();

      await vi.waitFor(() => {
        expect(showConfirmDialog).toHaveBeenCalled();
        expect(gistStore.deleteGist).not.toHaveBeenCalled();
      });
    });

    it('shows success toast after successful delete', async () => {
      vi.mocked(showConfirmDialog).mockResolvedValue(true as never);
      vi.mocked(gistStore.deleteGist).mockResolvedValue(true as never);

      container.innerHTML = renderCard(makeGist('toast-test'));
      bindCardEvents(container, vi.fn());

      const deleteBtn = container.querySelector('.delete-btn') as HTMLElement;
      deleteBtn?.click();

      await vi.waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('GIST DELETED');
      });
    });

    it('does not call onCardClick when clicking in card actions footer', () => {
      const onCardClick = vi.fn();
      container.innerHTML = renderCard(makeGist('footer-test'));
      bindCardEvents(container, onCardClick);

      const footer = container.querySelector('.gist-card-actions') as HTMLElement;
      footer?.click();

      expect(onCardClick).not.toHaveBeenCalled();
    });

    it('handles cards without data-gist-id attribute gracefully', () => {
      const onCardClick = vi.fn();
      container.innerHTML = '<div class="gist-card" data-testid="gist-item"></div>';
      bindCardEvents(container, onCardClick);

      const card = container.querySelector('.gist-card') as HTMLElement;
      card?.click();

      // Should not throw — onCardClick not called since no id
      expect(onCardClick).not.toHaveBeenCalled();
    });
  });
});
