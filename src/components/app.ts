/**
 * Root App Component
 * Manages routing, global layout, and gist store integration
 */

import gistStore from '../stores/gist-store';
import type { GistRecord } from '../services/db';
import { clearAllData } from '../services/db';
import { toast } from './ui/toast';
import { renderCard, bindCardEvents } from './gist-card';
import networkMonitor from '../services/network/offline-monitor';
import syncQueue from '../services/sync/queue';
import { saveToken, getToken, removeToken } from '../services/github/auth';
import { loadGistDetail, renderRevisionsList } from './gist-detail';
import { loadEditForm } from './gist-edit';
import * as GitHub from '../services/github';
import { APP } from '../config/app.config';

type Route = 'home' | 'starred' | 'create' | 'offline' | 'settings' | 'detail' | 'edit' | 'revisions';
type Filter = 'all' | 'mine' | 'starred';
type SortKey = 'updated' | 'created' | 'title';
type SortOrder = 'asc' | 'desc';

export class App {
  private container: HTMLElement | null = null;
  private currentRoute: Route = 'home';
  private currentFilter: Filter = 'all';
  private searchQuery = '';
  private unsubStore?: () => void;
  private displayedGists: GistRecord[] = [];
  private searchTimeout?: number;
  private currentSortKey: SortKey = 'updated';
  private currentSortOrder: SortOrder = 'desc';

  mount(container: HTMLElement): void {
    if (!container) throw new Error('App container not found');
    this.container = container;
    this.render();
    this.setupNavigation();
    this.subscribeStore();
  }

  private subscribeStore(): void {
    this.unsubStore?.();
    this.unsubStore = gistStore.subscribe(() => this.onStoreUpdate());
  }

  private onStoreUpdate(): void {
    if (!this.container) return;
    this.renderLoadingState();
    this.renderErrorState();
    if (this.currentRoute === 'home' || this.currentRoute === 'starred') {
      this.updateGistList();
    }
    if (this.currentRoute === 'offline') this.updateOfflineStatus();
    // Don't update detail/edit/revisions views on store changes
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = `<div class="app-shell" data-testid="app-shell">
        <!-- 2026: Desktop sidebar navigation -->
        <nav class="sidebar-nav" data-testid="sidebar-nav">
          <button class="sidebar-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home" data-testid="sidebar-home">
            <span class="sidebar-icon">📋</span>
            <span class="sidebar-label">Gists</span>
          </button>
          <button class="sidebar-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred" data-testid="sidebar-starred">
            <span class="sidebar-icon">⭐</span>
            <span class="sidebar-label">Starred</span>
          </button>
          <button class="sidebar-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create" data-testid="sidebar-create">
            <span class="sidebar-icon">➕</span>
            <span class="sidebar-label">New Gist</span>
          </button>
          <button class="sidebar-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline" data-testid="sidebar-offline">
            <span class="sidebar-icon">📴</span>
            <span class="sidebar-label">Offline</span>
          </button>
          <button class="sidebar-item ${this.currentRoute === 'settings' ? 'active' : ''}" data-route="settings" data-testid="sidebar-settings">
            <span class="sidebar-icon">⚙️</span>
            <span class="sidebar-label">Settings</span>
          </button>
        </nav>
        <header class="app-header">
          <h1 class="app-title" data-testid="app-title">${APP.name}</h1>
          <div class="header-actions">
            <!-- 2026: Sync status indicator -->
            <span id="sync-indicator" class="sync-indicator" aria-live="polite" aria-label="Sync status">
              <span class="sync-dot"></span>
            </span>
            <button id="theme-toggle" class="icon-button" aria-label="Toggle theme" data-testid="theme-toggle"><span class="icon">🌓</span></button>
            <button id="settings-btn" class="icon-button" aria-label="Settings" data-testid="settings-btn"><span class="icon">⚙️</span></button>
          </div>
        </header>
        <main class="app-main" id="main-content" data-testid="main-content">${this.getRouteContent()}</main>
        <nav class="bottom-nav" data-testid="bottom-nav">
          <button class="nav-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home" data-testid="nav-home"><span class="nav-icon">📋</span><span class="nav-label">Gists</span></button>
          <button class="nav-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred" data-testid="nav-starred"><span class="nav-icon">⭐</span><span class="nav-label">Starred</span></button>
          <button class="nav-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create" data-testid="nav-create"><span class="nav-icon">➕</span><span class="nav-label">New</span></button>
          <button class="nav-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline" data-testid="nav-offline"><span class="nav-icon">📴</span><span class="nav-label">Offline</span></button>
        </nav>
      </div>`;
    this.initializeThemeToggle();
    this.updateSyncIndicator();
  }

