/**
 * Gist Detail Component
 * Renders full gist content with file tabs and actions
 */

import type { GistRecord } from '../services/db';
import { getGist, saveGist } from '../services/db';
import * as GitHub from '../services/github';
import { toast } from './ui/toast';
import gistStore from '../stores/gist-store';
import networkMonitor from '../services/network/offline-monitor';
import type { GitHubGist, GistRevision, GistFile } from '../types/api';

/**
 * Escape HTML
 */
function esc(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get language class for syntax highlighting (basic)
 */
function getLanguageClass(language?: string): string {
  if (!language) return 'lang-text';
  return `lang-${language.toLowerCase()}`;
}

/**
 * Render file content with line numbers
 */
function renderFileContent(content: string, language?: string): string {
  const lines = content.split('\n');
  const langClass = esc(getLanguageClass(language));

  const linesHtml = lines
    .map((line, i) => {
      const lineNum = i + 1;
      const escapedLine = esc(line);
      return `<tr><td class="line-number" data-line="${lineNum}">${lineNum}</td><td class="line-content ${langClass}">${escapedLine || ' '}</td></tr>`;
    })
    .join('');

  return `<table class="code-table"><tbody>${linesHtml}</tbody></table>`;
}

/**
 * Render file tabs
 */
function renderFileTabs(
  files: Record<string, { filename: string; language?: string }>,
  activeIndex: number
): string {
  const entries = Object.entries(files);
  if (entries.length === 1) {
    const firstEntry = entries[0];
    return `<div class="file-tabs single-file"><span class="file-tab active">${esc(firstEntry?.[1]?.filename ?? 'unknown')}</span></div>`;
  }

  return `<div class="file-tabs">${entries
    .map(
      ([key, file], index) => `
    <button class="file-tab ${index === activeIndex ? 'active' : ''}" data-file-key="${esc(key)}" data-file-index="${index}">
      ${esc(file.filename)}
    </button>
  `
    )
    .join('')}</div>`;
}

/**
 * Format file size
 */
function formatSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Render gist detail HTML
 */
export function renderGistDetail(gist: GistRecord): string {
  const title = esc(gist.description || Object.values(gist.files)[0]?.filename || 'Untitled Gist');
  const description = gist.description
    ? `<p class="gist-description">${esc(gist.description)}</p>`
    : '';
  const fileCount = Object.keys(gist.files).length;
  const visibility = gist.public ? '🌐 Public' : '🔒 Private';
  const starIcon = gist.starred ? '★' : '☆';
  const starLabel = gist.starred ? 'Unstar' : 'Star';

  const fileTabs = renderFileTabs(gist.files, 0);
  const firstFile = Object.values(gist.files)[0];
  const content = firstFile?.content
    ? renderFileContent(firstFile.content || '', firstFile.language)
    : '<p class="empty-content">No content available</p>';

  return `
    <div class="gist-detail" data-gist-id="${esc(gist.id)}">
      <div class="gist-detail-header">
        <button class="back-btn" id="gist-back-btn" aria-label="Go back">← Back</button>
        <div class="gist-detail-title">
          <h2 class="gist-title">${title}</h2>
          ${description}
        </div>
      </div>

      <div class="gist-meta-bar">
        <span class="meta-item">${visibility}</span>
        <span class="meta-item">📄 ${fileCount} file${fileCount !== 1 ? 's' : ''}</span>
        <span class="meta-item">🕒 Updated ${new Date(gist.updatedAt).toLocaleDateString()}</span>
        <div class="gist-detail-actions">
          <button class="action-btn star-btn ${gist.starred ? 'starred' : ''}" data-action="star" aria-label="${starLabel}">
            ${starIcon} ${starLabel}
          </button>
          <button class="action-btn fork-btn" data-action="fork" aria-label="Fork gist">
            🍴 Fork
          </button>
          <button class="action-btn edit-btn" data-action="edit" aria-label="Edit gist">
            ✏️ Edit
          </button>
          <button class="action-btn revisions-btn" data-action="revisions" aria-label="View revisions">
            📜 Revisions
          </button>
          <a href="${esc(gist.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="action-btn github-btn" aria-label="Open on GitHub">
            🔗 GitHub
          </a>
        </div>
      </div>

      ${fileTabs}

      <div class="file-content-area" id="file-content-area">
        ${content}
      </div>

      <div class="file-info" id="file-info">
        ${firstFile ? `<span>Language: ${esc(firstFile.language || 'Unknown')}</span><span>Size: ${formatSize(firstFile.size)}</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * Render revisions list HTML
 */
export function renderRevisionsList(revisions: GistRevision[], gistId: string): string {
  if (revisions.length === 0) {
    return `
      <div class="revisions-list">
        <div class="revisions-header">
          <button class="back-btn" id="gist-back-btn" aria-label="Go back">← Back</button>
          <h2>Revisions</h2>
        </div>
        <div class="empty-state"><p>No revisions found</p></div>
      </div>
    `;
  }

  const revisionsHtml = revisions
    .map((rev) => {
      const date = new Date(rev.committed_at).toLocaleString();
      const changes = Object.entries(rev.change_summary || {})
        .map(([file, change]) => {
          const status = change.status;
          const icon = status === 'added' ? '➕' : status === 'deleted' ? '❌' : '✏️';
          return `${icon} ${esc(file)}`;
        })
        .join(', ');

      return `
      <div class="revision-item">
        <div class="revision-meta">
          <span class="revision-user">${esc(rev.user.login)}</span>
          <span class="revision-date">${date}</span>
          <span class="revision-version">${rev.version.slice(0, 8)}</span>
        </div>
        ${changes ? `<div class="revision-changes">${changes}</div>` : ''}
        <a href="${esc(rev.url)}" target="_blank" rel="noopener noreferrer" class="revision-link">View on GitHub</a>
      </div>
    `;
    })
    .join('');

  return `
    <div class="revisions-list" data-gist-id="${esc(gistId)}">
      <div class="revisions-header">
        <button class="back-btn" id="gist-back-btn" aria-label="Go back">← Back</button>
        <h2>Revisions (${revisions.length})</h2>
      </div>
      ${revisionsHtml}
    </div>
  `;
}

/**
 * Bind event listeners for gist detail
 */
export function bindDetailEvents(
  container: HTMLElement,
  onBack: () => void,
  onEdit: (id: string) => void,
  onRevisions: (id: string) => void
): void {
  const gistId =
    container.getAttribute('data-gist-id') ||
    container.querySelector('[data-gist-id]')?.getAttribute('data-gist-id');

  // Back button
  container.querySelector('#gist-back-btn')?.addEventListener('click', onBack);

  // Star button
  container.querySelector('[data-action="star"]')?.addEventListener('click', async () => {
    if (!gistId) return;

    const btn = container.querySelector('[data-action="star"]') as HTMLElement;
    btn.style.pointerEvents = 'none';
    const ok = await gistStore.toggleStar(gistId);
    btn.style.pointerEvents = '';

    if (ok) {
      // Re-render to update star state
      const gist = gistStore.getGist(gistId);
      if (gist) {
        const mainEl = container.closest('.app-main') || container.parentElement;
        if (mainEl) {
          container.innerHTML = renderGistDetail(gist);
          bindDetailEvents(container, onBack, onEdit, onRevisions);
        }
      }
      const updatedGist = gistStore.getGist(gistId);
      toast.success(updatedGist?.starred ? 'Starred' : 'Unstarred');
    } else {
      toast.error('Failed to toggle star');
    }
  });

  // Fork button
  container.querySelector('[data-action="fork"]')?.addEventListener('click', async () => {
    if (!gistId) return;

    if (!confirm('Fork this gist? A copy will be created in your account.')) return;

    const btn = container.querySelector('[data-action="fork"]') as HTMLButtonElement;
    btn.style.pointerEvents = 'none';
    btn.disabled = true;

    try {
      const forked = await GitHub.forkGist(gistId);
      toast.success(`Forked successfully! View at ${forked.html_url}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fork gist');
    } finally {
      btn.style.pointerEvents = '';
      btn.disabled = false;
    }
  });

  // Edit button
  container.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
    if (gistId) onEdit(gistId);
  });

  // Revisions button
  container.querySelector('[data-action="revisions"]')?.addEventListener('click', () => {
    if (gistId) onRevisions(gistId);
  });

  // File tabs
  container.querySelectorAll('.file-tab:not(.single-file)').forEach((tab) => {
    tab.addEventListener('click', () => {
      const key = (tab as HTMLElement).getAttribute('data-file-key');
      if (!key || !gistId) return;

      // Update active tab
      container.querySelectorAll('.file-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      // Update content
      const gist = gistStore.getGist(gistId);
      if (!gist || !gist.files[key]) return;

      const file = gist.files[key];
      const contentArea = container.querySelector('#file-content-area');
      const fileInfo = container.querySelector('#file-info');

      if (contentArea) {
        contentArea.innerHTML = file.content
          ? renderFileContent(file.content, file.language)
          : '<p class="empty-content">No content available</p>';
      }

      if (fileInfo) {
        fileInfo.innerHTML = `<span>Language: ${esc(file.language || 'Unknown')}</span><span>Size: ${formatSize(file.size)}</span>`;
      }
    });
  });
}

/**
 * Convert GitHub API gist to local record
 */
function apiGistToRecord(
  apiGist: GitHubGist,
  filesWithContent: Record<string, GistFile & { content?: string }>
): GistRecord {
  return {
    id: apiGist.id,
    description: apiGist.description,
    files: filesWithContent,
    htmlUrl: apiGist.html_url,
    gitPullUrl: apiGist.git_pull_url,
    gitPushUrl: apiGist.git_push_url,
    createdAt: apiGist.created_at,
    updatedAt: apiGist.updated_at,
    starred: false,
    public: apiGist.public,
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
  } as GistRecord;
}

/**
 * Load and render a specific gist detail
 */
export async function loadGistDetail(
  gistId: string,
  container: HTMLElement,
  onBack: () => void,
  onEdit: (id: string) => void,
  onRevisions: (id: string) => void
): Promise<void> {
  try {
    // Try local cache first
    let gist = await getGist(gistId);

    // If online, fetch fresh data from GitHub
    if (networkMonitor.isOnline()) {
      const apiGist = await GitHub.getGist(gistId);

      // Fetch file content from raw URLs
      const filesWithContent: Record<string, GistFile & { content?: string }> = {};
      await Promise.all(
        Object.entries(apiGist.files).map(async ([key, file]) => {
          if (file.raw_url && (!file.size || file.size < 1024 * 1024)) {
            try {
              const resp = await fetch(file.raw_url);
              if (resp.ok) {
                file.content = await resp.text();
              }
            } catch {
              file.content = '// Failed to load content';
            }
          }
          filesWithContent[key] = file;
        })
      );

      gist = apiGistToRecord(apiGist, filesWithContent);

      // Cache in IndexedDB
      await saveGist(gist);
    }

    if (!gist) {
      container.innerHTML = '<div class="empty-state"><p>Gist not found</p></div>';
      return;
    }

    // Set gist ID on container for event binding
    container.setAttribute('data-gist-id', gist.id);
    container.innerHTML = renderGistDetail(gist);
    bindDetailEvents(container, onBack, onEdit, onRevisions);
  } catch (err) {
    container.innerHTML = `
      <div class="error-state">
        <p>Failed to load gist: ${esc(err instanceof Error ? err.message : 'Unknown error')}</p>
        <button class="retry-btn secondary-btn" id="retry-load-gist">Retry</button>
        <button class="back-btn" id="retry-back-btn">← Back</button>
      </div>
    `;
    container
      .querySelector('#retry-load-gist')
      ?.addEventListener('click', () =>
        loadGistDetail(gistId, container, onBack, onEdit, onRevisions)
      );
    container.querySelector('#retry-back-btn')?.addEventListener('click', onBack);
  }
}
