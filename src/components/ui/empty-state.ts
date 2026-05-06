/**
 * Actionable Empty State Component (2026)
 * Guides users toward the next step when no content is available.
 */

import { sanitizeHtml } from '../../services/security/dom';

export interface EmptyStateOptions {
  title: string;
  description: string;
  actionLabel?: string;
  actionRoute?: string;
  actionType?: string;
}

export class EmptyState {
  static render(options: EmptyStateOptions): string {
    const { title, description, actionLabel, actionRoute, actionType } = options;

    const actionAttr = actionRoute
      ? `data-route="${actionRoute}"`
      : actionType
        ? `data-action="${actionType}"`
        : '';

    return `
      <div class="empty-state-container" role="status">
        <h3 class="empty-state-title">${sanitizeHtml(title)}</h3>
        <p class="empty-state-description">${sanitizeHtml(description)}</p>
        ${
          actionLabel
            ? `
          <button class="btn btn-primary empty-state-action" ${actionAttr}>
            ${sanitizeHtml(actionLabel)}
          </button>
        `
            : ''
        }
      </div>
    `;
  }
}