  private getRouteContent(): string {
    switch (this.currentRoute) {
      case 'home': return this.getHomeRoute();
      case 'starred': return this.getStarredRoute();
      case 'create': return this.getCreateRoute();
      case 'offline': return this.getOfflineRoute();
      case 'settings': return this.getSettingsRoute();
      case 'detail': return this.getDetailRoute();
      case 'edit': return this.getEditRoute();
      case 'revisions': return this.getRevisionsRoute();
      default: return this.getHomeRoute();
    }
  }

  private getHomeRoute(): string {
    return `
      <div class="route-home">
        <div class="gist-list-header">
          <input type="text" class="search-input" placeholder="Search gists..." value="${this.searchQuery}" />
          <div class="filter-buttons">
            <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
            <button class="filter-btn ${this.currentFilter === 'mine' ? 'active' : ''}" data-filter="mine">Mine</button>
            <button class="filter-btn ${this.currentFilter === 'starred' ? 'active' : ''}" data-filter="starred">Starred</button>
          </div>
          <div class="sort-controls">
            <label for="sort-select">Sort by:</label>
            <select id="sort-select" class="sort-select">
              <option value="updated-desc" ${this.currentSortKey === 'updated' && this.currentSortOrder === 'desc' ? 'selected' : ''}>Last Updated (Newest)</option>
              <option value="updated-asc" ${this.currentSortKey === 'updated' && this.currentSortOrder === 'asc' ? 'selected' : ''}>Last Updated (Oldest)</option>
              <option value="created-desc" ${this.currentSortKey === 'created' && this.currentSortOrder === 'desc' ? 'selected' : ''}>Created (Newest)</option>
              <option value="created-asc" ${this.currentSortKey === 'created' && this.currentSortOrder === 'asc' ? 'selected' : ''}>Created (Oldest)</option>
              <option value="title-asc" ${this.currentSortKey === 'title' ? 'selected' : ''}>Title (A-Z)</option>
              <option value="title-desc" ${this.currentSortKey === 'title' && this.currentSortOrder === 'desc' ? 'selected' : ''}>Title (Z-A)</option>
            </select>
          </div>
        </div>
        <div class="gist-list" id="gist-list">${this.renderGistList()}</div>
      </div>
    `;
  }

  private getStarredRoute(): string {
    return `
      <div class="route-starred">
        <h2>Starred Gists</h2>
        <div class="gist-list" id="gist-list">${this.renderGistList()}</div>
      </div>
    `;
  }

  private getCreateRoute(): string {
    return `
      <div class="route-create">
        <h2>Create New Gist</h2>
        <form id="create-gist-form" class="gist-form">
          <div class="form-group">
            <label for="gist-description">Description (optional)</label>
            <input type="text" id="gist-description" name="description" class="form-input" />
          </div>
          <div class="form-group">
            <label><input type="checkbox" id="gist-public" name="public" /> Make public</label>
          </div>
          <div class="files-section" id="files-section">
            <h3>Files</h3>
            <div class="file-editor" data-file-index="0">
              <div class="file-header">
                <input type="text" class="filename-input" placeholder="Filename (e.g., example.js)" />
                <button type="button" class="remove-file-btn" style="display: none;">×</button>
              </div>
              <textarea class="content-editor" placeholder="File content..."></textarea>
            </div>
          </div>
          <button type="button" id="add-file-btn" class="secondary-btn">+ Add File</button>
          <div class="form-actions">
            <button type="submit" class="primary-btn" id="create-submit-btn">Create Gist</button>
            <button type="button" id="cancel-create-btn" class="secondary-btn">Cancel</button>
          </div>
        </form>
      </div>
    `;
  }

