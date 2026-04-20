import os

detail_content = r"""/**
 * Gist Detail Component
 * Renders full gist content, metadata, and files
 */

import { GistRecord, getGist, saveGist, GistFile } from '../services/db';
import { GistRevision, GitHubGist } from '../types/api';
// skipcq: JS-C1003
import * as GitHub from '../services/github/client';
import gistStore from '../stores/gist-store';
import { toast } from './ui/toast';
import { EmptyState } from './ui/empty-state';
import networkMonitor from '../services/network/offline-monitor';
import { ErrorBoundary } from './ui/error-boundary';
import { AppError } from '../services/github/error-handler';
import { announcer } from '../utils/announcer';

/**
 * Escape HTML
 */
const esc = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Format file size
 */
export function formatSize(bytes?: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Render file content with simple highlighting placeholder
 */
export function renderFileContent(content: string, language?: string): string {
  return `
    <pre class="code-block language-${esc(language || 'text')}">
      <code>${esc(content)}</code>
    </pre>
  `;
}

/**
 * Render full gist detail HTML
 */
export function renderGistDetail(gist: GistRecord): string {
  const title = gist.description || 'Untitled Gist';
  const description = gist.description
    ? `<p class="gist-description-text">${esc(gist.description)}</p>`
    : '';
  const fileCount = Object.keys(gist.files).length;
  const visibilityMap: Record<string, string> = { 'true': 'Public', 'false': 'Secret' };
  const visibility = visibilityMap[String(gist.public)];
  const starredMap: Record<string, { icon: string; label: string }> = {
    'true': { icon: '★', label: 'Unstar' },
    'false': { icon: '☆', label: 'Star' },
  };
  const starState = starredMap[String(gist.starred)] || starredMap['false'];
  const { icon: starIcon, label: starLabel } = starState!;

  const fileTabs =
    fileCount > 1
      ? `
    <div class="file-tabs scroll-x" role="tablist">
      ${Object.entries(gist.files)
        .map(
          ([key, file], index) => `
        <button class="file-tab ${index === 0 ? 'active' : ''}"
                data-file-key="${esc(key)}"
                id="tab-${index}"
                role="tab"
                aria-selected="${index === 0}"
                aria-controls="file-content-area">
          ${esc(file.filename)}
        </button>
      `).join('')}
    </div>
  `
      : '';

  const firstFileKey = Object.keys(gist.files)[0];
  const firstFile = firstFileKey ? gist.files[firstFileKey] : null;
  const content = firstFile?.content
    ? renderFileContent(firstFile.content, firstFile.language)
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

      <div class="file-content-area" id="file-content-area" role="tabpanel" aria-labelledby="tab-0">
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
        ${EmptyState.render({ title: 'No Revisions', description: "This gist doesn't have any previous versions.", icon: '📜' })}
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
        container.innerHTML = renderGistDetail(gist);
        bindDetailEvents(container, onBack, onEdit, onRevisions);
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

    const confirmed = window.confirm('Fork this gist? A copy will be created in your account.');
    if (!confirmed) return;

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
      container.querySelectorAll('.file-tab').forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

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
        contentArea.setAttribute('aria-labelledby', tab.id);
        announcer.announce(`Displaying file: ${file.filename}`);
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
const apiGistToRecord = (
  apiGist: GitHubGist,
  filesWithContent: Record<string, GistFile & { content?: string }>
): GistRecord => {
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
};

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
      const MAX_SIZE = 1024 * 1024;
      await Promise.all(
        Object.entries(apiGist.files).map(async ([key, file]) => {
          if (file.raw_url && (!file.size || file.size < MAX_SIZE)) {
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
      container.innerHTML = EmptyState.render({
        title: 'Gist Not Found',
        description: 'The gist you are looking for might have been deleted or is inaccessible.',
        actionLabel: 'Go Home',
        actionRoute: 'home',
        icon: '🔍',
      });
      return;
    }

    // Set gist ID on container for event binding
    container.setAttribute('data-gist-id', gist.id);
    container.innerHTML = renderGistDetail(gist);
    bindDetailEvents(container, onBack, onEdit, onRevisions);
  } catch (err) {
    container.innerHTML = ErrorBoundary.render(err as AppError, () => {
      loadGistDetail(gistId, container, onBack, onEdit, onRevisions);
    });
    ErrorBoundary.bindEvents(container, () => {
      loadGistDetail(gistId, container, onBack, onEdit, onRevisions);
    });

    // Fallback back button if not handled by ErrorBoundary
    if (!container.querySelector('#error-retry-btn')) {
      const backBtn = document.createElement('button');
      backBtn.className = 'back-btn';
      backBtn.textContent = '← Back';
      backBtn.onclick = onBack;
      container.appendChild(backBtn);
    }
  }
}
"""

