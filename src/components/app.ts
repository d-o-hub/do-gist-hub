// skipcq: JS-0044 — void operator is the idiomatic TypeScript pattern for floating promises
// skipcq: JS-0010 — cyclomatic complexity in event delegation handlers is by design
/**
 * Root App Component
 */

import gistStore from '../stores/gist-store';
import { renderCard, bindCardEvents } from './gist-card';
import networkMonitor from '../services/network/offline-monitor';
import syncQueue from '../services/sync/queue';
import { getToken, saveToken } from '../services/github/auth';
import { loadGistDetail } from './gist-detail';
import { APP } from '../config/app.config';
import { redactToken, sanitizeHtml } from '../services/security';
import { EmptyState } from './ui/empty-state';
import { commandPalette } from './ui/command-palette';
import { bottomSheet } from './ui/bottom-sheet';
import { withViewTransition } from '../utils/view-transitions';
import { toast } from './ui/toast';
import { announcer } from '../utils/announcer';
import { showConfirmDialog } from '../utils/dialog';
import { safeError } from '../services/security/logger';

type Route = 'home' | 'starred' | 'create' | 'settings' | 'offline' | 'detail' | 'conflicts';
type Filter = 'all' | 'mine' | 'starred';
type Sort = 'created-desc' | 'updated-desc' | 'updated-asc';

export class App {
  private container: HTMLElement | null = null;
  private currentRoute: Route = 'home';
  private currentFilter: Filter = 'all';
  private currentSort: Sort = 'updated-desc';
  private searchQuery: string = '';
  private searchTimeout: number | undefined;
  private currentGistId: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    document.title = APP.name;
    const appElement = document.getElementById('app');
    if (!appElement) return;
    this.container = appElement;

    // Listen for sync/network changes
    networkMonitor.subscribe(() => {
      void this.updateSyncIndicator();
    });

    // Simple custom event for sync queue since it doesn't have a formal subscribe yet
    window.addEventListener('app:sync-change', () => {
      void this.updateSyncIndicator();
      if (this.currentRoute === 'offline') void this.updateOfflineStatus();
    });

    // Theme initialization
    const savedTheme = localStorage.getItem('theme-preference') || 'auto';
    document.documentElement.setAttribute('data-theme', savedTheme);