  private getOfflineRoute(): string {
    const online = networkMonitor.isOnline();
    return `
      <div class="route-offline">
        <h2>Offline Mode</h2>
        <div class="offline-status">
          <div class="status-indicator ${online ? 'online' : 'offline'}">
            <span class="status-dot"></span>
            <span class="status-text">${online ? 'Online' : 'Offline'}</span>
          </div>
          <p class="last-synced">Pending operations: <span id="pending-count">checking...</span></p>
        </div>
        <div class="pending-operations" id="pending-ops">
          <h3>Pending Operations</h3>
          <div class="empty-state"><p>Checking queue...</p></div>
        </div>
        <div class="offline-actions">
          <button id="sync-now-btn" class="primary-btn">Sync Now</button>
          <button id="clear-cache-btn" class="secondary-btn">Clear Cache</button>
        </div>
      </div>
    `;
  }

  private getSettingsRoute(): string {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    return `
      <div class="route-settings">
        <h2>Settings</h2>
        <div class="settings-panel">
          <!-- 2026: Progressive disclosure with collapsible sections -->
          <details class="settings-section" open>
            <summary class="settings-section-header">
              <h3>Authentication</h3>
              <span class="section-toggle-icon">▼</span>
            </summary>
            <div class="settings-section-content">
              <div class="form-group">
                <label for="pat-input">GitHub Personal Access Token</label>
                <input type="password" id="pat-input" class="form-input" placeholder="ghp_xxxxxxxxxxxx" />
                <p class="help-text">Enter a fine-grained PAT with gist permissions.</p>
              </div>
              <div class="form-actions">
                <button id="save-token-btn" class="primary-btn">Save Token</button>
                <button id="remove-token-btn" class="secondary-btn">Remove Token</button>
              </div>
              <div id="token-status" class="token-status"></div>
            </div>
          </details>

          <details class="settings-section" open>
            <summary class="settings-section-header">
              <h3>Appearance</h3>
              <span class="section-toggle-icon">▼</span>
            </summary>
            <div class="settings-section-content">
              <div class="form-group">
                <label for="theme-select">Theme</label>
                <select id="theme-select" class="form-input">
                  <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light</option>
                  <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
                  <option value="auto" ${currentTheme === 'auto' ? 'selected' : ''}>Auto (System)</option>
                </select>
              </div>
            </div>
          </details>

          <details class="settings-section">
            <summary class="settings-section-header">
              <h3>Data Management</h3>
              <span class="section-toggle-icon">▼</span>
            </summary>
            <div class="settings-section-content">
              <div class="form-actions">
                <button id="export-data-btn" class="secondary-btn">Export Data (JSON)</button>
                <button id="import-data-btn" class="secondary-btn">Import Data (JSON)</button>
                <button id="reset-app-btn" class="secondary-btn">Reset App (Clear All Data)</button>
              </div>
              <input type="file" id="import-file-input" accept=".json" style="display: none;" />
            </div>
          </details>

          <details class="settings-section">
            <summary class="settings-section-header">
              <h3>Diagnostics</h3>
              <span class="section-toggle-icon">▼</span>
            </summary>
            <div class="settings-section-content">
              <div class="form-actions">
                <button id="export-diagnostics-btn" class="secondary-btn">Export Diagnostics</button>
              </div>
              <div id="diagnostics-info" class="diagnostics-info"></div>
            </div>
          </details>
        </div>
      </div>
    `;
  }

