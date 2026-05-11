/**
 * Error Boundary Components (2026)
 * Layered error handling for different failure scopes.
 */

import { type AppError, ErrorCategory } from '../../services/github/error-handler';
import { sanitizeHtml } from '../../services/security/dom';
import { safeError } from '../../services/security/logger';
import { announcer } from '../../utils/announcer';

function getIcon(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.AUTH:
      return 'Auth Error';
    case ErrorCategory.NETWORK:
      return 'Network Error';
    case ErrorCategory.RATE_LIMIT:
      return 'Rate Limited';
    case ErrorCategory.VALIDATION:
      return 'Validation Error';
    default:
      return 'Error';
  }
}

export const ErrorBoundary = {
  /**
   * Render a fallback UI for a specific error
   */
  render(error: AppError, onRetry?: () => void): string {
    const isFatal =
      error.category === ErrorCategory.UNKNOWN || error.category === ErrorCategory.NETWORK;
    const categoryClass = (error.category || 'unknown').toLowerCase();
    const iconHtml = getIcon(error.category);
    const titleText = error.message || 'An error occurred';

    const detailsHtml = error.technicalDetails
      ? `<p class="error-details">${sanitizeHtml(error.technicalDetails)}</p>`
      : '';

    const actionMap: Record<string, string> = {
      retry: onRetry
        ? `<button class="btn btn-primary retry-btn" id="error-retry-btn">${
            error.recoveryAction || 'Try Again'
          }</button>`
        : '',
      reload: isFatal
        ? '<button class="btn btn-ghost" onclick="window.location.reload()">Reload App</button>'
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
  },

  /**
   * Bind event listeners for the error boundary UI
   */
  bindEvents(container: HTMLElement, onRetry?: () => void): void {
    if (onRetry) {
      container.querySelector('#error-retry-btn')?.addEventListener('click', () => onRetry());
    }
    container.querySelector('#error-clear-cache-btn')?.addEventListener('click', () => {
      void (async () => {
        const { showConfirmDialog } = await import('../../utils/dialog');
        if (await showConfirmDialog('Clear Data?')) {
          const { clearAllData } = await import('../../services/db');
          await clearAllData();
          window.location.reload();
        }
      })();
    });
  },
};

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
