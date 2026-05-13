/**
 * Gist Detail Route
 */

import { loadGistDetail } from '../components/gist-detail';
import { Skeleton } from '../components/ui/skeleton';

export function render(container: HTMLElement, params?: Record<string, string>): void {
  const gistId = params?.gistId;
  if (!gistId) {
    container.innerHTML =
      '<div class="empty-state-container"><p class="empty-state-description">No gist selected</p></div>';
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
    () => {},
    () => {}
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
    const removeBar = () => {
      progressBar.remove();
      window.removeEventListener('app:navigate', removeBar);
    };
    window.addEventListener('app:navigate', removeBar);
  }
}
