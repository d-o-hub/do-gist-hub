/**
 * Gist Detail Route
 */

import { loadGistDetail } from '../components/gist-detail';
import { EmptyState } from '../components/ui/empty-state';
import { Skeleton } from '../components/ui/skeleton';
import { lifecycle } from '../services/lifecycle';

export function render(container: HTMLElement, params?: Record<string, string>): void {
  const signal = lifecycle.getRouteSignal();

  const gistId = params?.gistId;
  if (!gistId) {
    const fragment = EmptyState.renderToFragment({
      title: 'No Gist Selected',
      description: 'Select a gist from the list to view its contents and history.',
      icon: '📄',
    });
    container.replaceChildren(fragment);
    return;
  }

  // Show skeleton while gist loads, then replace with detail view
  container.innerHTML = Skeleton.renderDetail();
  void loadGistDetail(
    gistId,
    container,
    () => {
      window.dispatchEvent(new CustomEvent('app:navigate', { detail: { route: 'home' } }));
    },
    (_id) => {
      /* edit not implemented from detail yet */
    },
    (_id, _version) => {
      /* view revision not implemented from detail yet */
    },
    signal
  );

  // Progressive enhancement: add scroll-progress bar if supported
  // Guard against environments where CSS is unavailable (e.g. jsdom)
  if (
    typeof CSS !== 'undefined' &&
    CSS.supports('animation-timeline', 'scroll()') &&
    !document.querySelector('.scroll-progress')
  ) {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progressBar);
    // Remove on navigation away
    lifecycle.onRouteCleanup(() => progressBar.remove());
  }
}
