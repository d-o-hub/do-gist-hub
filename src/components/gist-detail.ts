/**
 * Gist Detail Component
 * Redesigned for App Mode
 */

import { GistRecord } from '../types';
import { GistRevision } from '../types/api';
import * as GitHub from '../services/github/client';
import { toast } from './ui/toast';
import { safeError } from '../services/security/logger';

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

const esc = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export function renderFileContent(content: string, language?: string): string {
  return `<pre class="code-block language-${esc(language || 'text')}"><code>${esc(content)}</code></pre>`;
}

export function renderGistDetail(gist: GistRecord): string {
  const title = gist.description || 'UNTITLED GIST';
  const fileCount = Object.keys(gist.files).length;
  const visibility = gist.public ? 'PUBLIC' : 'SECRET';
  const starLabel = gist.starred ? 'UNSTAR' : 'STAR';
  const starIcon = gist.starred ? '★' : '☆';

  const fileTabs =
    fileCount > 1
      ? `
    <div class="file-tabs scroll-x" role="tablist">
      ${Object.entries(gist.files)
        .map(
          ([key, file], index) => `
        <button class="chip file-tab ${index === 0 ? 'active' : ''}" data-file-key="${esc(key)}" id="tab-${index}" role="tab" aria-selected="${index === 0}" aria-controls="file-content-area">
          ${esc(file.filename.toUpperCase())}
        </button>
      `
        )
        .join('')}
    </div>`
      : '';

  const firstFileKey = Object.keys(gist.files)[0];
  const firstFile = firstFileKey ? gist.files[firstFileKey] : null;
  const content = firstFile?.content
    ? renderFileContent(firstFile.content, firstFile.language)
    : '<p class="empty-content">NO CONTENT AVAILABLE</p>';

  return `
    <div class="gist-detail" data-gist-id="${esc(gist.id)}">
      <header class="detail-header">
        <div class="header-top">
          <button class="btn btn-ghost" id="gist-back-btn" aria-label="Go back">← BACK</button>
          <span class="micro-label">GIST DETAIL</span>
        </div>
        <h1 class="detail-title">${esc(title.toUpperCase())}</h1>
        <div class="detail-meta-row">
          <span class="detail-chip">${fileCount} FILES</span>
          <span class="detail-chip">${visibility}</span>
          <time class="micro-label" datetime="${gist.updatedAt}">
            UPDATED ${formatRelativeTime(gist.updatedAt)}
          </time>
        </div>
        <div class="gist-detail-actions">
          <button class="btn ${gist.starred ? 'btn-danger' : 'btn-primary'}" data-action="star">
            ${starIcon} ${starLabel}
          </button>
          <button class="btn btn-ghost" data-action="fork">🍴 FORK</button>
          <button class="btn btn-ghost" data-action="edit">✏️ EDIT</button>
          <button class="btn btn-ghost" data-action="revisions">📜 REVISIONS</button>
        </div>
      </header>

      ${fileTabs}

      <div class="file-content-area" id="file-content-area" role="tabpanel" aria-labelledby="tab-0">
        ${content}
      </div>

      <div class="file-info" id="file-info">
        ${
          firstFile
            ? `
          <span class="micro-label">LANGUAGE: ${esc(firstFile.language || 'UNKNOWN')}</span>
          <span class="micro-label">RAW URL: <a href="${esc(firstFile.rawUrl || '')}" target="_blank">LINK</a></span>
        `
            : ''
        }
      </div>
    </div>
  `;
}

export async function loadGistDetail(
  id: string,
  container: HTMLElement,
  onBack: () => void,
  onEdit: (id: string) => void,
  onViewRevision: (id: string, version: string) => void
): Promise<void> {
  try {
    const gist = await GitHub.getGist(id);
    container.innerHTML = renderGistDetail(gist as unknown as GistRecord);
    bindDetailEvents(container, { onBack, onEdit, onViewRevision });
  } catch (err) {
    safeError('[GistDetail] Failed to load gist', err);
    toast.error('FAILED TO LOAD GIST DETAILS');
  }
}

export function renderRevisions(gistId: string, revisions: GistRevision[]): string {
  const revisionsHtml = revisions
    .map((rev) => {
      const date = new Date(rev.committed_at).toLocaleString();
      return `
      <div class="revision-item glass-card" data-version="${esc(rev.version)}">
        <div class="revision-meta">
          <span class="stat-number">${date.toUpperCase()}</span>
          <span class="micro-label">BY ${esc(rev.user?.login || 'UNKNOWN').toUpperCase()}</span>
        </div>
        <button class="btn btn-ghost btn-sm" data-action="view-revision" data-version="${esc(rev.version)}">VIEW</button>
      </div>
    `;
    })
    .join('');

  return `
    <div class="revisions-list" data-gist-id="${esc(gistId)}">
      <header class="detail-header">
        <button class="btn btn-ghost" id="gist-back-btn">← BACK</button>
        <h1 class="detail-title">REVISIONS (${revisions.length})</h1>
      </header>
      <div class="revisions-container">${revisionsHtml}</div>
    </div>
  `;
}

export function bindDetailEvents(
  container: HTMLElement,
  {
    onBack,
    onEdit,
    onViewRevision,
  }: {
    onBack: () => void;
    onEdit: (id: string) => void;
    onViewRevision: (id: string, version: string) => void;
  }
): void {
  const gistId = container.querySelector('.gist-detail')?.getAttribute('data-gist-id');
  container.querySelector('#gist-back-btn')?.addEventListener('click', onBack);
  container.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
    if (gistId) onEdit(gistId);
  });

  container.querySelector('[data-action="revisions"]')?.addEventListener('click', async () => {
    if (!gistId) return;
    try {
      const revisions = await GitHub.listGistRevisions(gistId);
      container.innerHTML = renderRevisions(gistId, revisions);
      bindRevisionEvents(container, {
        onBack: () => loadGistDetail(gistId, container, onBack, onEdit, onViewRevision),
        onViewRevision,
      });
    } catch {
      toast.error('FAILED TO LOAD REVISIONS');
    }
  });

  // Star button
  container.querySelector('[data-action="star"]')?.addEventListener('click', async () => {
    if (!gistId) return;
    const ok = await (await import('../stores/gist-store')).default.toggleStar(gistId);
    if (ok) loadGistDetail(gistId, container, onBack, onEdit, onViewRevision);
  });
}

function bindRevisionEvents(
  container: HTMLElement,
  {
    onBack,
    onViewRevision,
  }: { onBack: () => void; onViewRevision: (id: string, version: string) => void }
): void {
  const gistId = container.querySelector('.revisions-list')?.getAttribute('data-gist-id');
  container.querySelector('#gist-back-btn')?.addEventListener('click', onBack);
  container.querySelectorAll('[data-action="view-revision"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const version = (e.currentTarget as HTMLElement).getAttribute('data-version');
      if (gistId && version) onViewRevision(gistId, version);
    });
  });
}