  private getDetailRoute(): string {
    return `<div id="gist-detail-container" data-testid="gist-detail">
      <div class="gist-detail-skeleton" aria-label="Loading gist detail">
        <div class="skeleton-header">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-meta"></div>
        </div>
        <div class="skeleton-content">
          <div class="skeleton-line skeleton-file-tab"></div>
          <div class="skeleton-code-lines">
            ${Array(8).fill('').map(() => 
              `<div class="skeleton-code-line" style="width: ${60 + Math.random() * 40}%"></div>`
            ).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  private getEditRoute(): string {
    return `<div id="gist-edit-container" data-testid="gist-edit"></div>`;
  }

  private getRevisionsRoute(): string {
    return `<div id="gist-revisions-container" data-testid="gist-revisions"></div>`;
  }

  private renderGistList(): string {
    if (this.displayedGists.length === 0) {
      const hasGists = gistStore.getGists().length > 0;
      if (!hasGists && !gistStore.getIsLoading()) return '<div class="empty-state"><p>No gists yet. Create your first gist!</p></div>';
      if (this.searchQuery) return '<div class="empty-state"><p>No gists match your search.</p></div>';
      return '<div class="empty-state"><p>No gists found.</p></div>';
    }
    return this.displayedGists.map(renderCard).join('');
  }

  /**
   * Render loading skeleton
   */
  private renderLoadingState(): void {
    if (!this.container || !gistStore.getIsLoading()) return;
    const listEl = this.container.querySelector('#gist-list');
    if (!listEl) return;

    listEl.innerHTML = Array(3).fill('').map(() => `
      <div class="gist-card">
        <div class="gist-card-header">
          <div class="loading-skeleton" style="height:20px;flex:1;"></div>
        </div>
        <div class="loading-skeleton" style="height:14px;width:60%;margin-bottom:8px;"></div>
        <div class="loading-skeleton" style="height:12px;width:40%;"></div>
      </div>
    `).join('');
  }

  /**
   * 2026: Render detail skeleton - used before async gist loading
   * Call this method when implementing async detail view loading.
   */
  // _renderDetailSkeleton() available for future use

  /**
   * Render error banner
   */
  private renderErrorState(): void {
    if (!this.container) return;
    const error = gistStore.getError();
    let banner = this.container.querySelector('.error-banner') as HTMLElement | null;
    if (error) {
      if (!banner) {
        banner = document.createElement('div');
        banner.className = 'error-banner';
        banner.setAttribute('role', 'alert');
        const main = this.container.querySelector('.app-main');
        main?.prepend(banner);
      }
      banner.innerHTML = `
        <span class="error-message">Error: ${this.escapeHtml(error)}</span>
        <button class="retry-btn secondary-btn" style="min-height:32px;padding:4px 12px;">Retry</button>
      `;
      banner.querySelector('.retry-btn')?.addEventListener('click', () => {
        gistStore.loadGists(true);
      });
    } else {
      banner?.remove();
    }
  }

  /**
   * Update gist list DOM without full re-render
   */
  private updateGistList(): void {
    if (!this.container) return;
    const listEl = this.container.querySelector('#gist-list') as HTMLElement | null;
    if (!listEl) return;

    let gists = this.currentRoute === 'starred'
      ? gistStore.filterGists('starred')
      : this.searchQuery
        ? gistStore.searchGists(this.searchQuery)
        : gistStore.filterGists(this.currentFilter);

    // Apply sorting
    gists = this.sortGists(gists);
    this.displayedGists = gists;

    if (gists.length === 0) {
      listEl.innerHTML = this.renderGistList();
      return;
    }

    listEl.innerHTML = gists.map(renderCard).join('');
    bindCardEvents(listEl, (id) => this.navigateToDetail(id));
  }

  /**
   * Sort gists by specified criteria
   */
  private sortGists(gists: GistRecord[]): GistRecord[] {
    return [...gists].sort((a, b) => {
      let comparison = 0;

      switch (this.currentSortKey) {
        case 'updated':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'title': {
          const titleA = (a.description || Object.values(a.files)[0]?.filename || '').toLowerCase();
          const titleB = (b.description || Object.values(b.files)[0]?.filename || '').toLowerCase();
          comparison = titleA.localeCompare(titleB);
          break;
        }
      }

      return this.currentSortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Navigate to gist detail view
   */
  private async navigateToDetail(gistId: string): Promise<void> {
    this.currentRoute = 'detail';
    this.render();
    this.setupNavigation();
    window.history.pushState({ route: 'detail', gistId }, '', `#detail/${gistId}`);

    const container = this.container?.querySelector('#gist-detail-container');
    if (container) {
      await loadGistDetail(
        gistId,
        container as HTMLElement,
        () => this.navigate('home'),
        (id) => this.navigateToEdit(id),
        (id) => this.navigateToRevisions(id)
      );
    }
  }

  /**
   * Navigate to edit view
   */
  private async navigateToEdit(gistId: string): Promise<void> {
    this.currentRoute = 'edit';
    this.render();
    this.setupNavigation();
    window.history.pushState({ route: 'edit', gistId }, '', `#edit/${gistId}`);

    const container = this.container?.querySelector('#gist-edit-container');
    if (container) {
      await loadEditForm(
        gistId,
        container as HTMLElement,
        () => this.navigateToDetail(gistId)
      );
    }
  }

