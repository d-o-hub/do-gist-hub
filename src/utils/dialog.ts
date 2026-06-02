/**
 * Shared dialog utilities — avoids circular imports between components.
 */

import { sanitizeHtml } from '../services/security/dom';
import { focusTrap } from './focus-trap';

export interface ConfirmDialogOptions {
  /** Title shown at the top of the dialog. Should describe the action, not the verb. */
  title: string;
  /** Message body — should explain what happens and what the user keeps/loses. */
  message: string;
  /** Label of the destructive confirm button. Defaults to "Confirm". Sentence case. */
  confirmLabel?: string;
  /** Label of the safe-escape button. Defaults to "Cancel". Sentence case. */
  cancelLabel?: string;
  /**
   * Visual variant of the confirm button. Use 'danger' for destructive
   * actions, 'primary' for neutral confirmation. Defaults to 'danger'.
   */
  variant?: 'danger' | 'primary';
}

/**
 * Show a modal confirmation dialog. Returns true if the user confirms.
 * Replaces native confirm() for better UX and CSP compliance.
 *
 * Sentence case throughout. Names the action ("Delete gist") rather
 * than the verb ("Confirm") so users know exactly what they are
 * committing to.
 */
export function showConfirmDialog(
  messageOrOptions: string | ConfirmDialogOptions,
  legacyTitle?: string
): Promise<boolean> {
  const options: ConfirmDialogOptions =
    typeof messageOrOptions === 'string'
      ? {
          message: messageOrOptions,
          title: legacyTitle || 'Are you sure?',
          confirmLabel: 'Confirm',
          cancelLabel: 'Cancel',
          variant: 'danger',
        }
      : {
          confirmLabel: 'Confirm',
          cancelLabel: 'Cancel',
          variant: 'danger',
          ...messageOrOptions,
        };

  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
  } = options;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    const dialogId = `dialog-${crypto.randomUUID()}`;

    const confirmClass = variant === 'danger' ? 'btn btn-danger' : 'btn btn-primary';

    overlay.innerHTML = `
      <div class="confirm-dialog glass-card" role="alertdialog" aria-modal="true" aria-labelledby="${dialogId}-title" aria-describedby="${dialogId}-desc">
        <h2 class="confirm-title" id="${dialogId}-title">${sanitizeHtml(title)}</h2>
        <p class="confirm-message" id="${dialogId}-desc">${sanitizeHtml(message)}</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" data-action="cancel">${sanitizeHtml(cancelLabel)}</button>
          <button class="${confirmClass}" data-action="confirm">${sanitizeHtml(confirmLabel)}</button>
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