store_content = r"""/**
 * Gist Store
 * Manages local and remote gist state, including sync and optimistic updates.
 */

import {
  GistRecord,
  getAllGists as dbListGists,
  saveGist as dbSaveGist,
  deleteGist as dbDeleteGist,
} from '../services/db';
import { GitHubGist, GistFile } from '../types/api';
// skipcq: JS-C1003
import * as GitHub from '../services/github/client';
import { listStarredGists } from '../services/github/client';
import networkMonitor from '../services/network/offline-monitor';
import syncQueue from '../services/sync/queue';
import { detectConflict, resolveConflict } from '../services/sync/conflict-detector';
import { AppError } from '../services/github/error-handler';
import { safeError } from '../services/security/logger';

export type GistListener = (gists: GistRecord[]) => void;

class GistStore {
  private gists: GistRecord[] = [];
  private listeners: GistListener[] = [];
  public isLoading = false;
  public error: string | null = null;
  public lastError: AppError | null = null;

  /**
   * Subscribe to gist changes
   */
  subscribe(listener: GistListener): () => void {
    this.listeners.push(listener);
    listener(this.gists);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Get all gists
   */
  getGists(): GistRecord[] {
    return this.gists;
  }

  /**
   * Get a specific gist by ID
   */
  getGist(id: string): GistRecord | undefined {
    return this.gists.find((g) => g.id === id);
  }

  getLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Initialize store from local DB
   */
  async init(): Promise<void> {
    this.isLoading = true;
    this.notifyListeners();
    try {
      this.gists = await dbListGists();
      this.sortGists();
    } catch (err) {
      safeError('[GistStore] Failed to initialize from DB:', err);
    } finally {
      this.isLoading = false;
      this.notifyListeners();
    }
  }

  /**
   * Load gists from GitHub
   */
  async loadGists(refresh = false): Promise<void> {
    if (this.isLoading && !refresh) return;

    this.isLoading = true;
    this.error = null;
    this.lastError = null;
    this.notifyListeners();

    try {
      if (!networkMonitor.isOnline()) {
        throw new Error('Network is offline');
      }

      const [ownGists, starredGists] = await Promise.all([
        GitHub.listGists(),
        listStarredGists(),
      ]);

      const starredIds = new Set(starredGists.map((g) => g.id));

      if (refresh) {
        this.gists = [];
      }

      for (const gist of ownGists) {
        const isStarred = starredIds.has(gist.id);
        const existing = this.getGist(gist.id);

        let record: GistRecord;
        if (existing) {
          const conflict = detectConflict(existing, gist);
          if (conflict) {
            record = resolveConflict(conflict, 'remote-wins');
          } else {
            record = GistStore.githubGistToRecord(gist, isStarred);
          }
        } else {
          record = GistStore.githubGistToRecord(gist, isStarred);
        }

        await dbSaveGist(record);
        this.mergeGistRecord(record, isStarred, true);
      }

      for (const gist of starredGists) {
        const existing = this.getGist(gist.id);
        if (!existing) {
          const record = GistStore.githubGistToRecord(gist, true);
          await dbSaveGist(record);
          this.mergeGistRecord(record, true, true);
        }
      }

      this.sortGists();
      this.notifyListeners();
    } catch (err) {
      safeError('[GistStore] Failed to load gists:', err);
      this.error = err instanceof Error ? err.message : 'Failed to load gists';
      this.lastError = err as AppError;
      this.notifyListeners();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Refresh gists from server
   */
  async refreshGists(): Promise<void> {
    await this.loadGists(true);
  }

  /**
   * Create a new gist
   */
  async createGist(
    description: string,
    public_: boolean,
    files: Record<string, string>
  ): Promise<GistRecord | null> {
    this.isLoading = true;
    this.notifyListeners();

    try {
      const payload = {
        description,
        public: public_,
        files: Object.fromEntries(
          Object.entries(files).map(([filename, content]) => [filename, { content }])
        ),
      };

      if (networkMonitor.isOnline()) {
        const gist = await GitHub.createGist(payload);
        const record = GistStore.githubGistToRecord(gist);
        await dbSaveGist(record);

        this.gists.unshift(record);
        this.notifyListeners();
        return record;
      } else {
        await syncQueue.queueOperation('pending', 'create', payload);

        const tempId = `temp_${Date.now()}`;
        const filesRecord: Record<string, GistFile> = Object.fromEntries(
          Object.entries(files).map(([filename, content]) => [filename, { filename, content }])
        );
        const optimisticRecord: GistRecord = {
          id: tempId,
          description,
          files: filesRecord,
          htmlUrl: '',
          gitPullUrl: '',
          gitPushUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          starred: false,
          public: public_,
          syncStatus: 'pending',
        };

        this.gists.unshift(optimisticRecord);
        this.notifyListeners();
        return optimisticRecord;
      }
    } catch (err) {
      safeError('[GistStore] Failed to create gist:', err);
      this.error = err instanceof Error ? err.message : 'Failed to create gist';
      this.lastError = err as AppError;
      this.notifyListeners();
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Update an existing gist
   */
  async updateGist(
    id: string,
    updates: { description?: string; public?: boolean; files?: Record<string, string> }
  ): Promise<boolean> {
    try {
      const payload: Record<string, unknown> = {};
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.public !== undefined) payload.public = updates.public;
      if (updates.files !== undefined) {
        payload.files = Object.fromEntries(
          Object.entries(updates.files).map(([filename, content]) => [filename, { content }])
        );
      }

      if (networkMonitor.isOnline()) {
        const gist = await GitHub.updateGist(id, payload);
        const record = GistStore.githubGistToRecord(gist);
        await dbSaveGist(record);

        const index = this.gists.findIndex((g) => g.id === id);
        if (index !== -1) {
          this.gists[index] = record;
          this.notifyListeners();
        }
        return true;
      } else {
        await syncQueue.queueOperation(id, 'update', payload);

        const index = this.gists.findIndex((g) => g.id === id);
        const existingGist = this.gists[index];
        if (index !== -1 && existingGist) {
          const updatedGist: GistRecord = {
            ...existingGist,
            ...(updates.description !== undefined && { description: updates.description }),
            ...(updates.public !== undefined && { public: updates.public }),
            syncStatus: 'pending',
            updatedAt: new Date().toISOString(),
          };
          this.gists[index] = updatedGist;
          this.notifyListeners();
        }
        return true;
      }
    } catch (err) {
      safeError('[GistStore] Failed to update gist:', err);
      this.error = err instanceof Error ? err.message : 'Failed to update gist';
      this.lastError = err as AppError;
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Delete a gist
   */
  async deleteGist(id: string): Promise<boolean> {
    try {
      if (networkMonitor.isOnline()) {
        await GitHub.deleteGist(id);
        await dbDeleteGist(id);

        this.gists = this.gists.filter((g) => g.id !== id);
        this.notifyListeners();
        return true;
      } else {
        await syncQueue.queueOperation(id, 'delete', {});
        this.gists = this.gists.filter((g) => g.id !== id);
        this.notifyListeners();
        return true;
      }
    } catch (err) {
      safeError('[GistStore] Failed to delete gist:', err);
      this.error = err instanceof Error ? err.message : 'Failed to delete gist';
      this.lastError = err as AppError;
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Star/unstar a gist
   */
  async toggleStar(id: string): Promise<boolean> {
    const gist = this.gists.find((g) => g.id === id);
    if (!gist) return false;

    try {
      const shouldStar = !gist.starred;
      if (networkMonitor.isOnline()) {
        if (shouldStar) await GitHub.starGist(id);
        else await GitHub.unstarGist(id);

        gist.starred = shouldStar;
        await dbSaveGist(gist);
      } else {
        await syncQueue.queueOperation(id, shouldStar ? 'star' : 'unstar', {});
        gist.starred = shouldStar;
        gist.syncStatus = 'pending';
      }

      this.notifyListeners();
      return true;
    } catch (err) {
      safeError('[GistStore] Failed to toggle star:', err);
      this.error = err instanceof Error ? err.message : 'Failed to toggle star';
      this.lastError = err as AppError;
      this.notifyListeners();
      return false;
    }
  }

  filterGists(filter: 'all' | 'mine' | 'starred'): GistRecord[] {
    switch (filter) {
      case 'starred':
        return this.gists.filter((g) => g.starred);
      case 'mine':
        return this.gists.filter((g) => !g.starred);
      default:
        return this.gists;
    }
  }

  searchGists(query: string): GistRecord[] {
    if (!query.trim()) return this.gists;
    const lowerQuery = query.toLowerCase();
    return this.gists.filter((gist) => {
      const descriptionMatch = gist.description?.toLowerCase().includes(lowerQuery);
      const fileMatch = Object.values(gist.files).some(
        (file) =>
          file.filename.toLowerCase().includes(lowerQuery) ||
          file.content?.toLowerCase().includes(lowerQuery)
      );
      return descriptionMatch || fileMatch;
    });
  }

  /**
   * Convert GitHub API gist to local record
   */
  private static githubGistToRecord(gist: GitHubGist, starred = false): GistRecord {
    return {
      id: gist.id,
      description: gist.description,
      files: Object.fromEntries(
        Object.entries(gist.files).map(([key, file]) => [
          key,
          {
            filename: file.filename,
            type: file.type,
            language: file.language,
            rawUrl: file.raw_url,
            size: file.size,
            truncated: file.truncated,
          },
        ])
      ),
      htmlUrl: gist.html_url,
      gitPullUrl: gist.git_pull_url,
      gitPushUrl: gist.git_push_url,
      createdAt: gist.created_at,
      updatedAt: gist.updated_at,
      starred,
      public: gist.public,
      syncStatus: 'synced',
      lastSyncedAt: new Date().toISOString(),
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.gists));
  }

  private sortGists(): void {
    this.gists.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  private mergeGistRecord(record: GistRecord, starred: boolean, skipSort = false): void {
    const finalRecord = starred ? { ...record, starred } : record;
    const existingIndex = this.gists.findIndex((g) => g.id === record.id);

    if (existingIndex >= 0) {
      const existingGist = this.gists[existingIndex];
      finalRecord.starred = (existingGist?.starred ?? false) || starred;
      this.gists[existingIndex] = finalRecord;
    } else {
      this.gists.push(finalRecord);
    }

    if (!skipSort) {
      this.sortGists();
    }
  }
}

const gistStore = new GistStore();
export default gistStore;
"""

with open('src/components/gist-detail.ts', 'w') as f:
    f.write(detail_content)

with open('src/stores/gist-store.ts', 'w') as f:
    f.write(store_content)
