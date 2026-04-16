/**
 * Toast Notification System
 * Accessible, non-blocking user feedback with success/error/info variants
 */

import { sanitizeHtml } from '../../services/security';

export type ToastType = 'success' | 'error' | 'info';

export class ToastManager {
  private container: HTMLElement | null = null;
  private toasts: Map<string, HTMLElement> = new Map();
  private idCounter = 0;

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
        bottom: var(--spacing-4, 1rem);
        right: var(--spacing-4, 1rem);
        z-index: var(--z-index-modal, 1050);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2, 0.5rem);
        max-width: calc(100vw - var(--spacing-8, 2rem));
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }

    return this.container;
  }

  show(message: string, type: ToastType = 'info', durationMs: number = 4000): string {
    const id = `toast-${++this.idCounter}`;
    const container = this.getContainer();

    const toast = document.createElement('div');
    toast.id = id;
    toast.setAttribute('role', 'alert');
    toast.classList.add('toast', `toast-${type}`, 'toast-enter');
    toast.style.pointerEvents = 'auto';

    // Icon based on type
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icon}</span>
      <span class="toast-message">${sanitizeHtml(message)}</span>
      <button class="toast-close" aria-label="Dismiss notification" type="button">×</button>
    `;

    container.appendChild(toast);
    this.toasts.set(id, toast);

    // Close handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn?.addEventListener('click', () => this.dismiss(id));

    // Auto-dismiss
    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }

    return id;
  }

  success(message: string, durationMs?: number): string {
    return this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs?: number): string {
    // Errors stay longer so users can read them
    return this.show(message, 'error', durationMs ?? 6000);
  }

  info(message: string, durationMs?: number): string {
    return this.show(message, 'info', durationMs);
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
      { once: true }
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
    ids.forEach((id) => this.dismiss(id));
  }
}

// Singleton instance
export const toast = new ToastManager();
