import { Route, Filter, SortKey, SortOrder } from '../types/ui';
import { getToken, saveToken, removeToken } from '../services/github/auth';
import { redactToken, safeLog, safeError } from '../services/security/logger';
import { sanitizeHtml } from '../services/security/dom';
import { gistStore } from '../stores/gist-store';
import { networkMonitor } from '../services/network';
import { syncQueue } from '../services/sync-queue';
import { toast } from '../utils/toast';
import { bottomSheet } from './ui/bottom-sheet';
import { commandPalette } from './ui/command-palette';
import { showConfirmDialog } from '../utils/dialog';

export class App {
  private container: HTMLElement | null = null;
  private currentRoute: Route = 'home';
  private searchQuery = '';
  private currentFilter: Filter = 'all';
  private currentSortKey: SortKey = 'updated';
  private currentSortOrder: SortOrder = 'desc';
  private searchTimeout: number | undefined;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.container = document.getElementById('app-container');
    if (!this.container) return;

    window.addEventListener('popstate', () => {
      const route = (window.location.hash.replace('#', '') as Route) || 'home';
      void this.navigate(route, false);
    });

    const initialRoute = (window.location.hash.replace('#', '') as Route) || 'home';
    void this.navigate(initialRoute, false);

    networkMonitor.onStatusChange(() => {
      void this.updateSyncIndicator();
    });

