/**
 * Unit tests for RouteBoundary Component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/services/security/dom', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { RouteBoundary } from '../../src/components/ui/route-boundary';
import { safeError } from '../../src/services/security/logger';

// ── Tests ─────────────────────────────────────────────────────────────

describe('RouteBoundary', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  // ── wrap ────────────────────────────────────────────────────────────

  describe('wrap', () => {
    it('calls renderFn and completes successfully', async () => {
      const renderFn = vi.fn().mockResolvedValue(undefined);

      await RouteBoundary.wrap(container, 'home', renderFn);

      expect(renderFn).toHaveBeenCalled();
      expect(safeError).not.toHaveBeenCalled();
    });

    it('catches render errors and displays fallback', async () => {
      const renderError = new Error('Render failure');
      const renderFn = vi.fn().mockRejectedValue(renderError);

      await RouteBoundary.wrap(container, 'test-route', renderFn);

      expect(safeError).toHaveBeenCalledWith(
        '[RouteBoundary] Route "test-route" failed to render',
        renderError
      );
      expect(container.innerHTML).toContain('Page Load Error');
      expect(container.innerHTML).toContain('Render failure');
      expect(container.innerHTML).toContain('test-route');
    });

    it('handles non-Error thrown values', async () => {
      const renderFn = vi.fn().mockRejectedValue('string error');

      await RouteBoundary.wrap(container, 'home', renderFn);

      expect(container.innerHTML).toContain('Page Load Error');
      expect(container.innerHTML).toContain('string error');
    });

    it('handles synchronous render errors', async () => {
      const renderFn = vi.fn(() => {
        throw new Error('Sync error');
      });

      await RouteBoundary.wrap(container, 'sync-route', renderFn);

      expect(container.innerHTML).toContain('Sync error');
      expect(container.innerHTML).toContain('sync-route');
    });
  });

  // ── renderFallback ──────────────────────────────────────────────────

  describe('renderFallback', () => {
    it('renders error message and route', () => {
      const html = RouteBoundary.renderFallback('settings', new Error('Something broke'));

      expect(html).toContain('Page Load Error');
      expect(html).toContain('Something broke');
      expect(html).toContain('settings');
      expect(html).toContain('Try Again');
      expect(html).toContain('Go Home');
    });

    it('uses default message when error has no message', () => {
      const html = RouteBoundary.renderFallback('test', new Error());

      expect(html).toContain('Failed to load this page');
    });

    it('sets role="alert" for accessibility', () => {
      const html = RouteBoundary.renderFallback('test', new Error('err'));

      expect(html).toContain('role="alert"');
    });
  });

  // ── bindRetry ───────────────────────────────────────────────────────

  describe('bindRetry', () => {
    it('dispatches app:navigate on retry button click', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      container.innerHTML = RouteBoundary.renderFallback('settings', new Error('err'));
      RouteBoundary.bindRetry(container, 'settings');

      const retryBtn = container.querySelector('[data-action="route-retry"]') as HTMLElement;
      retryBtn?.click();

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'app:navigate',
          detail: { route: 'settings' },
        })
      );
    });

    it('dispatches home navigation on Go Home button click', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      container.innerHTML = RouteBoundary.renderFallback('settings', new Error('err'));
      RouteBoundary.bindRetry(container, 'settings');

      const homeBtn = container.querySelector('[data-action="route-home"]') as HTMLElement;
      homeBtn?.click();

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'app:navigate',
          detail: { route: 'home' },
        })
      );
    });
  });
});
