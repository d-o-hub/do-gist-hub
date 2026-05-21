/**
 * Gist Card Component
 * Redesigned for App Mode (Neural Telemetry style)
 */

import type { GistRecord } from '../services/db';
import { sanitizeHtml } from '../services/security/dom';
import gistStore from '../stores/gist-store';
import { showConfirmDialog } from '../utils/dialog';
import { toast } from './ui/toast';

const cardCache = new Map<
  string,
  { html: string; updatedAt: string; starred: boolean; syncStatus: string; lastSyncedAt?: string }
>();

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const dateTs = Date.parse(dateStr);
  if (Number.isNaN(dateTs)) return '';
  const diffMs = now - dateTs;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'JUST NOW';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}M AGO`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}H AGO`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}D AGO`;
}

const SYNC_BADGE_LOOKUP: Record<string, string> = {
  pending:
    '<div class="sync-status-badge" style="display: inline-flex; align-items: center; gap: 4px; color: #3b82f6;">PENDING</div>',
  conflict:
    '<div class="sync-status-badge" style="display: inline-flex; align-items: center; gap: 4px; color: #f97316;">CONFLICT</div>',
  error:
    '<div class="sync-status-badge" style="display: inline-flex; align-items: center; gap: 4px; color: #ef4444;">ERROR</div>',
};

function renderSyncBadge(syncStatus: string | undefined): string {
  return (syncStatus && SYNC_BADGE_LOOKUP[syncStatus]) || '';
}

/**
 * Escape a string for use as a CSS view-transition-name.
 * Falls back to a safe prefix when CSS.escape is unavailable (Node/Vitest).
 */
function escapeViewTransitionName(id: string): string {
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return CSS.escape(`gc-${id}`);
  }
  // Fallback: gist IDs are alphanumeric — gc- prefix ensures valid custom-ident
  return `gc-${id}`;
}

function renderStalenessTooltip(updatedAt: string, lastSyncedAt?: string): string {
  if (!lastSyncedAt) return '';
  const updatedTs = Date.parse(updatedAt);
  const syncedTs = Date.parse(lastSyncedAt);
  if (Number.isNaN(updatedTs) || Number.isNaN(syncedTs)) return '';

  const staleMs = updatedTs - syncedTs;
  if (staleMs <= 0) return '';

  const staleMin = Math.floor(staleMs / 60000);
  const staleHr = Math.floor(staleMs / 3600000);
  const staleDay = Math.floor(staleMs / 86400000);

  let staleLabel: string;
  if (staleMin < 60) staleLabel = `${staleMin} MIN`;
  else if (staleHr < 24) staleLabel = `${staleHr} HOUR`;
  else staleLabel = `${staleDay} DAY`;

  const tooltipId = `tt-${staleMin}-${staleHr}-${staleDay}`;
  const syncedRelative = formatRelativeTime(lastSyncedAt);

  return `<span class="staleness-wrapper" style="anchor-name: --anchor-${tooltipId};">
    <button class="staleness-indicator" popovertarget="${tooltipId}" type="button">STALE: ${staleLabel}</button>
    <div class="staleness-tooltip" id="${tooltipId}" popover="manual" style="position-anchor: --anchor-${tooltipId}; position-area: block-end;">Updated ${staleLabel} before last sync. Synced ${syncedRelative}</div>
  </span>`;
}

export function renderCard(gist: GistRecord): string {
  const cached = cardCache.get(gist.id);
  if (
    cached &&
    cached.updatedAt === gist.updatedAt &&
    cached.starred === gist.starred &&
    cached.syncStatus === gist.syncStatus &&
    cached.lastSyncedAt === gist.lastSyncedAt
  )
    return cached.html;

  const fileCount = Object.keys(gist.files).length;
  const firstFile = Object.values(gist.files)[0];
  const language = firstFile?.language || 'TEXT';
  const description = gist.description || 'UNTITLED GIST';

  // Get snippet of content if available
  const content = firstFile?.content || '';
  const snippet = content.slice(0, 120);

  const staleHtml = renderStalenessTooltip(gist.updatedAt, gist.lastSyncedAt);
  const timeHtml = staleHtml
    ? ''
    : `<time class="micro-label" datetime="${gist.updatedAt}">${formatRelativeTime(gist.updatedAt)}</time>`;

  const vtName = escapeViewTransitionName(gist.id);

  const html = `
    <article class="glass-card gist-card${gist.starred ? ' featured' : ''}" data-gist-id="${sanitizeHtml(gist.id)}" data-testid="gist-item" tabindex="0" role="button"
             style="view-transition-name: ${vtName}"
             aria-label="Open gist: ${sanitizeHtml(description)}">
      <div class="gist-card-header">
        <div class="gist-card-meta">
          <span class="micro-label">${sanitizeHtml(language.toUpperCase())}</span>
          <h2 class="gist-card-title">${sanitizeHtml(description)}</h2>
        </div>
        <div class="gist-card-stat">
          <span class="stat-number">${fileCount}</span>
          <span class="micro-label">FILES</span>
        </div>
      </div>
      <div class="gist-card-preview">
        <pre class="gist-preview-code"><code>${sanitizeHtml(snippet)}</code></pre>
      </div>
      <footer class="gist-card-actions">
        <div class="action-group">
          <button class="gist-action-btn star-btn" data-id="${sanitizeHtml(gist.id)}"
                  aria-label="${gist.starred ? 'Unstar' : 'Star'} gist"
                  aria-pressed="${gist.starred}">
            <span class="micro-label">${gist.starred ? 'STARRED' : 'STAR'}</span>
          </button>
          <button class="gist-action-btn delete-btn" data-id="${sanitizeHtml(gist.id)}" aria-label="Delete gist">
            <span class="micro-label">DELETE</span>
          </button>
        </div>
        ${renderSyncBadge(gist.syncStatus)}
        ${staleHtml}
        ${timeHtml}
      </footer>
    </article>
  `;

  cardCache.set(gist.id, {
    html,
    updatedAt: gist.updatedAt,
    starred: gist.starred,
    syncStatus: gist.syncStatus ?? 'synced',
    lastSyncedAt: gist.lastSyncedAt,
  });
  return html;
}

export function bindCardEvents(
  container: HTMLElement,
  onCardClick?: (id: string) => void,
  signal?: AbortSignal
): void {
  if (container.dataset.eventsBound === 'true') return;

  container.addEventListener(
    'click',
    (e) => {
      void (async () => {
        const target = e.target as HTMLElement;

        const starBtn = target.closest('.star-btn') as HTMLElement;
        if (starBtn) {
          e.preventDefault();
          e.stopPropagation();
          const id = starBtn.dataset.id;
          if (!id) return;
          await gistStore.toggleStar(id);
          return;
        }

        const deleteBtn = target.closest('.delete-btn') as HTMLElement;
        if (deleteBtn) {
          e.preventDefault();
          e.stopPropagation();
          const id = deleteBtn.dataset.id;
          if (!id) return;
          const confirmed = await showConfirmDialog('DELETE THIS GIST?');
          if (!confirmed) return;
          const ok = await gistStore.deleteGist(id);
          if (ok) toast.success('GIST DELETED');
          return;
        }

        const card = target.closest('.gist-card') as HTMLElement;
        if (card && onCardClick) {
          if (target.closest('.gist-card-actions')) return;
          const id = card.getAttribute('data-gist-id');
          if (id) onCardClick(id);
        }
      })();
    },
    { signal }
  );

  container.dataset.eventsBound = 'true';

  // Reset eventsBound when the signal aborts so future mounts can rebind
  signal?.addEventListener(
    'abort',
    () => {
      delete container.dataset.eventsBound;
    },
    { once: true }
  );
}
