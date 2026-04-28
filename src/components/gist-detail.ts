/**
 * Gist Detail Component
 * Redesigned for App Mode
 */

import { GistRecord } from '../types';
import { GistRevision } from '../types/api';
import * as GitHub from '../services/github/client';
import { toast } from './ui/toast';
import { safeError } from '../services/security/logger';
import DOMPurify from 'dompurify';
import { html } from '../services/security/dom';

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function renderFileContent(content: string, language?: string): string {
  return html`<pre class="code-block language-${language || 'text'}"><code>${content}</code></pre>`;
}

function renderGistHeader(gist: GistRecord, title: string, fileCount: number): string {
  const visibility = gist.public ? 'Public' : 'Secret';
  const starLabel = gist.starred ? 'Unstar' : 'Star';
  const starIcon = gist.starred ? '★' : '☆';

  return html` <header class="detail-header">
    <div class="header-top">
      <button class="btn btn-ghost" id="gist-back-btn" aria-label="Go back">← Back</button>
      <span class="micro-label">Gist Detail</span>
    </div>
    <h1 class="detail-title">${title}</h1>
    <div class="detail-meta-row">
      <span class="detail-chip">${fileCount} Files</span>
      <span class="detail-chip">${visibility}</span>
      <time class="micro-label" datetime="${gist.updatedAt}">
        Updated ${formatRelativeTime(gist.updatedAt)}
      </time>
    </div>
    <div class="gist-detail-actions">
      <button class="btn ${gist.starred ? 'btn-danger' : 'btn-primary'}" data-action="star">
        ${starIcon} ${starLabel}
      </button>
      <button class="btn btn-ghost" data-action="fork">🍴 Fork</button>
      <button class="btn btn-ghost" data-action="edit">✏️ Edit</button>
      <button class="btn btn-ghost" data-action="revisions">📜 Revisions</button>
    </div>
  </header>`;
}

function renderFileTabs(gist: GistRecord, fileCount: number): string {
  if (fileCount <= 1) return '';
  return html` <div class="file-tabs scroll-x" role="tablist">
    ${Object.entries(gist.files)
      .map(
        ([key, file], index) => `
        <button class="chip file-tab ${index === 0 ? 'active' : ''}" data-file-key="${key}" id="tab-${index}" role="tab" aria-selected="${index === 0}" aria-controls="file-content-area">
          ${file.filename.toUpperCase()}
        </button>
      `
      )
      .join('')}
  </div>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderFileInfo(firstFile: any): string {
  if (!firstFile) return '';
  return html`
    <span class="micro-label">Language: ${firstFile.language || 'Unknown'}</span>
    <span class="micro-label"
      >Raw URL: <a href="${firstFile.rawUrl || ''}" target="_blank">Link</a></span
    >
  `;
}

export function renderGistDetail(gist: GistRecord): string {
  const title = gist.description || 'Untitled Gist';
  const fileCount = Object.keys(gist.files).length;

  const firstFileKey = Object.keys(gist.files)[0];
  const firstFile = firstFileKey ? gist.files[firstFileKey] : null;
  const content = firstFile?.content
    ? renderFileContent(firstFile.content, firstFile.language)
    : '<p class="empty-content">No content available</p>';

  return `
    <div class="gist-detail" data-gist-id="${gist.id}">
      ${renderGistHeader(gist, title, fileCount)} ${renderFileTabs(gist, fileCount)}

      <div class="file-content-area" id="file-content-area" role="tabpanel" aria-labelledby="tab-0">
        ${content}
      </div>

      <div class="file-info" id="file-info">${renderFileInfo(firstFile)}</div>
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
    container.innerHTML = DOMPurify.sanitize(renderGistDetail(gist as unknown as GistRecord));
    bindDetailEvents(container, { onBack, onEdit, onViewRevision });
  } catch (err) {
    safeError('[GistDetail] Failed to load gist', err);
    toast.error('Failed to load gist details');
  }
}

export function renderRevisions(gistId: string, revisions: GistRevision[]): string {
  const revisionsHtml = revisions
    .map((rev) => {
      const date = new Date(rev.committed_at).toLocaleString();
      return html`
        <div class="revision-item glass-card" data-version="${rev.version}">
          <div class="revision-meta">
            <span class="stat-number">${date}</span>
            <span class="micro-label">By ${rev.user?.login || 'Unknown'}</span>
          </div>
          <button
            class="btn btn-ghost btn-sm"
            data-action="view-revision"
            data-version="${rev.version}"
          >
            View
          </button>
        </div>
      `;
    })
    .join('');

  return `
    <div class="revisions-list" data-gist-id="${gistId}">
      <header class="detail-header">
        <button class="btn btn-ghost" id="gist-back-btn">← Back</button>
        <h1 class="detail-title">Revisions (${revisions.length})</h1>
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

  container.querySelector('[data-action="revisions"]')?.addEventListener('click', () => {
    void (async () => {
      if (!gistId) return;
      try {
        const revisions = await GitHub.listGistRevisions(gistId);
        container.innerHTML = DOMPurify.sanitize(renderRevisions(gistId, revisions));
        bindRevisionEvents(container, {
          onBack: () => void loadGistDetail(gistId, container, onBack, onEdit, onViewRevision),
          onViewRevision,
        });
      } catch {
        toast.error('Failed to load revisions');
      }
    })();
  });

  // Star button
  container.querySelector('[data-action="star"]')?.addEventListener('click', () => {
    void (async () => {
      if (!gistId) return;
      const ok = await (await import('../stores/gist-store')).default.toggleStar(gistId);
      if (ok) void loadGistDetail(gistId, container, onBack, onEdit, onViewRevision);
    })();
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
  container.querySelector('#gist-back-btn')?.addEventListener('click', () => onBack());
  container.querySelectorAll('[data-action="view-revision"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const version = (e.currentTarget as HTMLElement).getAttribute('data-version');
      if (gistId && version) onViewRevision(gistId, version);
    });
  });
}
