/**
 * RouteBoundary Component (2026)
 * Route-level error isolation for lazy-loaded route modules.
 * Catches render failures and provides retry capability.
 */

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
      container.replaceChildren(RouteBoundary.renderFallback(route, err));
      RouteBoundary.bindRetry(container, route, signal);
    }
  },

  renderFallback(route: string, error: Error): DocumentFragment {
    const message = error?.message || 'Failed to load this page';
    const frag = document.createDocumentFragment();
    const wrapper = document.createElement('div');
    wrapper.className = 'error-boundary route-error';
    wrapper.setAttribute('role', 'alert');

    const h2 = document.createElement('h2');
    h2.className = 'error-title';
    h2.textContent = 'Page Load Error';
    wrapper.appendChild(h2);

    const pMsg = document.createElement('p');
    pMsg.className = 'error-message';
    pMsg.textContent = message;
    wrapper.appendChild(pMsg);

    const pRoute = document.createElement('p');
    pRoute.className = 'error-route';
    pRoute.textContent = `Route: ${route}`;
    wrapper.appendChild(pRoute);

    const actions = document.createElement('div');
    actions.className = 'error-actions';

    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn btn-primary';
    retryBtn.dataset.action = 'route-retry';
    retryBtn.dataset.route = route;
    retryBtn.textContent = 'Try Again';
    actions.appendChild(retryBtn);

    const homeBtn = document.createElement('button');
    homeBtn.className = 'btn btn-ghost';
    homeBtn.dataset.action = 'route-home';
    homeBtn.textContent = 'Go Home';
    actions.appendChild(homeBtn);

    wrapper.appendChild(actions);
    frag.appendChild(wrapper);
    return frag;
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
