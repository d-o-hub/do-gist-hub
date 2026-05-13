/**
 * Unit tests for Gist Detail Route
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/components/gist-detail', () => ({
  loadGistDetail: vi.fn(),
}));

vi.mock('../../src/components/ui/skeleton', () => ({
  Skeleton: {
    renderDetail: vi.fn(() => '<div class="skeleton-detail"></div>'),
  },
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { render } from '../../src/routes/gist-detail';
import { loadGistDetail } from '../../src/components/gist-detail';
import { Skeleton } from '../../src/components/ui/skeleton';

// ── Tests ─────────────────────────────────────────────────────────────

describe('Gist Detail Route', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    // Clean up scroll-progress bars that may have been added by render
    document.querySelectorAll('.scroll-progress').forEach((el) => el.remove());
  });

  // ── Render without gistId ──────────────────────────────────────────────

  describe('render without gistId', () => {
    it('shows empty state when no gistId is provided', () => {
      render(container);

      expect(container.innerHTML).toContain('No gist selected');
      expect(container.innerHTML).toContain('empty-state-container');
      expect(Skeleton.renderDetail).not.toHaveBeenCalled();
      expect(loadGistDetail).not.toHaveBeenCalled();
    });

    it('handles undefined params gracefully', () => {
      render(container);

      expect(container.innerHTML).toContain('No gist selected');
    });

    it('handles params without gistId key gracefully', () => {
      render(container, {});

      expect(container.innerHTML).toContain('No gist selected');
    });
  });

  // ── Render with gistId ─────────────────────────────────────────────────

  describe('render with gistId', () => {
    it('shows skeleton while loading gist detail', () => {
      render(container, { gistId: 'test-gist-123' });

      expect(Skeleton.renderDetail).toHaveBeenCalled();
      expect(container.innerHTML).toContain('skeleton-detail');
    });

    it('calls loadGistDetail with gistId and container', () => {
      render(container, { gistId: 'test-gist-123' });

      expect(loadGistDetail).toHaveBeenCalledWith(
        'test-gist-123',
        container,
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('calls loadGistDetail with onNavigate callback that dispatches app:navigate', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      render(container, { gistId: 'test-gist-123' });

      // Extract the onNavigate callback and call it
      const onNavigate = vi.mocked(loadGistDetail).mock.calls[0]?.[2] as () => void;
      expect(onNavigate).toBeDefined();

      onNavigate();

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'app:navigate',
          detail: { route: 'home' },
        })
      );

      dispatchSpy.mockRestore();
    });
  });

  // ── Scroll progress bar ────────────────────────────────────────────

  describe('scroll progress bar', () => {
    beforeEach(() => {
      // Mock CSS.supports to return true for animation-timeline
      vi.stubGlobal('CSS', {
        supports: vi.fn((prop: string, _value?: string) => {
          if (prop === 'animation-timeline') return true;
          return false;
        }),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('adds scroll-progress bar when CSS.supports animation-timeline', () => {
      render(container, { gistId: 'test-gist-123' });

      const progressBar = document.querySelector('.scroll-progress');
      expect(progressBar).not.toBeNull();
      expect(progressBar?.getAttribute('aria-hidden')).toBe('true');
    });

    it('does not add duplicate scroll-progress bar', () => {
      const existingBar = document.createElement('div');
      existingBar.className = 'scroll-progress';
      document.body.appendChild(existingBar);

      render(container, { gistId: 'test-gist-123' });

      const bars = document.querySelectorAll('.scroll-progress');
      expect(bars.length).toBe(1);

      existingBar.remove();
    });

    it('removes scroll-progress bar on app:navigate event', () => {
      render(container, { gistId: 'test-gist-123' });

      expect(document.querySelector('.scroll-progress')).not.toBeNull();

      window.dispatchEvent(new CustomEvent('app:navigate'));

      expect(document.querySelector('.scroll-progress')).toBeNull();
    });

    it('does not add scroll-progress bar when CSS.supports returns false', () => {
      // Override CSS.supports to return false
      vi.stubGlobal('CSS', {
        supports: vi.fn(() => false),
      });

      render(container, { gistId: 'test-gist-123' });

      expect(document.querySelector('.scroll-progress')).toBeNull();
    });

    it('handles CSS being undefined gracefully', () => {
      // Make CSS undefined on the global scope to test the guard
      vi.stubGlobal('CSS', undefined);

      render(container, { gistId: 'test-gist-123' });

      expect(document.querySelector('.scroll-progress')).toBeNull();
    });
  });
});
