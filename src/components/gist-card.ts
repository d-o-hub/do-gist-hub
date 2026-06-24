/**
 * Gist Card Component
 * Redesigned for App Mode (Neural Telemetry style)
 */

import type { GistRecord } from '../services/db';
import { sanitizeHtml } from '../services/security/dom';
import gistStore from '../stores/gist-store';
import { formatRelativeTime, parseIsoDate } from '../utils/date';
import { showConfirmDialog } from '../utils/dialog';
import { renderTagChips } from './ui/tag-chip';
import { toast } from './ui/toast';

const cardCache = new Map<
  string,
  {
    html: string;
    updatedAt: string;
    starred: boolean;
    syncStatus: string;
    lastSyncedAt?: string;
    selected: boolean;
  }
>();

const SYNC_BADGE_LOOKUP: Record<string, string> = {
  pending: '<div class="sync-status-badge sync-status-pending">PENDING</div>',
  conflict: '<div class="sync-status-badge sync-status-conflict">CONFLICT</div>',
  error: '<div class="sync-status-badge sync-status-error">ERROR</div>',
};

/**
 * Render sync status badge.
 * BOLT: Use a lookup table to avoid repeated conditional logic and string creation.
 */
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
  const updatedTs = parseIsoDate(updatedAt);
  const syncedTs = parseIsoDate(lastSyncedAt);
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

export function renderCard(gist: GistRecord, selected = false): string {
  const cached = cardCache.get(gist.id);
  if (
    cached &&
    cached.updatedAt === gist.updatedAt &&
    cached.starred === gist.starred &&
    cached.syncStatus === gist.syncStatus &&
    cached.lastSyncedAt === gist.lastSyncedAt &&
    cached.selected === selected
  )
    return cached.html;

  // BOLT: Calculate file count and get first file in a single pass to avoid multiple array allocations
  let fileCount = 0;
  let firstFile: GistRecord['files'][string] | undefined;
  for (const key in gist.files) {
    if (!firstFile) firstFile = gist.files[key];
    fileCount++;
  }

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
  const tags = gistStore.getTagsFromCache(gist.id);
  const tagsHtml =
    tags.length > 0 ? `<div class="gist-card-tags">${renderTagChips(tags)}</div>` : '';

  const html = `
    <article class="glass-card gist-card${gist.starred ? ' featured' : ''}${selected ? ' selected' : ''}" data-gist-id="${sanitizeHtml(gist.id)}" data-testid="gist-item" tabindex="0" role="button"
             style="view-transition-name: ${vtName}"
             aria-label="Open gist: ${sanitizeHtml(description)}">
      <div class="gist-card-header">
        <div class="gist-card-meta">
          <label class="gist-select" aria-label="Select gist ${sanitizeHtml(description)}">
            <input type="checkbox" class="gist-checkbox" data-select-id="${sanitizeHtml(gist.id)}" ${selected ? 'checked' : ''} tabindex="-1">
            <span class="checkmark"></span>
          </label>
          <span class="micro-label">${sanitizeHtml(language.toUpperCase())}</span>
          <h2 class="gist-card-title">${sanitizeHtml(description)}</h2>
        </div>
        <div class="gist-card-stat">
          <span class="stat-number">${fileCount}</span>
          <span class="micro-label">FILES</span>
        </div>
      </div>
      ${tagsHtml}
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
    selected,
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

        const checkbox = target.closest('.gist-checkbox') as HTMLInputElement;
        if (checkbox) {
          e.preventDefault();
          e.stopPropagation();
          const id = checkbox.dataset.selectId;
          if (!id) return;
          if (e.shiftKey) {
            const lastSelected = gistStore.getSelectedIds().values().next().value;
            if (lastSelected) {
              gistStore.selectRange(lastSelected, id);
            } else {
              gistStore.toggleSelect(id);
            }
          } else {
            gistStore.toggleSelect(id);
          }
          return;
        }

        const starBtn = target.closest('.star-btn') as HTMLElement;
        if (starBtn) {
          e.preventDefault();
          e.stopPropagation();
          const id = starBtn.dataset.id;
          if (!id) return;
          await gistStore.toggleStar(id);
          return;
        }

        const deleteBtn = target.closest('.delete-btn') as HTMLButtonElement;
        if (deleteBtn) {
          e.preventDefault();
          e.stopPropagation();
          const id = deleteBtn.dataset.id;
          if (!id) return;
          // Prevent double-click while the delete is in flight. The
          // optimistic local removal makes the button disappear from
          // the DOM quickly, but a slow network call could let the
          // user click twice before the card unmounts.
          if (deleteBtn.disabled) return;
          deleteBtn.disabled = true;
          const confirmed = await showConfirmDialog({
            title: 'Delete this gist?',
            message:
              'The gist will be removed from GitHub and from your local cache. Other forks stay intact.',
            confirmLabel: 'Delete gist',
            cancelLabel: 'Keep it',
            variant: 'danger',
          });
          if (!confirmed) {
            deleteBtn.disabled = false;
            return;
          }
          deleteBtn.setAttribute('aria-busy', 'true');
          try {
            const ok = await gistStore.deleteGist(id);
            if (ok) {
              toast.success('GIST DELETED');
            } else {
              // The store rolled back the optimistic removal,
              // so the card is back in the list. Tell the user
              // the delete didn't go through so they know their
              // click was processed but didn't succeed.
              toast.error('DELETE FAILED, CHECK YOUR CONNECTION AND TRY AGAIN', 6000);
            }
          } finally {
            deleteBtn.removeAttribute('aria-busy');
            // If the delete succeeded, the card is already gone
            // (optimistic). If it failed, re-enable the button.
            if (document.body.contains(deleteBtn)) {
              deleteBtn.disabled = false;
            }
          }
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

  container.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target as HTMLElement;
        const card = target.closest('.gist-card') as HTMLElement;
        // Only activate if the card itself is focused (not a sub-button)
        if (card && target === card) {
          e.preventDefault();
          card.click();
        }
      }
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
