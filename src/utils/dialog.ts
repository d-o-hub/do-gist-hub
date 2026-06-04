/**
 * Shared dialog utilities — avoids circular imports between components.
 */

import { sanitizeHtml } from '../services/security/dom';
import { focusTrap } from './focus-trap';

/**
 * Show a modal confirmation dialog. Returns true if the user confirms.
 * Replaces native confirm() for better UX and CSP compliance.
 */
export function showConfirmDialog(message: string, title = 'CONFIRM'): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    const dialogId = `dialog-${Date.now()}`;

    overlay.innerHTML = `
      <div class="confirm-dialog glass-card" role="alertdialog" aria-modal="true" aria-labelledby="${dialogId}-title" aria-describedby="${dialogId}-desc">
        <h2 class="confirm-title" id="${dialogId}-title">${sanitizeHtml(title)}</h2>
        <p class="confirm-message" id="${dialogId}-desc">${sanitizeHtml(message)}</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" data-action="cancel">CANCEL</button>
          <button class="btn btn-danger" data-action="confirm">CONFIRM</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const dialog = overlay.querySelector('.confirm-dialog') as HTMLElement;

    const controller = new AbortController();
    const { signal } = controller;

    const cleanup = (result: boolean): void => {
      focusTrap.deactivate();
      overlay.classList.remove('visible');
      controller.abort();
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 200);
    };

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        cleanup(false);
      }
    };

    window.addEventListener('keydown', handleEscape, { signal });

    overlay
      .querySelector('[data-action="cancel"]')
      ?.addEventListener('click', () => cleanup(false), { signal });
    overlay
      .querySelector('[data-action="confirm"]')
      ?.addEventListener('click', () => cleanup(true), { signal });

    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      if (dialog) {
        focusTrap.activate(dialog);
      }
    });
  });
}
