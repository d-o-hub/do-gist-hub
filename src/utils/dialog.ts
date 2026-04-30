/**
 * Shared dialog utilities — avoids circular imports between components.
 */

import { sanitizeHtml } from '../services/security/dom';

/**
 * Show a modal confirmation dialog. Returns true if the user confirms.
 * Replaces native confirm() for better UX and CSP compliance.
 */
export function showConfirmDialog(message: string, title = 'CONFIRM'): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog glass-card" role="dialog" aria-modal="true">
        <h2 class="confirm-title">${sanitizeHtml(title)}</h2>
        <p class="confirm-message">${sanitizeHtml(message)}</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" data-action="cancel">CANCEL</button>
          <button class="btn btn-danger" data-action="confirm">CONFIRM</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    const cleanup = (result: boolean): void => {
      overlay.classList.remove('visible');
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 200);
    };

    overlay
      .querySelector('[data-action="cancel"]')
      ?.addEventListener('click', () => cleanup(false));
    overlay
      .querySelector('[data-action="confirm"]')
      ?.addEventListener('click', () => cleanup(true));
  });
}