  /**
   * Navigate to revisions view
   */
  private async navigateToRevisions(gistId: string): Promise<void> {
    this.currentRoute = 'revisions';
    this.render();
    this.setupNavigation();
    window.history.pushState({ route: 'revisions', gistId }, '', `#revisions/${gistId}`);

    const container = this.container?.querySelector('#gist-revisions-container');
    if (container) {
      await this.loadRevisions(gistId, container as HTMLElement);
    }
  }

  /**
   * Load and display revisions
   */
  private async loadRevisions(gistId: string, container: HTMLElement): Promise<void> {
    try {
      const revisions = await GitHub.listGistRevisions(gistId);
      container.innerHTML = renderRevisionsList(revisions, gistId);

      // Bind back button
      container.querySelector('#gist-back-btn')?.addEventListener('click', () => this.navigateToDetail(gistId));
    } catch (err) {
      container.innerHTML = `
        <div class="error-state">
          <p>Failed to load revisions: ${this.escapeHtml(err instanceof Error ? err.message : 'Unknown error')}</p>
          <button class="back-btn" id="revisions-back-btn">← Back</button>
        </div>
      `;
      container.querySelector('#revisions-back-btn')?.addEventListener('click', () => this.navigateToDetail(gistId));
    }
  }

  /**
   * Update offline page dynamic data
   */
  private async updateOfflineStatus(): Promise<void> {
    if (!this.container) return;
    const countEl = this.container.querySelector('#pending-count');
    const count = await syncQueue.getQueueLength();
    if (countEl) countEl.textContent = String(count);

    const opsEl = this.container.querySelector('#pending-ops');
    if (opsEl && count > 0) {
      opsEl.innerHTML = `<h3>Pending Operations</h3><div class="empty-state"><p>${count} operation${count !== 1 ? 's' : ''} waiting</p></div>`;
    } else if (opsEl) {
      opsEl.innerHTML = `<h3>Pending Operations</h3><div class="empty-state"><p>No pending operations</p></div>`;
    }
  }

