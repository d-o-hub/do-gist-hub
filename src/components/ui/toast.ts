/**
 * Toast Notification System
 * Accessible, non-blocking user feedback with success/error/info variants
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export class ToastManager {
  private container: HTMLElement | null = null;
  private toasts: Map<string, HTMLElement> = new Map();
  private idCounter = 0;
  private abortController = new AbortController();

  private getContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.getElementById('toast-container');
    }

    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.setAttribute('role', 'region');
      this.container.setAttribute('aria-label', 'Notifications');
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'true');
      this.container.style.cssText = `
        position: fixed;
        left: var(--space-4, 1rem);
        right: var(--space-4, 1rem);
        bottom: calc(var(--space-4, 1rem) + var(--nav-bottom-height, 0px) + env(safe-area-inset-bottom, 0px));
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: var(--space-2, 0.5rem);
        max-width: calc(100vw - var(--space-8, 2rem));
        margin: 0 auto;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }

    return this.container;
  }

  show(message: string, type: ToastType = 'info', durationMs = 4000, action?: ToastAction): string {
    const id = `toast-${++this.idCounter}`;
    const container = this.getContainer();

    const toast = document.createElement('div');
    toast.id = id;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.classList.add('toast', `toast-${type}`, 'toast-enter');
    toast.style.pointerEvents = 'auto';

    const msgSpan = document.createElement('span');
    msgSpan.className = 'toast-message';
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);

    if (action) {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'toast-action btn btn-ghost';
      actionBtn.type = 'button';
      actionBtn.textContent = action.label;
      toast.appendChild(actionBtn);
      actionBtn.addEventListener(
        'click',
        () => {
          action.onClick();
          this.dismiss(id);
        },
        { signal: this.abortController.signal }
      );
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.setAttribute('aria-label', 'Dismiss notification');
    closeBtn.type = 'button';
    closeBtn.textContent = 'CLOSE';
    toast.appendChild(closeBtn);

    container.appendChild(toast);
    this.toasts.set(id, toast);

    // Close handler
    closeBtn.addEventListener('click', () => this.dismiss(id), {
      signal: this.abortController.signal,
    });

    // Hover pauses the auto-dismiss timer so the user can read or interact.
    if (durationMs > 0) {
      const autoDismiss = setTimeout(() => this.dismiss(id), durationMs);
      toast.addEventListener('mouseenter', () => clearTimeout(autoDismiss), {
        signal: this.abortController.signal,
        once: true,
      });
      toast.addEventListener('focusin', () => clearTimeout(autoDismiss), {
        signal: this.abortController.signal,
        once: true,
      });
    }

    return id;
  }

  success(message: string, durationMs?: number, action?: ToastAction): string {
    return this.show(message, 'success', durationMs, action);
  }

  error(message: string, durationMs?: number, action?: ToastAction): string {
    // Errors stay longer so users can read them
    return this.show(message, 'error', durationMs ?? 6000, action);
  }

  info(message: string, durationMs?: number, action?: ToastAction): string {
    return this.show(message, 'info', durationMs, action);
  }

  warn(message: string, durationMs?: number, action?: ToastAction): string {
    return this.show(message, 'warning', durationMs, action);
  }

  dismiss(id: string): void {
    const toast = this.toasts.get(id);
    if (!toast) return;

    // Animate out
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');

    // Remove after animation
    toast.addEventListener(
      'animationend',
      () => {
        toast.remove();
        this.toasts.delete(id);
      },
      { once: true, signal: this.abortController.signal }
    );

    // Fallback removal
    setTimeout(() => {
      if (this.toasts.has(id)) {
        toast.remove();
        this.toasts.delete(id);
      }
    }, 300);
  }

  dismissAll(): void {
    const ids = Array.from(this.toasts.keys());
    for (const id of ids) {
      this.dismiss(id);
    }
  }

  destroy(): void {
    this.abortController.abort();
    this.container?.remove();
  }

  /** Read-only view of active toasts, used by the global Escape handler. */
  get activeToasts(): ReadonlyMap<string, HTMLElement> {
    return this.toasts;
  }
}

// Singleton instance
export const toast = new ToastManager();

// Global Escape dismisses the most recent toast (one at a time)
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (toast.activeToasts.size === 0) return;
  const last = Array.from(toast.activeToasts.keys()).at(-1);
  if (last) toast.dismiss(last);
});
