/**
 * Error Boundary Components (2026)
 * Layered error handling for different failure scopes.
 */

import { AppError, ErrorCategory } from '../../services/github/error-handler';
import { safeError } from '../../services/security/logger';
import { announcer } from '../../utils/announcer';

export class ErrorBoundary {
  /**
   * Render a fallback UI for a specific error
   */
  static render(error: AppError, onRetry?: () => void): string {
    const isFatal =
      error.category === ErrorCategory.UNKNOWN || error.category === ErrorCategory.NETWORK;
    const categoryClass = (error.category || 'unknown').toLowerCase();
    const iconHtml = this.getIcon(error.category);
    const titleText = error.message || 'An error occurred';

    const detailsHtml = error.technicalDetails
      ? `<p class="error-details">${this.escapeHtml(error.technicalDetails)}</p>`
      : '';

    const actionMap: Record<string, string> = {
      retry: onRetry
        ? `<button class="primary-btn retry-btn" id="error-retry-btn">${
            error.recoveryAction || 'Try Again'
          }</button>`
        : '',
      clearCache: isFatal
        ? '<button class="secondary-btn" id="error-clear-cache-btn">Clear Local Data</button>'
        : '',
      reload: isFatal
        ? '<button class="btn-ghost" onclick="window.location.reload()">Reload App</button>'
        : '',
    };
    const actionsHtml = Object.values(actionMap)
      .filter((html) => html)
      .join('');

    return `
      <div class="error-boundary ${categoryClass}" role="alert">
        <div class="error-icon">${iconHtml}</div>
        <h2 class="error-title">${titleText}</h2>
        ${detailsHtml}
        <div class="error-actions">
          ${actionsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Bind event listeners for the error boundary UI
   */
  static bindEvents(container: HTMLElement, onRetry?: () => void): void {
    if (onRetry) {
      container.querySelector('#error-retry-btn')?.addEventListener('click', () => {
        onRetry();
      });
    }

    container.querySelector('#error-clear-cache-btn')?.addEventListener('click', () => {
      void (async () => {
        const { showConfirmDialog } = await import('../../utils/dialog');
        if (await showConfirmDialog('CLEAR ALL LOCAL DATA? THIS CANNOT BE UNDONE.')) {
          const { clearAllData } = await import('../../services/db');
          await clearAllData();
          window.location.reload();
        }
      })();
    });
  }

  private static getIcon(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.AUTH:
        return '🔐';
      case ErrorCategory.NETWORK:
        return '🌐';
      case ErrorCategory.RATE_LIMIT:
        return '⏳';
      case ErrorCategory.VALIDATION:
        return '⚠️';
      default:
        return '❌';
    }
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Wrap a promise with error handling
   */
  static async wrap<T>(promise: Promise<T>, context: string): Promise<T | null> {
    try {
      return await promise;
    } catch (error) {
      safeError(`[ErrorBoundary] Error in ${context}:`, error);
      announcer.error('An unexpected error occurred');
      return null;
    }
  }
}

/**
 * Global Error Handler for uncaught exceptions
 */
export function initGlobalErrorHandling(): void {
  window.addEventListener('error', (event) => {
    safeError('[Global] Uncaught error:', event.error);
    announcer.error('A critical error occurred');
  });

  window.addEventListener('unhandledrejection', (event) => {
    safeError('[Global] Unhandled promise rejection:', event.reason);
    announcer.error('An async operation failed');
  });
}
