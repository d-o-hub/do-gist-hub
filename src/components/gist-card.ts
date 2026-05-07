/**
 * Gist Card Component
 * Redesigned for App Mode (Neural Telemetry style)
 */

import type { GistRecord } from '../services/db';
import gistStore from '../stores/gist-store';
import { toast } from './ui/toast';
import { showConfirmDialog } from '../utils/dialog';
import { sanitizeHtml } from '../services/security/dom';

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'JUST NOW';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}M AGO`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}H AGO`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}D AGO`;
}

const cardCache = new Map<string, { html: string; updatedAt: string }>();

export function renderCard(gist: GistRecord): string {
  const cached = cardCache.get(gist.id);
  if (cached && cached.updatedAt === gist.updatedAt) return cached.html;

  const fileCount = Object.keys(gist.files).length;
  const firstFile = Object.values(gist.files)[0];
  const language = firstFile?.language || 'TEXT';
  const description = gist.description || 'UNTITLED GIST';

  // Get snippet of content if available
  const content = firstFile?.content || '';
  const snippet = content.slice(0, 120);

  const html = `
    <article class="glass-card gist-card${gist.starred ? ' featured' : ''}" data-gist-id="${sanitizeHtml(gist.id)}" data-testid="gist-item" tabindex="0" role="button"
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
        <time class="micro-label" datetime="${gist.updatedAt}">
          ${formatRelativeTime(gist.updatedAt)}
        </time>
      </footer>
    </article>
  `;

  cardCache.set(gist.id, { html, updatedAt: gist.updatedAt });
  return html;
}

export function bindCardEvents(container: HTMLElement, onCardClick?: (id: string) => void): void {
  if (container.dataset.eventsBound === 'true') return;

  container.addEventListener('click', (e) => {
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
  });

  container.dataset.eventsBound = 'true';
}
