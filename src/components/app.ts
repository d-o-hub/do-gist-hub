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
import { redactToken } from '../services/security';
import { commandPalette } from './ui/command-palette';
import { bottomSheet } from './ui/bottom-sheet';
import { withViewTransition } from '../utils/view-transitions';
import { toast } from './ui/toast';
import { showConfirmDialog } from '../utils/dialog';

type Route = 'home' | 'starred' | 'create' | 'offline' | 'settings' | 'detail' | 'edit';
type Filter = 'all' | 'mine' | 'starred';

export class App {
  private container: HTMLElement | null = null;
  private currentRoute: Route = 'home';
  private currentFilter: Filter = 'all';
  private searchQuery = '';
  private searchTimeout?: number;

  mount(container: HTMLElement): void {
    if (!container) throw new Error('App container not found');
    this.container = container;
    this.initializeTheme();
    this.render();
    this.setupNavigation();
    this.initializeCommandPalette();
    this.subscribeStore();

    window.addEventListener('app:sync-complete', () => this.updateGistList());
    window.addEventListener('online', () => this.updateSyncIndicator());
    window.addEventListener('offline', () => this.updateSyncIndicator());
  }

  private initializeTheme(): void {
    const stored = localStorage.getItem('theme-preference') || 'dark';
    document.documentElement.setAttribute('data-theme', stored);
  }

