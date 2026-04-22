/**
 * Root App Component
 * Manages routing, global layout, and gist store integration
 */

import gistStore from '../stores/gist-store';
import { renderCard, bindCardEvents } from './gist-card';
import networkMonitor from '../services/network/offline-monitor';
import syncQueue from '../services/sync/queue';
import { getToken, saveToken } from '../services/github/auth';
import { loadGistDetail } from './gist-detail';
import { APP } from '../config/app.config';
import { redactToken, sanitizeHtml } from '../services/security';
import { commandPalette } from './ui/command-palette';
import { bottomSheet } from './ui/bottom-sheet';
import { withViewTransition } from '../utils/view-transitions';
import { toast } from './ui/toast';
import { showConfirmDialog } from '../utils/dialog';
import { loadConflictResolution } from './conflict-resolution';
import { loadEditForm } from './gist-edit';
import { renderRevisions } from './gist-detail';
import * as GitHub from '../services/github';

type Route =
  | 'home'
  | 'starred'
  | 'create'
  | 'offline'
  | 'settings'
  | 'detail'
  | 'edit'
  | 'revisions'
  | 'conflicts';
type Filter = 'all' | 'mine' | 'starred';
type SortKey = 'updated' | 'created' | 'title';
type SortOrder = 'asc' | 'desc';

export class App {
  private container: HTMLElement | null = null;
  private currentRoute: Route = 'home';
  private currentFilter: Filter = 'all';
  private searchQuery = '';
  private searchTimeout?: number;
  private currentSortKey: SortKey = 'updated';
  private currentSortOrder: SortOrder = 'desc';

  mount(container: HTMLElement): void {
    if (!container) throw new Error('App container not found');
    this.container = container;
    this.initializeTheme();
    this.render();
    this.setupNavigation();
    this.initializeCommandPalette();
    this.subscribeStore();

    window.addEventListener('app:sync-complete', () => {
      this.updateGistList().catch((err) => console.error(err));
    });
    window.addEventListener('online', () => {
      this.updateSyncIndicator().catch((err) => console.error(err));
    });
    window.addEventListener('offline', () => {
      this.updateSyncIndicator().catch((err) => console.error(err));
    });
  }

  private initializeTheme(): void {
    const stored = localStorage.getItem('theme-preference') || 'dark';
    document.documentElement.setAttribute('data-theme', stored);
  }

  private subscribeStore(): void {
    gistStore.subscribe(() => {
      if (this.currentRoute === 'home' || this.currentRoute === 'starred') {
        this.updateGistList().catch((err) => console.error(err));
      }
      this.updateSyncIndicator().catch((err) => console.error(err));
    });
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="app-shell" data-testid="app-shell" id="app">
        <header class="app-header">
          <div class="header-left">
            <h1 class="app-title" data-testid="app-title">${APP.name.toUpperCase()}</h1>
          </div>
          <div class="header-actions">
            <div id="sync-indicator" class="sync-indicator">
              <span class="sync-dot"></span>
              <span class="micro-label">SYNC</span>
            </div>
            <button class="btn btn-ghost icon-button" id="theme-toggle" aria-label="Toggle theme" data-testid="theme-toggle">🌓</button>
            <button class="btn btn-ghost icon-button" id="settings-btn" aria-label="Settings" data-testid="settings-btn">⚙️</button>
            <button class="btn btn-ghost icon-button" id="menu-btn" aria-label="Menu" data-testid="mobile-menu-btn">☰</button>
          </div>
        </header>

        <nav class="sidebar-nav" data-testid="sidebar-nav">
          ${this.renderNavItems('sidebar')}
        </nav>

        <nav class="rail-nav">
          ${this.renderNavItems('rail')}
        </nav>

        <main class="app-main" id="main-content" data-testid="main-content">
          ${this.getRouteContent()}
        </main>

        <nav class="bottom-nav" data-testid="bottom-nav">
          ${this.renderNavItems('bottom')}
        </nav>
      </div>
    `;
  }

  private renderNavItems(type: 'sidebar' | 'rail' | 'bottom'): string {
    const items = [
      { id: 'home', label: 'Gists', icon: '📋' },
      { id: 'starred', label: 'Starred', icon: '⭐' },
      { id: 'create', label: 'New', icon: '➕' },
      { id: 'offline', label: 'Offline', icon: '📴' },
      { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];

    return items
      .map(
        (item) => `
      <button class="${type}-item ${this.currentRoute === item.id ? 'active' : ''}"
              data-route="${item.id}"
              data-testid="${type === 'sidebar' ? 'sidebar-' + item.id : 'nav-' + item.id}">
        <span class="${type}-icon">${item.icon}</span>
        <span class="${type}-label">${item.label}</span>
      </button>
    `
      )
      .join('');
  }

  private getRouteContent(): string {
    switch (this.currentRoute) {
      case 'home':
        return this.getHomeRoute();
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

  private getCreateRoute(): string {
    return `
      <div class="route-create">
        <header class="detail-header">
            <h2 class="detail-title">Create New Gist</h2>
        </header>
        <form id="create-gist-form" class="gist-form">
          <div class="form-group">
            <label class="form-label">DESCRIPTION</label>
            <input type="text" id="gist-description" class="form-input" placeholder="Enter description..." />
          </div>
          <div class="form-group">
            <label class="form-label">FILE: index.js</label>
            <textarea id="gist-content" class="form-textarea" placeholder="Enter content..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary">CREATE GIST</button>
        </form>
      </div>
    `;
  }

  private getSettingsRoute(): string {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
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
                <label class="form-label">GitHub Token</label>
                <input type="password" id="pat-input" class="form-input" placeholder="ghp_..." />
                <div class="form-actions" style="margin-top: var(--space-2); display: flex; gap: var(--space-2);">
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
        <div id="logs-list" class="glass-card" style="margin-top: var(--space-6); padding: var(--space-4); max-height: 400px; overflow-y: auto;">
            <div class="micro-label">OFFLINE LOGS</div>
            <div id="logs-content" style="margin-top: var(--space-2);"></div>
        </div>
      </div>
    `;
  }

