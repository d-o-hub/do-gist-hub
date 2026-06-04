/**
 * Unit tests for RouteBoundary Component
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

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
      expect(container.textContent).toContain('Page Load Error');
      expect(container.textContent).toContain('Render failure');
      expect(container.textContent).toContain('test-route');
    });

    it('handles non-Error thrown values', async () => {
      const renderFn = vi.fn().mockRejectedValue('string error');

      await RouteBoundary.wrap(container, 'home', renderFn);

      expect(container.textContent).toContain('Page Load Error');
      expect(container.textContent).toContain('string error');
    });

    it('handles synchronous render errors', async () => {
      const renderFn = vi.fn(() => {
        throw new Error('Sync error');
      });

      await RouteBoundary.wrap(container, 'sync-route', renderFn);

      expect(container.textContent).toContain('Sync error');
      expect(container.textContent).toContain('sync-route');
    });
  });

  // ── renderFallback ──────────────────────────────────────────────────

  describe('renderFallback', () => {
    it('renders error message and route', () => {
      const frag = RouteBoundary.renderFallback('settings', new Error('Something broke'));
      const wrapper = document.createElement('div');
      wrapper.appendChild(frag);

      expect(wrapper.textContent).toContain('Page Load Error');
      expect(wrapper.textContent).toContain('Something broke');
      expect(wrapper.textContent).toContain('settings');
      expect(wrapper.textContent).toContain('Try Again');
      expect(wrapper.textContent).toContain('Go Home');
    });

    it('uses default message when error has no message', () => {
      const frag = RouteBoundary.renderFallback('test', new Error());
      const wrapper = document.createElement('div');
      wrapper.appendChild(frag);

      expect(wrapper.textContent).toContain('Failed to load this page');
    });

    it('sets role="alert" for accessibility', () => {
      const frag = RouteBoundary.renderFallback('test', new Error('err'));
      const wrapper = document.createElement('div');
      wrapper.appendChild(frag);

      expect(wrapper.querySelector('[role="alert"]')).not.toBeNull();
    });
  });

  // ── bindRetry ───────────────────────────────────────────────────────

  describe('bindRetry', () => {
    it('dispatches app:navigate on retry button click', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      container.replaceChildren(RouteBoundary.renderFallback('settings', new Error('err')));
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
      container.replaceChildren(RouteBoundary.renderFallback('settings', new Error('err')));
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
