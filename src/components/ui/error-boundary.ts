import { AppError, ErrorCategory } from '../../services/github/error-handler';
export class ErrorBoundary {
  static render(error: AppError, onRetry?: () => void): string {
    const isFatal = error.category === ErrorCategory.UNKNOWN || error.category === ErrorCategory.NETWORK;
    return `<div class="error-boundary" role="alert">
      <h2>${error.message || 'An error occurred'}</h2>
      ${onRetry ? '<button id="error-retry-btn">Retry</button>' : ''}
      ${isFatal ? '<button id="error-clear-cache-btn">Clear Local Data</button>' : ''}
    </div>`;
  }
  static bindEvents(container: HTMLElement, onRetry?: () => void): void {
    container.querySelector('#error-retry-btn')?.addEventListener('click', () => onRetry?.());
    container.querySelector('#error-clear-cache-btn')?.addEventListener('click', async () => {
      const { showConfirmDialog } = await import('../../utils/dialog');
      if (await showConfirmDialog('CLEAR DATA?')) {
        const { clearAllData } = await import('../../services/db');
        await clearAllData();
        window.location.reload();
      }
    });
  }
}
