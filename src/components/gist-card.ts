/**
 * Gist Card Component
 * Renders a single gist with actions
 */

import type { GistRecord } from '../services/db';
import gistStore from '../stores/gist-store';
import { toast } from './ui/toast';

/**
 * Format relative time
 */
function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo ago`;
  return `${Math.floor(diffDay / 365)}y ago`;
}

/**
 * Fast Regex-based HTML escape
 * ⚡ Bolt: Much faster than document.createElement approach for large lists
 */
function esc(text: string): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get display title
 */
function getTitle(gist: GistRecord): string {
  if (gist.description) return gist.description;
  const firstFile = Object.values(gist.files)[0];
  return firstFile?.filename || 'Untitled gist';
}

/**
 * Get sync status badge HTML
 */
function syncBadge(gist: GistRecord): string {
  if (gist.syncStatus === 'synced') return '';
  const labels: Record<string, string> = {
    pending: '⏳ Sync pending',
    conflict: '⚠ Conflict',
    error: '❌ Sync error',
  };
  return `<span class="sync-status status-${gist.syncStatus}">${labels[gist.syncStatus] || ''}</span>`;
}

/**
 * Simple memoization for gist card HTML
 * ⚡ Bolt: Avoids re-generating HTML for gists that haven't changed
 */
const cardCache = new Map<string, { html: string; updatedAt: string }>();

/**
 * Render a gist card
 */
export function renderCard(gist: GistRecord): string {
  // Check cache first
  const cached = cardCache.get(gist.id);
  if (cached && cached.updatedAt === gist.updatedAt) {
    return cached.html;
  }

  const title = esc(getTitle(gist));
  const desc = gist.description
    ? `<p class="gist-card-description">${esc(gist.description)}</p>`
    : '';
  const fileCount = Object.keys(gist.files).length;
  const starIcon = gist.starred ? '★' : '☆';
  const starClass = gist.starred ? 'starred' : '';
  const syncHtml = syncBadge(gist);
  const visibility = gist.public ? '🌐 Public' : '🔒 Private';
  const updated = relativeTime(gist.updatedAt);

  const html = `
    <article class="gist-card" data-gist-id="${esc(gist.id)}">
      <div class="gist-card-header">
        <a href="${esc(gist.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="gist-card-title" title="${title}">
          ${title}
        </a>
        <div class="gist-card-actions">
          <button class="gist-action-btn star-btn ${starClass}" data-id="${esc(gist.id)}" aria-label="${gist.starred ? 'Unstar' : 'Star'} gist" title="${gist.starred ? 'Unstar' : 'Star'}">
            ${starIcon}
          </button>
          <button class="gist-action-btn delete-btn" data-id="${esc(gist.id)}" aria-label="Delete gist" title="Delete">
            🗑
          </button>
        </div>
      </div>
      ${desc}
      <div class="gist-card-meta">
        <span class="gist-card-file-count">📄 ${fileCount} file${fileCount !== 1 ? 's' : ''}</span>
        <span>${visibility}</span>
        <span>Updated ${updated}</span>
        ${syncHtml}
      </div>
    </article>
  `;

  cardCache.set(gist.id, { html, updatedAt: gist.updatedAt });
  return html;
}

/**
 * Attach event listeners to a card element using Event Delegation
 * ⚡ Bolt: Single listener on container instead of many listeners on children.
 * Significant memory and performance boost for long lists.
 */
export function bindCardEvents(container: HTMLElement, onCardClick?: (id: string) => void): void {
  // Only bind once per container
  if (container.dataset.eventsBound === 'true') {
    // We still need to update the callback if it changed, but in this app it's usually static
    return;
  }

  container.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    // Handle Star Button
    const starBtn = target.closest('.star-btn') as HTMLElement;
    if (starBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = starBtn.dataset.id;
      if (!id) return;

      starBtn.style.pointerEvents = 'none';
      const ok = await gistStore.toggleStar(id);
      starBtn.style.pointerEvents = '';

      if (!ok) {
        toast.error('Failed to toggle star');
      }
      return;
    }

    // Handle Delete Button
    const deleteBtn = target.closest('.delete-btn') as HTMLElement;
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = deleteBtn.dataset.id;
      if (!id) return;

      if (!confirm('Delete this gist? This cannot be undone.')) return;

      deleteBtn.style.pointerEvents = 'none';
      const ok = await gistStore.deleteGist(id);
      deleteBtn.style.pointerEvents = '';

      if (ok) {
        toast.success('Gist deleted');
      } else {
        toast.error('Failed to delete gist');
      }
      return;
    }

    // Handle Card Click (detail view)
    const card = target.closest('.gist-card') as HTMLElement;
    if (card && onCardClick) {
      // Don't navigate if clicking a link or action container
      if (target.closest('a') || target.closest('.gist-card-actions')) {
        return;
      }
      const id = card.getAttribute('data-gist-id');
      if (id) onCardClick(id);
    }
  });

  container.dataset.eventsBound = 'true';
}
