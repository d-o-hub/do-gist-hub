/**
 * RouteBoundary Component (2026)
 * Route-level error isolation for lazy-loaded route modules.
 * Catches render failures and provides retry capability.
 */

import { sanitizeHtml } from '../../services/security/dom';
import { safeError } from '../../services/security/logger';

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export const RouteBoundary = {
  /**
   * Wrap a route render function with error catching.
   * On failure, displays fallback UI with retry and home navigation.
   */
  async wrap(
    container: HTMLElement,
    route: string,
    renderFn: () => void | Promise<void>,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      await renderFn();
    } catch (error) {
      if (signal?.aborted) return;
      const err = normalizeError(error);
      safeError(`[RouteBoundary] Route "${route}" failed to render`, err);
      container.innerHTML = RouteBoundary.renderFallback(route, err);
      RouteBoundary.bindRetry(container, route, signal);
    }
  },

  renderFallback(route: string, error: Error): string {
    const message = error?.message || 'Failed to load this page';
    return `
      <div class="error-boundary route-error" role="alert">
        <h2 class="error-title">Page Load Error</h2>
        <p class="error-message">${sanitizeHtml(message)}</p>
        <p class="error-route">Route: ${sanitizeHtml(route)}</p>
        <div class="error-actions">
          <button class="btn btn-primary" data-action="route-retry" data-route="${sanitizeHtml(route)}">
            Try Again
          </button>
          <button class="btn btn-ghost" data-action="route-home">
            Go Home
          </button>
        </div>
      </div>
    `;
  },

  bindRetry(container: HTMLElement, route: string, signal?: AbortSignal): void {
    container.querySelector('[data-action="route-retry"]')?.addEventListener(
      'click',
      () => {
        window.dispatchEvent(
          new CustomEvent('app:navigate', {
            detail: { route },
          })
        );
      },
      { signal }
    );

    container.querySelector('[data-action="route-home"]')?.addEventListener(
      'click',
      () => {
        window.dispatchEvent(
          new CustomEvent('app:navigate', {
            detail: { route: 'home' },
          })
        );
      },
      { signal }
    );
  },
};
