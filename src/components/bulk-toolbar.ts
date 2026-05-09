/**
 * Bulk Toolbar Component
 *
 * Sticky toolbar that appears when gists are selected.
 * Provides bulk actions: star, unstar, export, tag, delete.
 */

import { sanitizeHtml } from '../services/security/dom';

export interface BulkToolbarOptions {
  selectedCount: number;
}

/**
 * Render bulk action toolbar
 */
export function renderBulkToolbar(options: BulkToolbarOptions): string {
  const { selectedCount } = options;

  return `
    <div class="bulk-toolbar" role="toolbar" aria-label="Bulk actions">
      <div class="bulk-toolbar-info">
        <span class="selected-count">${selectedCount} selected</span>
        <button class="btn-text" data-action="clear-selection" aria-label="Clear selection">
          Clear
        </button>
      </div>
      
      <div class="bulk-toolbar-actions">
        <button class="btn-icon" data-action="bulk-star" 
                aria-label="Star selected gists" title="Star">
          <span aria-hidden="true">☆</span>
          <span class="sr-only">Star</span>
        </button>
        <button class="btn-icon" data-action="bulk-unstar"
                aria-label="Unstar selected gists" title="Unstar">
          <span aria-hidden="true">★</span>
          <span class="sr-only">Unstar</span>
        </button>
        <button class="btn-icon" data-action="bulk-export"
                aria-label="Export selected gists" title="Export">
          <span aria-hidden="true">⬇</span>
          <span class="sr-only">Export</span>
        </button>
        <button class="btn-icon" data-action="bulk-tag"
                aria-label="Tag selected gists" title="Tag">
          <span aria-hidden="true">🏷</span>
          <span class="sr-only">Tag</span>
        </button>
        <button class="btn-icon btn-danger" data-action="bulk-delete"
                aria-label="Delete selected gists" title="Delete">
          <span aria-hidden="true">🗑</span>
          <span class="sr-only">Delete</span>
        </button>
      </div>
    </div>
  `;
}

export interface BulkToolbarHandlers {
  onDelete: () => void;
  onStar: () => void;
  onUnstar: () => void;
  onExport: () => void;
  onTag: () => void;
  onClearSelection: () => void;
}

/**
 * Bind event handlers to bulk toolbar
 */
export function bindBulkToolbarEvents(container: HTMLElement, handlers: BulkToolbarHandlers): void {
  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLElement;

    if (!button) return;

    const action = button.dataset.action;

    switch (action) {
      case 'bulk-delete':
        handlers.onDelete();
        break;
      case 'bulk-star':
        handlers.onStar();
        break;
      case 'bulk-unstar':
        handlers.onUnstar();
        break;
      case 'bulk-export':
        handlers.onExport();
        break;
      case 'bulk-tag':
        handlers.onTag();
        break;
      case 'clear-selection':
        handlers.onClearSelection();
        break;
    }
  });
}
