/**
 * Actionable Empty State Component (2026)
 * Guides users toward the next step when no content is available.
 */

import { sanitizeHtml } from '../../services/security/dom';

export interface EmptyStateOptions {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  actionRoute?: string;
  actionType?: string;
}

export const EmptyState = {
  render(options: EmptyStateOptions): string {
    const { title, description, icon, actionLabel, actionRoute, actionType } = options;

    const actionAttr = actionRoute
      ? `data-route="${actionRoute}"`
      : actionType
        ? `data-action="${actionType}"`
        : '';

    return `
      <div class="empty-state-container" role="status">
        ${icon ? `<div class="empty-state-icon" aria-hidden="true">${sanitizeHtml(icon)}</div>` : ''}
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
  },

  /**
   * Render to a DocumentFragment — avoids innerHTML for callers that
   * inject the result directly into the DOM.
   */
  renderToFragment(options: EmptyStateOptions): DocumentFragment {
    const { title, description, icon, actionLabel, actionRoute, actionType } = options;

    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');
    container.className = 'empty-state-container';
    container.setAttribute('role', 'status');

    if (icon) {
      const iconDiv = document.createElement('div');
      iconDiv.className = 'empty-state-icon';
      iconDiv.setAttribute('aria-hidden', 'true');
      iconDiv.textContent = icon;
      container.appendChild(iconDiv);
    }

    const h3 = document.createElement('h3');
    h3.className = 'empty-state-title';
    h3.textContent = title;
    container.appendChild(h3);

    const p = document.createElement('p');
    p.className = 'empty-state-description';
    p.textContent = description;
    container.appendChild(p);

    if (actionLabel) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary empty-state-action';
      btn.textContent = actionLabel;
      if (actionRoute) {
        btn.dataset.route = actionRoute;
      }
      if (actionType) {
        btn.dataset.action = actionType;
      }
      container.appendChild(btn);
    }

    fragment.appendChild(container);
    return fragment;
  },
};