    this.initializeCommandPalette();
    void this.navigate('home');
  }

  private setupNavigation(): void { // skipcq: JS-0010
    if (!this.container || this.container.dataset.navBound) return;

    // Click Delegation (Routes, Actions, Buttons)
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Route delegation
      const routeBtn = target.closest('[data-route]') as HTMLElement;
      if (routeBtn) {
        e.preventDefault();
        const route = routeBtn.dataset.route as Route;
        if (route) void this.navigate(route);
        return;
      }

      // Action delegation
      const actionBtn = target.closest('[data-action]') as HTMLElement;
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        if (action === 'clear-search') {
          clearTimeout(this.searchTimeout);
          this.searchQuery = '';
          const input = this.container?.querySelector('#gist-search') as HTMLInputElement;
          if (input) input.value = '';
          void this.updateGistList();
        }
        return;
      }

      // Filter chip delegation
      const chip = target.closest('.chip') as HTMLElement;
      if (chip && chip.dataset.filter && this.container) {
        this.container.querySelectorAll('.chip').forEach((b) => b.classList.remove('active'));
        chip.classList.add('active');
        this.currentFilter = (chip.dataset.filter as Filter) || 'all';
        void this.updateGistList();
        return;
      }

      // Mobile menu delegation
      if (target.closest('#mobile-menu-btn')) {
        void this.showMobileMenu();
      }
    });

    // Change Delegation (Sort, Theme)
    this.container.addEventListener('change', (e) => {
      const target = e.target as HTMLElement;

      // Theme select
      if (target.id === 'theme-select') {
        const theme = (target as HTMLSelectElement).value;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme-preference', theme);
        return;
      }

      // Sort select
      if (target.id === 'sort-select') {
        this.currentSort = (target as HTMLSelectElement).value as Sort;
        void this.updateGistList();
        return;
      }
    });

    // Input Delegation (Search)
    this.container.addEventListener('input', (e) => {
      const target = e.target as HTMLElement;

      // Gist search
      if (target.id === 'gist-search') {
        clearTimeout(this.searchTimeout);
        const val = (target as HTMLInputElement).value;
        this.searchTimeout = window.setTimeout(() => {
          this.searchQuery = val;
          void this.updateGistList();
        }, 300);
      }
    });

    this.container.dataset.navBound = 'true';
  }

  private async navigate(route: Route): Promise<void> { // skipcq: JS-0010
    this.currentRoute = route;
    announcer.announce(`Navigating to ${route} page`);

    if (route === 'home') {
      this.currentFilter = 'all';
      this.searchQuery = '';
    } else if (route === 'starred') {
      this.currentFilter = 'starred';
      this.searchQuery = '';
    }

    await withViewTransition(async () => {
      this.render();
      this.setupNavigation();
      if (route === 'home' || route === 'starred') await this.updateGistList();
      if (route === 'settings') {
        await this.loadTokenInfo();
        await this.loadDiagnostics();
      }
      if (route === 'offline') {
        await this.updateOfflineStatus();
      }
      if (route === 'conflicts') {
        const { loadConflictResolution } = await import('./conflict-resolution');
        const conflictContainer = this.container?.querySelector('#conflict-resolution-container');
        if (conflictContainer instanceof HTMLElement) {
          await loadConflictResolution(conflictContainer, () => {
            void this.updateOfflineStatus();
          });
        }
      }
      this.bindRouteEvents();
    });
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar-nav">
          <button class="sidebar-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home">Home</button>
          <button class="sidebar-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred">Starred</button>
          <button class="sidebar-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create">Create</button>
          <button class="sidebar-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline">Offline</button>
          <button class="sidebar-item ${this.currentRoute === 'settings' ? 'active' : ''}" data-route="settings">Settings</button>
        </aside>

        <aside class="rail-nav">
          <button class="rail-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home">🏠</button>
          <button class="rail-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred">⭐</button>
          <button class="rail-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create">➕</button>
          <button class="rail-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline">📶</button>
          <button class="rail-item ${this.currentRoute === 'settings' ? 'active' : ''}" data-route="settings">⚙️</button>
        </aside>

        <header class="app-header">
          <div class="header-left">
            <h1 class="app-title" data-route="home">${APP.name}</h1>
          </div>
          <div class="header-right">
            <div id="sync-indicator" class="sync-indicator"></div>
            <button id="mobile-menu-btn" data-testid="mobile-menu-btn" class="icon-button" aria-label="Menu">☰</button>
            <button class="icon-button" aria-label="Settings" data-route="settings">⚙️</button>
          </div>
        </header>

        <main class="app-main" id="main-content">
          ${this.renderRoute()}
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
            <span class="nav-label">Create</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline">
            <span class="nav-icon">📶</span>
            <span class="nav-label">Offline</span>
          </button>
        </nav>
      </div>
    `;
  }

  private renderRoute(): string {
    switch (this.currentRoute) {
      case 'home':
      case 'starred':
        return this.getHomeRoute();
      case 'create':
        return this.getCreateRoute();
      case 'settings':
        return this.getSettingsRoute();
      case 'offline':
        return this.getOfflineRoute();
      case 'detail':
        return '<div id="gist-detail-container"></div>';
      case 'conflicts':
        return '<div id="conflict-resolution-container"></div>';
      default:
        return '<div>Route not found</div>';
    }
  }

  private getHomeRoute(): string {
    return `
      <div class="route-home">
        <div class="search-container">
          <input type="text" id="gist-search" class="search-input" placeholder="Search gists..." value="${this.searchQuery}">
        </div>
        <div class="filter-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
            <div class="filter-buttons filter-chips">
              <button class="chip ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
              <button class="chip ${this.currentFilter === 'mine' ? 'active' : ''}" data-filter="mine">Mine</button>
              <button class="chip ${this.currentFilter === 'starred' ? 'active' : ''}" data-filter="starred">Starred</button>
            </div>
            <select id="sort-select" class="form-input" style="width: auto; margin-bottom: 0;">
                <option value="updated-desc" ${this.currentSort === 'updated-desc' ? 'selected' : ''}>Recent</option>
                <option value="created-desc" ${this.currentSort === 'created-desc' ? 'selected' : ''}>Newest</option>
                <option value="updated-asc" ${this.currentSort === 'updated-asc' ? 'selected' : ''}>Oldest</option>
            </select>
        </div>
        <div id="gist-list" class="gist-list">
          ${this.renderGistList()}
        </div>
      </div>
    `;
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

        <div class="settings-list">
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

          <details class="settings-section" open>
            <summary class="settings-section-header">
              <h3 class="form-label">Data Management</h3>
            </summary>
            <div class="settings-section-content" style="padding-top: var(--space-4);">
                <div class="form-actions" style="display: flex; flex-direction: column; gap: var(--space-2);">
                    <div style="display: flex; gap: var(--space-2);">
                        <button id="export-all-btn" class="btn btn-secondary" style="flex: 1;">EXPORT ALL GISTS</button>
                        <button id="import-btn" class="btn btn-secondary" style="flex: 1;">IMPORT GISTS</button>
                        <input type="file" id="import-file-input" accept=".json" style="display: none;" />
                    </div>
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
            <div class="stat-card clickable" id="conflicts-stat-card">
                <div class="stat-icon">⚠️</div>
                <div class="stat-info">
                    <div class="stat-label">SYNC CONFLICTS</div>
                    <div class="stat-value" id="conflict-count">0</div>
                </div>
            </div>
        </div>
        <div class="pending-operations" id="pending-ops" style="margin-top: var(--space-6);"></div>
      </div>
    `;
  }

  private renderGistList(): string {
    if (gistStore.getLoading() && gistStore.getGists().length === 0) {
      return Array(3)
        .fill('')
        .map(
          () => `
        <div class="gist-card skeleton">
          <div class="loading-skeleton" style="height:20px;width:80%;margin-bottom:12px;"></div>
          <div class="loading-skeleton" style="height:14px;width:60%;margin-bottom:8px;"></div>
          <div class="loading-skeleton" style="height:12px;width:40%;"></div>
        </div>
      `
        )
        .join('');
    }

    let gists = gistStore.filterGists(
      this.currentFilter === 'mine' ? 'all' : (this.currentFilter as 'all' | 'starred')
    );

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      gists = gists.filter(
        (g) =>
          g.description?.toLowerCase().includes(q) ||
          Object.values(g.files).some((f) => f.filename.toLowerCase().includes(q))
      );
    }

    // Sort gists
    gists = [...gists].sort((a, b) => {
      if (this.currentSort === 'created-desc')
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (this.currentSort === 'updated-desc')
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      if (this.currentSort === 'updated-asc')
        return Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
      return 0;
    });

    if (gists.length === 0) {
      if (this.searchQuery) {
        return EmptyState.render({
          title: 'No Matches Found',
          description: `We couldn't find any gists matching "${this.searchQuery}"`,
          icon: '🔍',
          actionLabel: 'Clear Search',
          actionType: 'clear-search',
        });
      }

      const isStarred = this.currentFilter === 'starred';
      return EmptyState.render({
        title: isStarred ? 'No Starred Gists' : 'No Gists Found',
        description: isStarred
          ? "You haven't starred any gists yet"
          : 'Start by creating your first gist or syncing from GitHub',
        icon: isStarred ? '⭐' : '📝',
        actionLabel: isStarred ? 'View All Gists' : 'Create New Gist',
        actionRoute: isStarred ? 'home' : 'create',
      });
    }

    return gists.map((g) => renderCard(g)).join('');
  }

  private async updateGistList(): Promise<void> {
    const list = this.container?.querySelector('#gist-list');
    if (list) {
      list.innerHTML = this.renderGistList();
      bindCardEvents(list as HTMLElement, (id: string) => {
        this.currentGistId = id;
        void this.navigate('detail');
      });
    }
  }

  private bindRouteEvents(): void { // skipcq: JS-0010
    if (!this.container) return;

    if (this.currentRoute === 'detail' && this.currentGistId) {
      const detailContainer = this.container.querySelector('#gist-detail-container');
      if (detailContainer instanceof HTMLElement) {
        void loadGistDetail(
          this.currentGistId,
          detailContainer,
          () => {
            void this.navigate('home');
          },
          () => {},
          () => {}
        );
      }
    }

    // Create Form
    this.container.querySelector('#create-gist-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const desc = (this.container?.querySelector('#gist-description') as HTMLInputElement).value;
      const content = (this.container?.querySelector('#gist-content') as HTMLTextAreaElement).value;
      void (async () => {
        await gistStore.createGist(desc, true, { 'index.js': content });
        void this.navigate('home');
      })();
    });

    // Settings Token
    this.container.querySelector('#save-token-btn')?.addEventListener('click', () => {
      const input = this.container?.querySelector('#pat-input') as HTMLInputElement;
      if (input.value) {
        void (async () => {
          await saveToken(input.value);
          toast.success('TOKEN SAVED');
          void this.loadTokenInfo();
          input.value = '';
        })();
      } else {
        toast.error('ENTER A TOKEN');
      }
    });

    this.container.querySelector('#remove-token-btn')?.addEventListener('click', () => {
      void (async () => {
        const { setMetadata } = await import('../services/db');
        await setMetadata('github-pat', null);
        toast.success('TOKEN REMOVED');
        void this.loadTokenInfo();
      })();
    });

    // Settings Export/Import
    this.container.querySelector('#export-all-btn')?.addEventListener('click', () => {
      void (async () => {
        const { exportAllGists } = await import('../services/export-import');
        const blob = await exportAllGists();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gists-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('EXPORT COMPLETE');
      })();
    });

    this.container.querySelector('#import-btn')?.addEventListener('click', () => {
      (this.container?.querySelector('#import-file-input') as HTMLInputElement)?.click();
    });

    this.container.querySelector('#import-file-input')?.addEventListener('change', (e) => {
      void (async () => {
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
      })();
    });

    // Settings Cache
    this.container.querySelector('#clear-cache-btn')?.addEventListener('click', () => {
      void (async () => {
        if (await showConfirmDialog('CLEAR ALL LOCAL DATA?')) {
          const { clearAllData } = await import('../services/db');
          await clearAllData();
          window.location.reload();
        }
      })();
    });

    // Settings Export Data
    this.container.querySelector('#export-data-btn')?.addEventListener('click', () => {
      void (async () => {
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
          toast.success('DATA EXPORTED');
        } catch {
          toast.error('EXPORT FAILED');
        }
      })();
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
      const content =
        count > 0
          ? `<div class="glass-card" style="padding: var(--space-6); text-align: center;">
               <p class="micro-label">${count} operation${count !== 1 ? 's' : ''} waiting for connection</p>
             </div>`
          : EmptyState.render({
              title: 'All Synced',
              description: 'Your local changes are fully synced with GitHub',
              icon: '✅',
              actionLabel: 'Go Home',
              actionRoute: 'home',
            });

      opsEl.innerHTML = `<h3 class="form-label" style="margin-bottom: var(--space-4);">Pending Operations</h3>${content}`;
    }

    const { getConflicts } = await import('../services/sync/conflict-detector');
    const conflicts = await getConflicts();
    const conflictEl = this.container?.querySelector('#conflict-count');
    if (conflictEl) conflictEl.textContent = String(conflicts.length);

    const conflictCard = this.container?.querySelector('#conflicts-stat-card');
    conflictCard?.addEventListener('click', () => {
      void this.navigate('conflicts');
    });
  }

  private async showMobileMenu(): Promise<void> {
    const content = `
      <div class="mobile-menu" style="display: grid; gap: var(--space-2); padding: var(--space-4);">
        <button class="btn btn-ghost menu-item" data-route="home">Home</button>
        <button class="btn btn-ghost menu-item" data-route="starred">Starred Gists</button>
        <button class="btn btn-ghost menu-item" data-route="create">Create New Gist</button>
        <button class="btn btn-ghost menu-item" data-route="offline">Offline Status</button>
        <button class="btn btn-ghost menu-item" data-route="settings">Settings</button>
      </div>
    `;
    await bottomSheet.open(content, 'MENU');
  }

  private initializeCommandPalette(): void {
    commandPalette.setCommands([
      {
        id: 'home',
        title: 'Home',
        action: () => {
          void this.navigate('home');
        },
      },
      {
        id: 'starred',
        title: 'Starred Gists',
        action: () => {
          void this.navigate('starred');
        },
      },
      {
        id: 'create',
        title: 'Create New Gist',
        action: () => {
          void this.navigate('create');
        },
      },
      {
        id: 'conflicts',
        title: 'Sync Conflicts',
        action: () => {
          void this.navigate('conflicts');
        },
      },
      {
        id: 'settings',
        title: 'Settings',
        action: () => {
          void this.navigate('settings');
        },
      },
    ]);
  }

  public mount(element: HTMLElement): void {
    this.container = element;
    this.render();
    this.setupNavigation();
  }
}