    this.initializeCommandPalette();
  }

  public async navigate(route: Route, pushState = true): Promise<void> {
    this.currentRoute = route;
    if (pushState) {
      window.history.pushState(null, '', `#${route}`);
    }

    await this.render();
    window.scrollTo(0, 0);
  }

  private async render(): Promise<void> {
    if (!this.container) return;

    this.container.innerHTML = this.getLayout();
    await this.bindEvents();

    if (this.currentRoute === 'settings') {
      void this.loadTokenInfo();
      void this.loadDiagnostics();
    } else if (this.currentRoute === 'offline') {
      void this.updateOfflineStatus();
    }
  }

  private getLayout(): string {
    return `
      <div class="app-shell">
        <header class="app-header">
          <div class="header-left">
            <h1 class="app-title">d.o. Gist Hub</h1>
          </div>
          <div class="header-right">
            <div id="sync-indicator" class="sync-indicator"></div>
            <button class="icon-button" id="menu-btn" aria-label="Menu">☰</button>
          </div>
        </header>

        <nav class="sidebar-nav">
          <button class="nav-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home">Home</button>
          <button class="nav-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred">Starred</button>
          <button class="nav-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create">Create</button>
          <button class="nav-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline">Offline</button>
          <button class="nav-item ${this.currentRoute === 'settings' ? 'active' : ''}" data-route="settings">Settings</button>
        </nav>

        <main class="app-main">
          ${this.getRouteContent()}
        </main>

        <nav class="bottom-nav">
          <button class="nav-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home">
            <span class="nav-icon">🏠</span>
            <span class="nav-label">Home</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred">
            <span class="nav-icon">⭐</span>
            <span class="nav-label">Starred</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create">
            <span class="nav-icon">➕</span>
            <span class="nav-label">New</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline">
            <span class="nav-icon">📶</span>
            <span class="nav-label">Status</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'settings' ? 'active' : ''}" data-route="settings">
            <span class="nav-icon">⚙️</span>
            <span class="nav-label">Settings</span>
          </button>
        </nav>
      </div>
    `;
  }

  private getRouteContent(): string {
    switch (this.currentRoute) {
      case 'starred':
        return this.getStarredRoute();
      case 'create':
        return this.getCreateRoute();
      case 'offline':
        return this.getOfflineRoute();
      case 'conflicts':
        return '<div id="conflicts-container"></div>';
      case 'settings':
        return this.getSettingsRoute();
      case 'detail':
        return '<div id="gist-detail-container" data-testid="gist-detail"></div>';
      case 'edit':
        return '<div id="gist-edit-container" data-testid="gist-edit"></div>';
      case 'revisions':
        return '<div id="gist-revisions-container" data-testid="gist-revisions"></div>';
      default:
        return this.getHomeRoute();
    }
  }

  private getHomeRoute(): string {
    return `
      <div class="route-home">
        <div class="gist-list-header">
          <div class="search-container">
            <input type="text" class="search-input" placeholder="Search gists..." value="${this.searchQuery}" />
          </div>
          <div class="filter-buttons filter-chips">
            <button class="chip filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
            <button class="chip filter-btn ${this.currentFilter === 'mine' ? 'active' : ''}" data-filter="mine">Mine</button>
            <button class="chip filter-btn ${this.currentFilter === 'starred' ? 'active' : ''}" data-filter="starred">Starred</button>
          </div>
          <div class="sort-controls">
            <label for="sort-select" class="micro-label">Sort by:</label>
            <select id="sort-select" class="sort-select form-input" style="width: auto; padding: var(--space-1) var(--space-2);">
              <option value="updated-desc" ${this.currentSortKey === 'updated' && this.currentSortOrder === 'desc' ? 'selected' : ''}>Last Updated (Newest)</option>
              <option value="updated-asc" ${this.currentSortKey === 'updated' && this.currentSortOrder === 'asc' ? 'selected' : ''}>Last Updated (Oldest)</option>
              <option value="created-desc" ${this.currentSortKey === 'created' && this.currentSortOrder === 'desc' ? 'selected' : ''}>Created (Newest)</option>
              <option value="created-asc" ${this.currentSortKey === 'created' && this.currentSortOrder === 'asc' ? 'selected' : ''}>Created (Oldest)</option>
              <option value="title-asc" ${this.currentSortKey === 'title' && this.currentSortOrder === 'asc' ? 'selected' : ''}>Title (A-Z)</option>
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
        <header class="detail-header">
            <h2 class="detail-title">Starred Gists</h2>
        </header>
        <div class="gist-list-header">
          <div class="filter-buttons filter-chips">
            <button class="chip filter-btn active" data-filter="starred">Starred</button>
          </div>
        </div>
        <div class="gist-list" id="gist-list">${this.renderGistList()}</div>
      </div>
    `;
  }

  private renderGistList(): string {
    const gists = gistStore.getFilteredGists(this.currentFilter, this.searchQuery, this.currentSortKey, this.currentSortOrder);
    if (gists.length === 0) {
      return '<div class="empty-state"><p>No gists found.</p></div>';
    }
    return gists.map(gist => `<div class="gist-card-stub" data-id="${gist.id}">${gist.description || 'No description'}</div>`).join('');
  }

  private getCreateRoute(): string {
    return `
      <div class="route-create">
        <header class="detail-header">
            <h2 class="detail-title">Create New Gist</h2>
        </header>
        <form id="create-gist-form" class="glass-card" style="padding: var(--space-6);">
          <div class="form-group">
            <label class="form-label" for="gist-description">Description</label>
            <input type="text" id="gist-description" class="form-input" placeholder="Gist description..." required>
          </div>
          <div class="form-group">
            <label class="form-label" for="gist-content">index.js</label>
            <textarea id="gist-content" class="form-input code-editor" placeholder="Gist content..." required style="min-height: 200px;"></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">CREATE GIST</button>
          </div>
        </form>
      </div>
    `;
  }

  private getSettingsRoute(): string {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'auto';
    return `
      <div class="route-settings">
        <header class="detail-header">
            <h2 class="detail-title">Settings</h2>
        </header>
        <div class="settings-panel">
          <details class="settings-section" open>
            <summary class="settings-section-header">
              <h3 class="form-label">Authentication</h3>
            </summary>
            <div class="settings-section-content" style="padding-top: var(--space-4);">
              <div class="form-group">
                <label class="form-label" for="pat-input">GitHub Personal Access Token</label>
                <div style="display: flex; gap: var(--space-2);">
                    <input type="password" id="pat-input" class="form-input" style="flex: 1;" placeholder="ghp_...">
                    <button id="save-token-btn" class="btn btn-primary">SAVE</button>
                    <button id="remove-token-btn" class="btn btn-ghost">REMOVE</button>
                </div>
                <div id="token-status" style="margin-top: var(--space-2);"></div>
              </div>
            </div>
          </details>

          <details class="settings-section">
            <summary class="settings-section-header">
              <h3 class="form-label">Preferences</h3>
            </summary>
            <div class="settings-section-content" style="padding-top: var(--space-4);">
              <div class="form-group">
                <label class="form-label" for="theme-select">Theme</label>
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
              <h3 class="form-label">Data & Diagnostics</h3>
            </summary>
            <div class="settings-section-content" style="padding-top: var(--space-4);">
              <div class="form-actions" style="display: flex; flex-direction: column; gap: var(--space-2);">
                <div style="display: flex; gap: var(--space-2); margin-top: var(--space-2);">
                  <button id="export-all-btn" class="btn btn-secondary" style="flex: 1;">EXPORT ALL GISTS</button>
                  <button id="import-btn" class="btn btn-secondary" style="flex: 1;">IMPORT GISTS</button>
                  <input type="file" id="import-input" accept=".json" style="display: none;" />
                </div>
                <button id="export-data-btn" class="btn btn-ghost">Export Data (JSON)</button>
                <button id="clear-cache-btn" class="btn btn-danger">CLEAR LOCAL CACHE</button>
              </div>
              <div id="diagnostics-info" class="diagnostics-info" style="margin-top: var(--space-4);"></div>
            </div>
          </details>
        </div>
      </div>
    `;
  }

  private getOfflineRoute(): string {
    return `
      <div class="route-offline">
        <header class="detail-header">
            <h2 class="detail-title">Offline Status</h2>
        </header>
        <div class="offline-stats">
            <div class="stat-card">
                <div class="stat-icon">📴</div>
                <div class="stat-info">
                    <div class="stat-label">PENDING WRITES</div>
                    <div class="stat-value" id="pending-count">0</div>
                </div>
            </div>
        </div>
        <div id="pending-ops" style="margin-top: var(--space-6);"></div>
      </div>
    `;
  }

  private async bindEvents(): Promise<void> {
    // Navigation
    this.container!.querySelectorAll('[data-route]').forEach(el => {
      el.addEventListener('click', () => {
        const route = el.getAttribute('data-route') as Route;
        if (route) void this.navigate(route);
      });
    });

    // Menu button
    this.container!.querySelector('#menu-btn')?.addEventListener('click', () => {
      void this.showMobileMenu();
    });

    // Search
    const searchInput = this.container!.querySelector('.search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      const val = (e.target as HTMLInputElement).value;
      this.searchTimeout = window.setTimeout(() => {
        this.searchQuery = val;
        void this.render(); // Re-render to update list
      }, 300);
    });

    // Sort
    this.container!.querySelector('#sort-select')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      const [key, order] = val.split('-') as [SortKey, SortOrder];
      this.currentSortKey = key;
      this.currentSortOrder = order;
      void this.render();
    });

    // Form submission
    this.container!.querySelector('#create-gist-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const desc = (this.container!.querySelector('#gist-description') as HTMLInputElement).value;
      const content = (this.container!.querySelector('#gist-content') as HTMLTextAreaElement).value;
      try {
        await gistStore.createGist(desc, true, { 'index.js': content });
        toast.success('Gist created offline');
        void this.navigate('home');
      } catch (err) {
        toast.error('Failed to create gist');
        safeError('Create failed', err);
      }
    });

    // Settings actions
    this.container!.querySelector('#save-token-btn')?.addEventListener('click', async () => {
      const input = this.container!.querySelector('#pat-input') as HTMLInputElement;
      if (input.value) {
        const res = await saveToken(input.value);
        if (res.success) {
          toast.success('TOKEN SAVED');
          void this.loadTokenInfo();
        } else {
          toast.error(res.error || 'SAVE FAILED');
        }
      }
    });

    this.container!.querySelector('#remove-token-btn')?.addEventListener('click', async () => {
      if (await showConfirmDialog('REMOVE TOKEN?')) {
        await removeToken();
        toast.success('TOKEN REMOVED');
        void this.loadTokenInfo();
      }
    });

    this.container!.querySelector('#export-all-btn')?.addEventListener('click', async () => {
      const { exportAllGists } = await import('../services/export-import');
      const blob = await exportAllGists();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gists-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('EXPORT COMPLETE');
    });

    this.container!.querySelector('#import-btn')?.addEventListener('click', () => {
      (this.container!.querySelector('#import-input') as HTMLInputElement)?.click();
    });

    this.container!.querySelector('#import-input')?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const { importGists } = await import('../services/export-import');
        const result = await importGists(file);
        await gistStore.reloadFromDb();
        toast.success(
          `IMPORT COMPLETE: ${result.imported} NEW, ${result.updated} UPDATED, ${result.conflicts} CONFLICTS`
        );
      } catch (err) {
        toast.error('IMPORT FAILED');
        safeError('Import failed', err);
      } finally {
        (e.target as HTMLInputElement).value = '';
      }
    });

    this.container!.querySelector('#clear-cache-btn')?.addEventListener('click', async () => {
      if (await showConfirmDialog('CLEAR ALL LOCAL DATA?')) {
        const { clearAllData } = await import('../services/db');
        await clearAllData();
        window.location.reload();
      }
    });

    this.container!.querySelector('#export-data-btn')?.addEventListener('click', async () => {
      try {
        const { exportData } = await import('../services/db');
        const data = await exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gist-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('DATA EXPORTED');
      } catch (err) {
        toast.error('EXPORT FAILED');
        safeError('Export failed', err);
      }
    });

    this.container!.querySelector('#theme-select')?.addEventListener('change', (e) => {
      const theme = (e.target as HTMLSelectElement).value;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme-preference', theme);
    });
  }

  private async loadTokenInfo(): Promise<void> {
    const el = this.container?.querySelector('#token-status');
    const token = await getToken();
    if (el) {
      if (token) {
        el.innerHTML = `<p class="micro-label token-saved">Token active: ${redactToken(token)}</p>`;
      } else {
        el.innerHTML = '<p class="micro-label token-missing">No token saved. Add one above.</p>';
      }
    }
  }

  private async loadDiagnostics(): Promise<void> {
    const container = this.container?.querySelector('#diagnostics-info');
    if (!container) return;

    const info = {
      online: networkMonitor.isOnline(),
      gistsCount: gistStore.getGists().length,
      theme: document.documentElement.getAttribute('data-theme'),
    };

    container.innerHTML = `
      <div class="diagnostics-content micro-label">
        <p>Online: ${info.online ? 'Yes' : 'No'}</p>
        <p>Gists: ${info.gistsCount}</p>
        <p>Theme: ${sanitizeHtml(info.theme || 'auto')}</p>
      </div>
    `;
  }

  private async updateSyncIndicator(): Promise<void> {
    const el = this.container?.querySelector('#sync-indicator');
    const online = networkMonitor.isOnline();
    const len = await syncQueue.getQueueLength();
    if (el) el.setAttribute('data-status', online ? (len > 0 ? 'syncing' : 'online') : 'offline');
  }

  private async updateOfflineStatus(): Promise<void> {
    const pendingEl = this.container?.querySelector('#pending-count');
    const count = await syncQueue.getQueueLength();
    if (pendingEl) pendingEl.textContent = String(count);

    const opsEl = this.container?.querySelector('#pending-ops');
    if (opsEl) {
      if (count > 0) {
        opsEl.innerHTML = `<h3>Pending Operations</h3><div class="empty-state"><p>${count} operation${count !== 1 ? 's' : ''} waiting</p></div>`;
      } else {
        opsEl.innerHTML = '<h3>Pending Operations</h3><div class="empty-state"><p>No pending operations</p></div>';
      }
    }
  }

  private async showMobileMenu(): Promise<void> {
    const content = `
      <div class="mobile-menu" style="display: grid; gap: var(--space-2); padding: var(--space-4);">
        <button class="btn btn-ghost" data-route="home">Home</button>
        <button class="btn btn-ghost" data-route="starred">Starred Gists</button>
        <button class="btn btn-ghost" data-route="create">Create New Gist</button>
        <button class="btn btn-ghost" data-route="offline">Offline Status</button>
        <button class="btn btn-ghost" data-route="settings">Settings</button>
      </div>
    `;
    await bottomSheet.open(content, 'MENU');
    setTimeout(() => {
      document.querySelectorAll('.mobile-menu .btn').forEach(b => {
        b.addEventListener('click', () => {
          const r = (b as HTMLElement).dataset.route as Route;
          if (r) {
            void this.navigate(r);
            void bottomSheet.close();
          }
        });
      });
    }, 100);
  }

  private initializeCommandPalette(): void {
    commandPalette.setCommands([
      { id: 'home', title: 'Home', action: () => { void this.navigate('home'); } },
      { id: 'starred', title: 'Starred Gists', action: () => { void this.navigate('starred'); } },
      { id: 'create', title: 'Create New Gist', action: () => { void this.navigate('create'); } },
      { id: 'settings', title: 'Settings', action: () => { void this.navigate('settings'); } },
      { id: 'offline', title: 'Offline Status', action: () => { void this.navigate('offline'); } },
    ]);
  }
}
