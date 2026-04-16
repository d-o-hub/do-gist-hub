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

    return `
      <div class="error-boundary ${error.category.toLowerCase()}" role="alert">
        <div class="error-icon">${this.getIcon(error.category)}</div>
        <h2 class="error-title">${error.message}</h2>
        ${error.technicalDetails ? `<p class="error-details">${this.escapeHtml(error.technicalDetails)}</p>` : ''}
        <div class="error-actions">
          ${
            onRetry
              ? `<button class="primary-btn retry-btn" onclick="window.dispatchEvent(new CustomEvent('app:retry'))">
            ${error.recoveryAction || 'Try Again'}
          </button>`
              : ''
          }
          ${isFatal ? `<button class="secondary-btn" onclick="window.location.reload()">Reload App</button>` : ''}
        </div>
      </div>
    `;
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