  private setupNavigation(): void {
    if (!this.container) return;

    // Mobile bottom nav handlers (existing)
    this.container.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const route = (e.currentTarget as HTMLElement).dataset.route as Route;
        if (route) this.navigate(route);
      });
    });

    // 2026: Desktop sidebar nav handlers
    this.container.querySelectorAll('.sidebar-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const route = (e.currentTarget as HTMLElement).dataset.route as Route;
        if (route) this.navigate(route);
      });
    });

    this.container.querySelector('#theme-toggle')?.addEventListener('click', () => this.toggleTheme());
    this.container.querySelector('#settings-btn')?.addEventListener('click', () => this.navigate('settings'));
    this.setupRouteHandlers();
  }

  private setupRouteHandlers(): void {
    if (!this.container) return;

    // Search with debounce
    const searchInput = this.container.querySelector('.search-input') as HTMLInputElement | null;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      const query = (e.target as HTMLInputElement).value;
      this.searchTimeout = window.setTimeout(() => {
        this.searchQuery = query;
        this.updateGistList();
      }, 300);
    });

    // Filter buttons
    this.container.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        this.container!.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        target.classList.add('active');
        this.currentFilter = (target.dataset.filter as Filter) || 'all';
        this.updateGistList();
      });
    });

    // Sort control
    this.container.querySelector('#sort-select')?.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement;
      const [sortKey, sortOrder] = select.value.split('-') as [SortKey, SortOrder];
      this.currentSortKey = sortKey;
      this.currentSortOrder = sortOrder;
      this.updateGistList();
    });

    // Create form
    this.container.querySelector('#create-gist-form')?.addEventListener('submit', (e) => this.handleCreateGist(e));
    this.container.querySelector('#add-file-btn')?.addEventListener('click', () => this.addFileEditor());
    this.container.querySelector('#cancel-create-btn')?.addEventListener('click', () => this.navigate('home'));

    // Offline actions
    this.container.querySelector('#sync-now-btn')?.addEventListener('click', () => this.syncNow());
    this.container.querySelector('#clear-cache-btn')?.addEventListener('click', () => this.clearCache());

    // Settings actions
    this.container.querySelector('#save-token-btn')?.addEventListener('click', () => this.handleSaveToken());
    this.container.querySelector('#remove-token-btn')?.addEventListener('click', () => this.handleRemoveToken());
    this.container.querySelector('#theme-select')?.addEventListener('change', (e) => this.handleThemeChange(e));
    this.container.querySelector('#export-data-btn')?.addEventListener('click', () => this.handleExportData());
    this.container.querySelector('#import-data-btn')?.addEventListener('click', () => this.handleImportData());
    this.container.querySelector('#import-file-input')?.addEventListener('change', (e) => this.handleImportFile(e));
    this.container.querySelector('#reset-app-btn')?.addEventListener('click', () => this.handleResetApp());
    this.container.querySelector('#export-diagnostics-btn')?.addEventListener('click', () => this.handleExportDiagnostics());

    // Load token info on settings page
    if (this.currentRoute === 'settings') {
      this.loadTokenInfo();
      this.loadDiagnostics();
    }

    // Bind card events
    const listEl = this.container.querySelector('#gist-list');
    if (listEl) bindCardEvents(listEl as HTMLElement);
  }

  private navigate(route: Route): void {
    this.currentRoute = route;
    if (route === 'home') {
      this.currentFilter = 'all';
      this.searchQuery = '';
    } else if (route === 'starred') {
      this.currentFilter = 'starred';
      this.searchQuery = '';
    }
    this.render();
    this.setupNavigation();
    window.history.pushState({ route }, '', `#${route}`);
    this.updateGistList();
  }

  private toggleTheme(): void {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme-preference', next);
  }

  private initializeThemeToggle(): void {
    const stored = localStorage.getItem('theme-preference');
    if (stored) {
      document.documentElement.setAttribute('data-theme', stored);
    } else {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }

  private async handleCreateGist(e: Event): Promise<void> {
    e.preventDefault();
    const btn = this.container?.querySelector('#create-submit-btn') as HTMLButtonElement | null;

    // Collect files
    const files: Record<string, string> = {};
    this.container?.querySelectorAll('.file-editor').forEach((editor) => {
      const filename = (editor.querySelector('.filename-input') as HTMLInputElement)?.value.trim();
      const content = (editor.querySelector('.content-editor') as HTMLTextAreaElement)?.value || '';
      if (filename) files[filename] = content;
    });

    if (Object.keys(files).length === 0) {
      toast.error('Add at least one file with a filename');
      return;
    }

    const description = (this.container?.querySelector('#gist-description') as HTMLInputElement)?.value.trim() || '';
    const public_ = (this.container?.querySelector('#gist-public') as HTMLInputElement)?.checked ?? true;

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Creating...';
    }

    try {
      const result = await gistStore.createGist(description, public_, files);
      if (result) {
        toast.success('Gist created successfully');
        this.navigate('home');
      } else {
        toast.error('Failed to create gist');
      }
    } catch {
      toast.error('Failed to create gist');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Create Gist';
      }
    }
  }

  private addFileEditor(): void {
    const section = this.container?.querySelector('#files-section');
    if (!section) return;
    const index = section.querySelectorAll('.file-editor').length;
    const editor = document.createElement('div');
    editor.className = 'file-editor';
    editor.dataset.fileIndex = String(index);
    editor.innerHTML = `
      <div class="file-header">
        <input type="text" class="filename-input" placeholder="Filename (e.g., example.js)" />
        <button type="button" class="remove-file-btn">×</button>
      </div>
      <textarea class="content-editor" placeholder="File content..."></textarea>
    `;
    editor.querySelector('.remove-file-btn')?.addEventListener('click', () => editor.remove());
    section.appendChild(editor);
  }

  private async syncNow(): Promise<void> {
    toast.info('Syncing...');
    await syncQueue.processQueue();
    toast.success('Sync complete');
    this.updateOfflineStatus();
  }

  private async clearCache(): Promise<void> {
    if (!confirm('Clear all cached data? This cannot be undone.')) return;
    await clearAllData();
    toast.success('Cache cleared');
    this.updateOfflineStatus();
  }

  private async handleSaveToken(): Promise<void> {
    const input = this.container?.querySelector('#pat-input') as HTMLInputElement | null;
    if (!input) return;
    const token = input.value.trim();
    if (!token) {
      toast.error('Enter a token');
      return;
    }
    const result = await saveToken(token);
    if (result.success) {
      toast.success('Token saved successfully');
      input.value = '';
      this.loadTokenInfo();
    } else {
      toast.error(result.error || 'Failed to save token');
    }
  }

  private async handleRemoveToken(): Promise<void> {
    await removeToken();
    toast.info('Token removed');
    this.loadTokenInfo();
  }

  private async loadTokenInfo(): Promise<void> {
    const statusEl = this.container?.querySelector('#token-status');
    if (!statusEl) return;
    const token = await getToken();
    if (token) {
      const masked = token.slice(0, 6) + '••••' + token.slice(-4);
      statusEl.innerHTML = `<p class="token-saved">Token saved: ${this.escapeHtml(masked)}</p>`;
    } else {
      statusEl.innerHTML = `<p class="token-missing">No token saved. Add one above.</p>`;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private handleThemeChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    const theme = select.value;

    if (theme === 'auto') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      localStorage.removeItem('theme-preference');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme-preference', theme);
    }
  }

  private async handleExportData(): Promise<void> {
    try {
      const { exportData } = await import('../services/db');
      const data = await exportData();

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gist-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    } catch {
      toast.error('Failed to export data');
    }
  }

  /**
   * Trigger file input for import.
   */
  private handleImportData(): void {
    const input = this.container?.querySelector('#import-file-input') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  /**
   * Handle selected import file.
   */
  private async handleImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!confirm('Import data from backup? This will replace all local data.')) {
      input.value = '';
      return;
    }

    try {
      const text = await file.text();
      const { importData } = await import('../services/db');
      await importData(text);

      toast.success('Data imported successfully. Refreshing...');
      // Refresh gist store
      await gistStore.refreshGists();
    } catch (error) {
      console.error('[App] Import failed:', error);
      toast.error('Failed to import data. Invalid backup file.');
    } finally {
      input.value = '';
    }
  }

  private async handleResetApp(): Promise<void> {
    if (!confirm('Reset the app? This will delete all local data and cannot be undone.')) return;

    try {
      await clearAllData();
      toast.success('App reset successfully');
      this.navigate('home');
    } catch {
      toast.error('Failed to reset app');
    }
  }

  private async handleExportDiagnostics(): Promise<void> {
    const diagnostics = await this.collectDiagnostics();
    const blob = new Blob([JSON.stringify(diagnostics, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gist-hub-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Diagnostics exported');
  }

  private async collectDiagnostics(): Promise<Record<string, unknown>> {
    const { getDB } = await import('../services/db');
    const token = await getToken();

    return {
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      authenticated: !!token,
      theme: document.documentElement.getAttribute('data-theme'),
      gistsCount: gistStore.getGists().length,
      isLoading: gistStore.getIsLoading(),
      error: gistStore.getError(),
      serviceWorker: navigator.serviceWorker?.controller ? 'registered' : 'not registered',
      indexedDB: 'indexedDB' in window ? 'supported' : 'not supported',
      storageEstimate: await navigator.storage?.estimate(),
      dbSize: (() => {
        try {
          const db = getDB();
          return db ? 'initialized' : 'not initialized';
        } catch {
          return 'not initialized';
        }
      })(),
    };
  }

  private async loadDiagnostics(): Promise<void> {
    const container = this.container?.querySelector('#diagnostics-info');
    if (!container) return;

    const info = await this.collectDiagnostics();
    container.innerHTML = `
      <div class="diagnostics-content">
        <p>Online: ${info.online ? 'Yes' : 'No'}</p>
        <p>Gists: ${info.gistsCount}</p>
        <p>Service Worker: ${info.serviceWorker}</p>
        <p>Theme: ${info.theme}</p>
      </div>
    `;
  }

  /**
   * 2026: Update sync status indicator in header
   */
  private async updateSyncIndicator(): Promise<void> {
    if (!this.container) return;
    const dot = this.container.querySelector('.sync-dot');
    if (!dot) return;

    const online = networkMonitor.isOnline();
    const pendingCount = await syncQueue.getQueueLength();

    // Update sync status classes
    const indicator = this.container.querySelector('#sync-indicator');
    indicator?.classList.toggle('syncing', pendingCount > 0 && online);
    indicator?.classList.toggle('offline', !online);

    // Update aria label
    const statusText = pendingCount > 0
      ? `${pendingCount} pending sync`
      : online ? 'Synced' : 'Offline';
    indicator?.setAttribute('aria-label', `Sync status: ${statusText}`);
  }
}