  private renderGistList(): string {
    if (gistStore.getLoading() && gistStore.getGists().length === 0) {
      return Array(3)
        .fill('')
        .map(
          () => `
        <div class="gist-card">
          <div class="gist-card-header">
            <div class="loading-skeleton" style="height:20px;flex:1;"></div>
          </div>
          <div class="loading-skeleton" style="height:14px;width:60%;margin-bottom:8px;"></div>
          <div class="loading-skeleton" style="height:12px;width:40%;"></div>
        </div>
      `
        )
        .join('');
    }

    let gists = gistStore.filterGists(this.currentFilter);

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      gists = gists.filter(
        (g) =>
          g.description?.toLowerCase().includes(q) ||
          Object.values(g.files).some((f) => f.filename.toLowerCase().includes(q))
      );
    }

    // Apply sorting
    gists = [...gists].sort((a, b) => {
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

    if (gists.length === 0) return '<div class="empty-state">No gists found</div>';
    return gists.map((g) => renderCard(g)).join('');
  }

  private setupNavigation(): void {
    if (!this.container) return;
    this.container.querySelectorAll('[data-route]').forEach((el) => {
      el.addEventListener('click', () => {
        const route = (el as HTMLElement).dataset.route as Route;
        if (route) {
          void this.navigate(route);
        }
      });
    });
    this.container.querySelector('#menu-btn')?.addEventListener('click', () => {
      void this.showMobileMenu();
    });
    this.container
      .querySelector('#theme-toggle')
      ?.addEventListener('click', () => this.toggleTheme());
    this.container.querySelector('#settings-btn')?.addEventListener('click', () => {
      void this.navigate('settings');
    });
    this.setupRouteHandlers();
  }

  private async navigate(route: Route): Promise<void> {
    this.currentRoute = route;
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
      if (route === 'offline') await this.updateOfflineStatus();
      if (route === 'conflicts') {
        const container = this.container?.querySelector('#conflicts-container');
        if (container) {
          await loadConflictResolution(container as HTMLElement);
        }
      }
    });
  }

  private async updateGistList(): Promise<void> {
    const listEl = this.container?.querySelector('#gist-list');
    if (listEl) {
      listEl.innerHTML = this.renderGistList();
      bindCardEvents(listEl as HTMLElement, (id) => {
        void this.navigateToDetail(id);
      });
    }
  }

  private async navigateToDetail(id: string): Promise<void> {
    this.currentRoute = 'detail';
    await withViewTransition(async () => {
      this.render();
      this.setupNavigation();
      const container = this.container?.querySelector('#gist-detail-container');
      if (container) {
        await loadGistDetail(
          id,
          container as HTMLElement,
          () => {
            void this.navigate('home');
          },
          (gid) => {
            void this.navigateToEdit(gid);
          },
          (gid) => {
            void this.navigateToRevisions(gid);
          }
        );
      }
    });
  }

  private async navigateToEdit(id: string): Promise<void> {
    this.currentRoute = 'edit';
    await withViewTransition(async () => {
      this.render();
      this.setupNavigation();
      const container = this.container?.querySelector('#gist-edit-container');
      if (container) {
        await loadEditForm(id, container as HTMLElement, () => {
          void this.navigateToDetail(id);
        });
      }
    });
  }

  private async navigateToRevisions(id: string): Promise<void> {
    this.currentRoute = 'revisions';
    await withViewTransition(async () => {
      this.render();
      this.setupNavigation();
      const container = this.container?.querySelector('#gist-revisions-container');
      if (container) {
        try {
          const revisions = await GitHub.listGistRevisions(id);
          container.innerHTML = renderRevisions(id, revisions);
          container.querySelector('#gist-back-btn')?.addEventListener('click', () => {
            void this.navigateToDetail(id);
          });
        } catch {
          toast.error('FAILED TO LOAD REVISIONS');
        }
      }
    });
  }

  private setupRouteHandlers(): void {
    if (!this.container) return;

    // Sort control
    this.container.querySelector('#sort-select')?.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement;
      const [sortKey, sortOrder] = select.value.split('-') as [SortKey, SortOrder];
      this.currentSortKey = sortKey;
      this.currentSortOrder = sortOrder;
      this.updateGistList().catch((err) => console.error(err));
    });

    // Search
    const searchInput = this.container.querySelector('.search-input') as HTMLInputElement | null;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      const val = (e.target as HTMLInputElement).value;
      this.searchTimeout = window.setTimeout(() => {
        this.searchQuery = val;
        void this.updateGistList();
      }, 300);
    });

    // Chips
    this.container.querySelector('.filter-chips')?.addEventListener('click', (e) => {
      const chip = (e.target as HTMLElement).closest('.chip') as HTMLElement;
      if (!chip) return;

      this.container!.querySelectorAll('.chip').forEach((b) => b.classList.remove('active'));
      chip.classList.add('active');
      this.currentFilter = (chip.dataset.filter as Filter) || 'all';
      void this.updateGistList();
    });

    // Forms
    this.container.querySelector('#create-gist-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const desc = (this.container?.querySelector('#gist-description') as HTMLInputElement).value;
      const content = (this.container?.querySelector('#gist-content') as HTMLTextAreaElement).value;
      void (async () => {
        await gistStore.createGist(desc, true, { 'index.js': content });
        await this.navigate('home');
      })();
    });

    // Settings
    this.container.querySelector('#save-token-btn')?.addEventListener('click', () => {
      const input = this.container?.querySelector('#pat-input') as HTMLInputElement;
      if (input.value) {
        void (async () => {
          await saveToken(input.value);
          toast.success('TOKEN SAVED');
          await this.loadTokenInfo();
        })();
      } else {
        toast.error('ENTER A TOKEN');
      }
    });

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

    this.container.querySelector('#clear-cache-btn')?.addEventListener('click', () => {
      void (async () => {
        if (await showConfirmDialog('CLEAR ALL LOCAL DATA?')) {
          const { clearAllData } = await import('../services/db');
          await clearAllData();
          window.location.reload();
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
    if (el) {
      el.setAttribute('data-status', online ? (len > 0 ? 'syncing' : 'online') : 'offline');
    }
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
        opsEl.innerHTML =
          '<h3>Pending Operations</h3><div class="empty-state"><p>No pending operations</p></div>';
      }
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

  private toggleTheme(): void {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme-preference', next);
  }

  private async showMobileMenu(): Promise<void> {
    const content = `
      <div class="mobile-menu" style="display: grid; gap: var(--space-2); padding: var(--space-4);">
        <button class="btn btn-ghost" data-route="home">HOME</button>
        <button class="btn btn-ghost" data-route="starred">STARRED</button>
        <button class="btn btn-ghost" data-route="create">CREATE</button>
        <button class="btn btn-ghost" data-route="offline">OFFLINE</button>
        <button class="btn btn-ghost" data-route="settings">SETTINGS</button>
      </div>
    `;
    await bottomSheet.open(content, 'MENU');
    setTimeout(() => {
      document.querySelectorAll('.mobile-menu .btn').forEach((b) => {
        b.addEventListener('click', () => {
          const r = (b as HTMLElement).dataset.route as Route;
          if (r) {
            void (async () => {
              await this.navigate(r);
              await bottomSheet.close();
            })();
          }
        });
      });
    }, 100);
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
}