  private subscribeStore(): void {
    gistStore.subscribe(() => {
      if (this.currentRoute === 'home' || this.currentRoute === 'starred') {
        this.updateGistList();
      }
      this.updateSyncIndicator();
    });
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="app-shell">
        <header class="app-header">
          <div class="header-left">
            <h1 class="app-title">${APP.name.toUpperCase()}</h1>
          </div>
          <div class="header-actions">
            <div id="sync-indicator" class="sync-indicator">
              <span class="sync-dot"></span>
              <span class="micro-label">SYNC</span>
            </div>
            <button class="btn btn-ghost" id="theme-toggle" aria-label="Toggle theme">🌓</button>
            <button class="btn btn-ghost" id="menu-btn" aria-label="Menu">☰</button>
          </div>
        </header>

        <nav class="sidebar-nav">
          ${this.renderNavItems('sidebar')}
        </nav>

        <nav class="rail-nav">
          ${this.renderNavItems('rail')}
        </nav>

        <main class="app-main" id="main-content">
          ${this.getRouteContent()}
        </main>

        <nav class="bottom-nav">
          ${this.renderNavItems('bottom')}
        </nav>
      </div>
    `;
  }

  private renderNavItems(type: 'sidebar' | 'rail' | 'bottom'): string {
    const items = [
      { id: 'home', label: 'HOME', icon: '🏠' },
      { id: 'starred', label: 'STARRED', icon: '⭐' },
      { id: 'create', label: 'CREATE', icon: '➕' },
      { id: 'offline', label: 'OFFLINE', icon: '📴' },
      { id: 'settings', label: 'SETTINGS', icon: '⚙️' },
    ];

    return items
      .map(
        (item) => `
      <button class="${type}-item ${this.currentRoute === item.id ? 'active' : ''}" data-route="${item.id}">
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
      case 'settings':
        return this.getSettingsRoute();
      case 'detail':
        return '<div id="gist-detail-container"></div>';
      default:
        return this.getHomeRoute();
    }
  }

  private getHomeRoute(): string {
    return `
      <div class="route-home">
        <div class="gist-list-header">
          <div class="search-container">
            <input type="text" class="search-input" placeholder="SEARCH GISTS..." value="${this.searchQuery}" />
          </div>
          <div class="filter-chips">
            <button class="chip ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">ALL</button>
            <button class="chip ${this.currentFilter === 'mine' ? 'active' : ''}" data-filter="mine">MINE</button>
            <button class="chip ${this.currentFilter === 'starred' ? 'active' : ''}" data-filter="starred">STARRED</button>
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
            <h1 class="detail-title">STARRED GISTS</h1>
        </header>
        <div class="gist-list" id="gist-list">${this.renderGistList()}</div>
      </div>
    `;
  }

  private getCreateRoute(): string {
    return `
      <div class="route-create">
        <header class="detail-header">
            <h1 class="detail-title">CREATE NEW GIST</h1>
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
    return `
      <div class="route-settings">
        <header class="detail-header">
            <h1 class="detail-title">SETTINGS</h1>
        </header>
        <div class="settings-panel">
            <div class="form-group">
                <label class="form-label">GITHUB TOKEN</label>
                <input type="password" id="pat-input" class="form-input" placeholder="ghp_..." />
                <div class="form-actions" style="margin-top: var(--space-2); display: flex; gap: var(--space-2);">
                    <button id="save-token-btn" class="btn btn-primary">SAVE</button>
                    <button id="remove-token-btn" class="btn btn-ghost">REMOVE</button>
                </div>
                <div id="token-status" style="margin-top: var(--space-2);"></div>
            </div>
            <div class="form-group">
                <label class="form-label">DATA MANAGEMENT</label>
                <div class="form-actions" style="display: flex; flex-wrap: wrap; gap: var(--space-2);">
                    <button id="export-data-btn" class="btn btn-secondary">EXPORT ALL GISTS</button>
                    <button id="import-data-btn" class="btn btn-secondary">IMPORT BACKUP</button>
                    <button id="clear-cache-btn" class="btn btn-danger">CLEAR LOCAL CACHE</button>
                </div>
                <input type="file" id="import-file-input" accept=".json" style="display: none;" />
            </div>
        </div>
      </div>
    `;
  }

  private getOfflineRoute(): string {
    return `
      <div class="route-offline">
        <header class="detail-header">
            <h1 class="detail-title">OFFLINE STATUS</h1>
        </header>
        <div class="stat-card">
            <div class="stat-icon">📴</div>
            <div class="stat-info">
                <div class="stat-label">PENDING WRITES</div>
                <div class="stat-value" id="pending-count">0</div>
            </div>
        </div>
        <div id="logs-list" class="glass-card" style="margin-top: var(--space-6); padding: var(--space-4); max-height: 400px; overflow-y: auto;">
            <div class="micro-label">OFFLINE LOGS</div>
            <div id="logs-content" style="margin-top: var(--space-2);"></div>
        </div>
      </div>
    `;
  }

  private renderGistList(): string {
    const filtered = gistStore.filterGists(this.currentFilter);
    const searched = this.searchQuery
      ? filtered.filter((g) =>
          g.description?.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
      : filtered;
    if (searched.length === 0) return '<div class="empty-state">NO GISTS FOUND</div>';
    return searched.map((g) => renderCard(g)).join('');
  }

  private setupNavigation(): void {
    if (!this.container) return;
    this.container.querySelectorAll('[data-route]').forEach((el) => {
      el.addEventListener('click', () => {
        const route = (el as HTMLElement).dataset.route as Route;
        if (route) this.navigate(route);
      });
    });
    this.container
      .querySelector('#menu-btn')
      ?.addEventListener('click', () => this.showMobileMenu());
    this.container
      .querySelector('#theme-toggle')
      ?.addEventListener('click', () => this.toggleTheme());
    this.setupRouteHandlers();
  }

  private navigate(route: Route): void {
    this.currentRoute = route;
    void withViewTransition(() => {
      this.render();
      this.setupNavigation();
      if (route === 'home' || route === 'starred') this.updateGistList();
      if (route === 'settings') this.loadTokenInfo();
      if (route === 'offline') this.updateOfflineStatus();
    });
  }

  private updateGistList(): void {
    const listEl = this.container?.querySelector('#gist-list');
    if (listEl) {
      listEl.innerHTML = this.renderGistList();
      bindCardEvents(listEl as HTMLElement, (_id) => this.navigateToDetail(_id));
    }
  }

  private navigateToDetail(id: string): void {
    this.currentRoute = 'detail';
    void withViewTransition(async () => {
      this.render();
      this.setupNavigation();
      const container = this.container?.querySelector('#gist-detail-container');
      if (container) {
        await loadGistDetail(
          id,
          container as HTMLElement,
          () => this.navigate('home'),
          (_id) => {},
          (_id, _v) => {}
        );
      }
    });
  }

  private setupRouteHandlers(): void {
    if (!this.container) return;

    // Search
    const searchInput = this.container.querySelector('.search-input') as HTMLInputElement | null;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      const val = (e.target as HTMLInputElement).value;
      this.searchTimeout = window.setTimeout(() => {
        this.searchQuery = val;
        this.updateGistList();
      }, 300);
    });

    // Chips
    this.container.querySelectorAll('.chip').forEach((c) => {
      c.addEventListener('click', () => {
        this.currentFilter = (c as HTMLElement).dataset.filter as Filter;
        this.updateGistList();
      });
    });

    // Forms
    this.container.querySelector('#create-gist-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const desc = (this.container?.querySelector('#gist-description') as HTMLInputElement).value;
      const content = (this.container?.querySelector('#gist-content') as HTMLTextAreaElement).value;
      await gistStore.createGist(desc, true, { 'index.js': content });
      this.navigate('home');
    });

    // Settings
    this.container.querySelector('#save-token-btn')?.addEventListener('click', async () => {
      const input = this.container?.querySelector('#pat-input') as HTMLInputElement;
      if (input.value) {
        await saveToken(input.value);
        toast.success('TOKEN SAVED');
        this.loadTokenInfo();
      }
    });

    this.container.querySelector('#export-data-btn')?.addEventListener('click', async () => {
      const { exportAllGists } = await import('../services/export-import');
      const blob = await exportAllGists();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gist-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('EXPORT STARTED');
    });

    this.container.querySelector('#import-data-btn')?.addEventListener('click', () => {
      (this.container?.querySelector('#import-file-input') as HTMLInputElement)?.click();
    });

    this.container.querySelector('#import-file-input')?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const { importGists } = await import('../services/export-import');
      toast.info('IMPORTING...');
      const result = await importGists(file);

      if (result.errors.length > 0 && result.imported === 0 && result.updated === 0) {
        toast.error('IMPORT FAILED');
      } else {
        toast.success(`IMPORTED: ${result.imported}, UPDATED: ${result.updated}`);
        if (result.conflicts > 0) {
          toast.warn(`${result.conflicts} CONFLICTS DETECTED`);
        }
        gistStore.fetchGists(); // Refresh store
      }
      // Reset input
      (e.target as HTMLInputElement).value = '';
    });

    this.container.querySelector('#clear-cache-btn')?.addEventListener('click', async () => {
      if (await showConfirmDialog('CLEAR ALL LOCAL DATA?')) {
        const { clearAllData } = await import('../services/db');
        await clearAllData();
        window.location.reload();
      }
    });
  }

  private async loadTokenInfo(): Promise<void> {
    const el = this.container?.querySelector('#token-status');
    const token = await getToken();
    if (el)
      el.innerHTML = token
        ? `<p class="micro-label">TOKEN ACTIVE: ${redactToken(token)}</p>`
        : '<p class="micro-label">NO TOKEN SAVED</p>';
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
    const el = this.container?.querySelector('#pending-count');
    if (el) el.textContent = String(await syncQueue.getQueueLength());
  }

  private toggleTheme(): void {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme-preference', next);
  }

  private showMobileMenu(): void {
    const content = `
      <div class="mobile-menu" style="display: grid; gap: var(--space-2); padding: var(--space-4);">
        <button class="btn btn-ghost" data-route="home">HOME</button>
        <button class="btn btn-ghost" data-route="starred">STARRED</button>
        <button class="btn btn-ghost" data-route="create">CREATE</button>
        <button class="btn btn-ghost" data-route="offline">OFFLINE</button>
        <button class="btn btn-ghost" data-route="settings">SETTINGS</button>
      </div>
    `;
    void bottomSheet.open(content, 'MENU');
    setTimeout(() => {
      document.querySelectorAll('.mobile-menu .btn').forEach((b) => {
        b.addEventListener('click', () => {
          const r = (b as HTMLElement).dataset.route as Route;
          if (r) {
            this.navigate(r);
            void bottomSheet.close();
          }
        });
      });
    }, 100);
  }

  private initializeCommandPalette(): void {
    commandPalette.setCommands([
      { id: 'home', title: 'HOME', action: () => this.navigate('home') },
      { id: 'starred', title: 'STARRED GISTS', action: () => this.navigate('starred') },
      { id: 'create', title: 'CREATE NEW GIST', action: () => this.navigate('create') },
      { id: 'settings', title: 'SETTINGS', action: () => this.navigate('settings') },
    ]);
  }
}
