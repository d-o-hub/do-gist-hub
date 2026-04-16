/**
 * Actionable Empty State Component (2026)
 * Guides users toward the next step when no content is available.
 */

import { sanitizeHtml } from '../../services/security';

export interface EmptyStateOptions {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  actionRoute?: string;
  onAction?: () => void;
}

export class EmptyState {
  static render(options: EmptyStateOptions): string {
    const { title, description, icon = '📭', actionLabel, actionRoute } = options;

    return `
      <div class="empty-state-container" role="status">
        <div class="empty-state-icon">${icon}</div>
        <h3 class="empty-state-title">${sanitizeHtml(title)}</h3>
        <p class="empty-state-description">${sanitizeHtml(description)}</p>
        ${
          actionLabel
            ? `
          <button class="primary-btn empty-state-action"
                  data-route="${actionRoute || ''}"
                  onclick="${actionRoute ? `window.dispatchEvent(new CustomEvent('app:navigate', { detail: '${actionRoute}' }))` : "window.dispatchEvent(new CustomEvent('app:clear-search'))"}">
            ${sanitizeHtml(actionLabel)}
          </button>
        `
            : ''
        }
      </div>
    `;
  }
}
