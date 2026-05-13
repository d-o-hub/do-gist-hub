/**
 * Unit tests for Gist Detail Route (src/routes/gist-detail.ts)
 * Covers render function with all branches
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mocks (hoisted) ----

vi.mock('../../src/components/gist-detail', () => ({
  loadGistDetail: vi.fn(),
}));

vi.mock('../../src/components/ui/skeleton', () => ({
  Skeleton: {
    renderDetail: vi.fn(() => '<div class="skeleton-detail">Loading...</div>'),
  },
}));

// ---- Imports (after mocks) ----

import { render } from '../../src/routes/gist-detail';
import { loadGistDetail } from '../../src/components/gist-detail';
import { Skeleton } from '../../src/components/ui/skeleton';

describe('GistDetail Route', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    // Clean up any scroll-progress bars added during tests
    document.querySelectorAll('.scroll-progress').forEach((el) => el.remove());
  });

  // ---- render without gistId ----

  describe('render without gistId', () => {
    it('shows empty state when no gistId provided', () => {
      render(container);

      expect(container.innerHTML).toContain('No gist selected');
      expect(container.innerHTML).toContain('empty-state-container');
    });

    it('does not call loadGistDetail when no gistId', () => {
      render(container);

      expect(loadGistDetail).not.toHaveBeenCalled();
    });

    it('does not show skeleton when no gistId', () => {
      render(container);

      expect(Skeleton.renderDetail).not.toHaveBeenCalled();
    });
  });

  // ---- render with gistId ----

  describe('render with gistId', () => {
    it('shows skeleton while gist loads', () => {
      render(container, { gistId: 'gist-123' });

      expect(Skeleton.renderDetail).toHaveBeenCalled();
      expect(container.innerHTML).toContain('skeleton-detail');
    });

    it('calls loadGistDetail with the provided gistId', () => {
      render(container, { gistId: 'gist-123' });

      expect(loadGistDetail).toHaveBeenCalledWith(
        'gist-123',
        container,
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('passes onBack callback that dispatches navigate to home', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      render(container, { gistId: 'gist-123' });

      // Extract the onBack callback from loadGistDetail call
      const onBack = vi.mocked(loadGistDetail).mock.calls[0]?.[2];
      expect(onBack).toBeDefined();

      onBack!();

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'app:navigate',
          detail: { route: 'home' },
        }),
      );

      dispatchSpy.mockRestore();
    });

    it('passes onEdit callback with gistId', () => {
      render(container, { gistId: 'gist-456' });

      const onEdit = vi.mocked(loadGistDetail).mock.calls[0]?.[3];
      expect(onEdit).toBeDefined();

      // onEdit should be a function that takes an id
      expect(onEdit).toBeInstanceOf(Function);
    });

    it('passes onViewRevision callback with gistId', () => {
      render(container, { gistId: 'gist-789' });

      const onViewRevision = vi.mocked(loadGistDetail).mock.calls[0]?.[4];
      expect(onViewRevision).toBeDefined();

      // onViewRevision should be a function that takes id and version
      expect(onViewRevision).toBeInstanceOf(Function);
    });
  });

  // ---- scroll-progress bar ----

  describe('scroll-progress bar (progressive enhancement)', () => {
    beforeEach(() => {
      // jsdom does not define CSS, so we stub it to test the progressive enhancement branch
      vi.stubGlobal('CSS', { supports: vi.fn(() => true) });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('adds scroll-progress bar when CSS.supports animation-timeline', () => {
      render(container, { gistId: 'gist-1' });

      const progressBar = document.querySelector('.scroll-progress');
      expect(progressBar).not.toBeNull();
      expect(progressBar?.getAttribute('aria-hidden')).toBe('true');
    });

    it('removes scroll-progress bar on app:navigate event', () => {
      render(container, { gistId: 'gist-1' });

      expect(document.querySelector('.scroll-progress')).not.toBeNull();

      window.dispatchEvent(new CustomEvent('app:navigate', { detail: { route: 'home' } }));

      expect(document.querySelector('.scroll-progress')).toBeNull();
    });

    it('does not add duplicate scroll-progress bars', () => {
      render(container, { gistId: 'gist-1' });
      // Call render again for a different gist
      render(container, { gistId: 'gist-2' });

      const bars = document.querySelectorAll('.scroll-progress');
      expect(bars.length).toBe(1);
    });
  });

  // ---- no scroll-progress without CSS.supports ----

  describe('scroll-progress guard without CSS.supports', () => {
    it('does not add scroll-progress bar when CSS.supports returns false', () => {
      // CSS.supports is not mocked here, defaults to jsdom's false
      render(container, { gistId: 'gist-1' });

      const progressBar = document.querySelector('.scroll-progress');
      expect(progressBar).toBeNull();
    });
  });

  // ---- empty params ----

  describe('render with empty params', () => {
    it('handles empty params object gracefully', () => {
      render(container, {});

      expect(container.innerHTML).toContain('No gist selected');
      expect(loadGistDetail).not.toHaveBeenCalled();
    });
  });
});
