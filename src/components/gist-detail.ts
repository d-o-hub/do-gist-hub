/**
 * Gist Detail Component
 * Redesigned for App Mode
 */

import * as GitHub from '../services/github/client';
import { sanitizeHtml } from '../services/security/dom';
import { safeError } from '../services/security/logger';
import gistStore from '../stores/gist-store';
import type { GistRecord } from '../types';
import type { GistRevision } from '../types/api';
import { toast } from './ui/toast';

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
  return `<pre class="code-block language-${sanitizeHtml(language || 'text')}"><code>${sanitizeHtml(content)}</code></pre>`;
}

export function renderGistDetail(gist: GistRecord): string {
  const title = gist.description || 'Untitled Gist';
  const fileCount = Object.keys(gist.files).length;
  const visibility = gist.public ? 'Public' : 'Secret';

  const fileTabs =
    fileCount > 1
      ? `
    <div class="file-tabs scroll-x" role="tablist">
      ${Object.entries(gist.files)
        .map(
          ([key, file], index) => `
        <button class="chip file-tab ${index === 0 ? 'active' : ''}" data-file-key="${sanitizeHtml(key)}" id="tab-${index}" role="tab" aria-selected="${index === 0}" aria-controls="file-content-area">
          ${sanitizeHtml(file.filename.toUpperCase())}
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
    : '<p class="empty-content">No content available</p>';

  return `
    <div class="gist-detail" data-gist-id="${sanitizeHtml(gist.id)}">
      <header class="detail-header">
        <div class="header-top">
          <button class="btn btn-ghost" id="gist-back-btn" aria-label="Go back">← Back</button>
          <span class="micro-label">Gist Detail</span>
        </div>
        <h1 class="detail-title">${sanitizeHtml(title)}</h1>
        <div class="detail-meta-row">
          <span class="detail-chip">${fileCount} Files</span>
          <span class="detail-chip">${visibility}</span>
          <time class="micro-label" datetime="${gist.updatedAt}">
            Updated ${formatRelativeTime(gist.updatedAt)}
          </time>
        </div>
        <div class="gist-detail-actions">
          <button class="btn ${gist.starred ? 'btn-danger' : 'btn-primary'}" data-action="star">
            ${gist.starred ? 'Unstar' : 'Star'}
          </button>
          <button class="btn btn-ghost" data-action="fork">Fork</button>
          <button class="btn btn-ghost" data-action="edit">Edit</button>
          <button class="btn btn-ghost" data-action="revisions">Revisions</button>
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
          <div class="file-info-left">
            <span class="micro-label">Language: ${sanitizeHtml(firstFile.language || 'Unknown')}</span>
            <span class="micro-label">Raw URL: <a href="${sanitizeHtml(firstFile.rawUrl || '')}" target="_blank" rel="noopener noreferrer">Link</a></span>
          </div>
          <button class="btn btn-ghost btn-copy-sm" data-action="copy-content" aria-label="Copy file content">
            <span class="micro-label">COPY</span>
          </button>
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
    const gist = await gistStore.hydrateGist(id);
    if (!gist) {
      throw new Error('Gist not found');
    }
    container.innerHTML = renderGistDetail(gist);
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
      return `
      <div class="revision-item glass-card" data-version="${sanitizeHtml(rev.version)}">
        <div class="revision-meta">
          <span class="stat-number">${date}</span>
          <span class="micro-label">By ${sanitizeHtml(rev.user?.login || 'Unknown')}</span>
        </div>
        <button class="btn btn-ghost btn-sm" data-action="view-revision" data-version="${sanitizeHtml(rev.version)}">View</button>
      </div>
    `;
    })
    .join('');

  return `
    <div class="revisions-list" data-gist-id="${sanitizeHtml(gistId)}">
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
        container.innerHTML = renderRevisions(gistId, revisions);
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

  // File Tabs
  const tabs = container.querySelectorAll('.file-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const fileKey = (tab as HTMLElement).dataset.fileKey;
      if (!fileKey) return;

      // Update active tab UI
      tabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      // Update content
      void (async () => {
        if (!gistId) return;
        const gist = await (await import('../stores/gist-store')).default.getGist(gistId);
        if (!gist) return;
        const file = gist.files[fileKey];
        if (!file) return;

        const contentArea = container.querySelector('#file-content-area');
        if (contentArea) {
          contentArea.innerHTML = renderFileContent(file.content || '', file.language);
          contentArea.setAttribute('aria-labelledby', tab.id);
        }

        const infoArea = container.querySelector('#file-info');
        if (infoArea) {
          infoArea.innerHTML = `
            <div class="file-info-left">
              <span class="micro-label">Language: ${sanitizeHtml(file.language || 'Unknown')}</span>
              <span class="micro-label">Raw URL: <a href="${sanitizeHtml(file.rawUrl || '')}" target="_blank" rel="noopener noreferrer">Link</a></span>
            </div>
            <button class="btn btn-ghost btn-copy-sm" data-action="copy-content" aria-label="Copy file content">
              <span class="micro-label">COPY</span>
            </button>
          `;
        }
      })();
    });
  });

  // Copy Content
  if (container.dataset.copyBound !== 'true') {
    container.addEventListener('click', (e) => {
      const copyBtn = (e.target as HTMLElement).closest(
        '[data-action="copy-content"]'
      ) as HTMLElement;
      if (!copyBtn || copyBtn.classList.contains('btn-success')) return;

      void (async () => {
        const contentArea = container.querySelector('#file-content-area code');
        if (!contentArea) return;

        const text = contentArea.textContent || '';
        try {
          if (!navigator.clipboard) {
            throw new Error('Clipboard API not available');
          }
          await navigator.clipboard.writeText(text);

          const originalText = copyBtn.innerHTML;
          copyBtn.innerHTML = '<span class="micro-label">✅ COPIED!</span>';
          copyBtn.classList.add('btn-success');
          toast.success('COPIED TO CLIPBOARD');

          setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.classList.remove('btn-success');
          }, 2000);
        } catch (err) {
          safeError('Failed to copy', err);
          toast.error('COPY FAILED');
        }
      })();
    });
    container.dataset.copyBound = 'true';
  }
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
