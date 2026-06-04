/**
 * Shared dialog utilities — avoids circular imports between components.
 */

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

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog glass-card';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', `${dialogId}-title`);
    dialog.setAttribute('aria-describedby', `${dialogId}-desc`);

    const h2 = document.createElement('h2');
    h2.className = 'confirm-title';
    h2.id = `${dialogId}-title`;
    h2.textContent = title;
    dialog.appendChild(h2);

    const p = document.createElement('p');
    p.className = 'confirm-message';
    p.id = `${dialogId}-desc`;
    p.textContent = message;
    dialog.appendChild(p);

    const actions = document.createElement('div');
    actions.className = 'confirm-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.dataset.action = 'cancel';
    cancelBtn.textContent = cancelLabel;
    actions.appendChild(cancelBtn);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = confirmClass;
    confirmBtn.dataset.action = 'confirm';
    confirmBtn.textContent = confirmLabel;
    actions.appendChild(confirmBtn);

    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

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
