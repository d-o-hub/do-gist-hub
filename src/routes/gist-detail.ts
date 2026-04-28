/**
 * Gist Detail Route
 */

import { loadGistDetail } from '../components/gist-detail';

export function render(container: HTMLElement, params?: Record<string, string>): void {
  const gistId = params?.gistId;
  if (!gistId) {
    container.innerHTML =
      '<div class="empty-state-container"><p class="empty-state-description">No gist selected</p></div>';
    return;
  }

  container.innerHTML = '<div id="gist-detail-container"></div>';
  const detailContainer = container.querySelector('#gist-detail-container');
  if (detailContainer instanceof HTMLElement) {
    void loadGistDetail(
      gistId,
      detailContainer,
      () => {
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: { route: 'home' } }));
      },
      () => {},
      () => {}
    );
  }
}
