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
    window.addEventListener('online', () => {
      void this.updateSyncIndicator();
    });
    window.addEventListener('offline', () => {
      void this.updateSyncIndicator();
    });
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
      void this.updateSyncIndicator();
    });
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="app-shell">
        <header class="app-header">
          <div class="header-left">
            <h1 class="app-title">${APP.name}</h1>
          </div>
          <div class="header-actions">
            <div id="sync-indicator" class="sync-indicator">
              <span class="sync-dot"></span>
              <span class="micro-label">Sync</span>
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
      { id: 'home', label: 'Home', icon: '🏠' },
      { id: 'starred', label: 'Starred Gists', icon: '⭐' },
      { id: 'create', label: 'Create New Gist', icon: '➕' },
      { id: 'offline', label: 'Offline Status', icon: '📴' },
      { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];

    return items
      .map(
        (item) => `
      <button class="${type}-item ${this.currentRoute === item.id ? 'active' : ''}" data-route="${item.id}" data-testid="${item.id}-btn">
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
            <input type="text" class="search-input" placeholder="Search gists..." value="${this.searchQuery}" />
          </div>
          <div class="filter-buttons filter-chips">
            <button class="chip ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
            <button class="chip ${this.currentFilter === 'mine' ? 'active' : ''}" data-filter="mine">Mine</button>
            <button class="chip ${this.currentFilter === 'starred' ? 'active' : ''}" data-filter="starred">Starred</button>
          </div>
          <div class="sort-container">
            <select id="sort-select" class="form-select">
              <option value="updated-desc">Updated (Newest)</option>
              <option value="updated-asc">Updated (Oldest)</option>
              <option value="created-desc">Created (Newest)</option>
              <option value="created-asc">Created (Oldest)</option>
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
            <label class="form-label">Description</label>
            <input type="text" id="gist-description" class="form-input" placeholder="Enter description..." />
          </div>
          <div class="form-group">
            <label class="form-label">File: index.js</label>
            <textarea id="gist-content" class="form-textarea" placeholder="Enter content..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary">Create Gist</button>
        </form>
      </div>
    `;
  }

  private getSettingsRoute(): string {
    return `
      <div class="route-settings">
        <header class="detail-header">
            <h2 class="detail-title">Settings</h2>
        </header>
        <div class="settings-panel">
            <details open>
                <summary class="form-label">Authentication</summary>
                <div class="form-group">
                    <label class="form-label">GitHub Token</label>
                    <input type="password" id="pat-input" class="form-input" placeholder="ghp_..." />
                    <div class="form-actions" style="margin-top: var(--space-2); display: flex; gap: var(--space-2);">
                        <button id="save-token-btn" class="btn btn-primary">Save</button>
                        <button id="remove-token-btn" class="btn btn-ghost">Remove</button>
                    </div>
                    <div id="token-status" style="margin-top: var(--space-2);"></div>
                </div>
            </details>

            <details>
                <summary class="form-label">Preferences</summary>
                <div class="form-group">
                    <label class="form-label">Theme</label>
                    <select id="theme-select" class="form-select">
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                    </select>
                </div>
            </details>

            <details>
                <summary class="form-label">Data & Diagnostics</summary>
                <div class="form-group">
                    <div class="form-actions" style="display: flex; gap: var(--space-2);">
                        <button id="clear-cache-btn" class="btn btn-danger">Clear Local Cache</button>
                        <button id="export-data-btn" class="btn btn-ghost">Export Data</button>
                    </div>
                    <div id="diagnostics-info" class="micro-label" style="margin-top: var(--space-4);">
                        Version: 0.1.0
                    </div>
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
        <div class="stat-card">
            <div class="stat-icon">📴</div>
            <div class="stat-info">
                <div class="stat-label">Pending Writes</div>
                <div class="stat-value" id="pending-count">0</div>
            </div>
        </div>
        <div id="logs-list" class="glass-card" style="margin-top: var(--space-6); padding: var(--space-4); max-height: 400px; overflow-y: auto;">
            <div class="micro-label">Offline Logs</div>
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
    if (searched.length === 0) return '<div class="empty-state">No Gists Found</div>';
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

    this.container.querySelector('#theme-select')?.addEventListener('change', (e) => {
      const theme = (e.target as HTMLSelectElement).value;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme-preference', theme);
    });

    this.setupRouteHandlers();
  }

  private navigate(route: Route): void {
    this.currentRoute = route;
    void withViewTransition(() => {
      this.render();
      this.setupNavigation();
      if (route === 'home' || route === 'starred') this.updateGistList();
      if (route === 'settings') void this.loadTokenInfo();
      if (route === 'offline') void this.updateOfflineStatus();
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
        // Update active class immediately for feedback and tests
        this.container?.querySelectorAll('.chip').forEach((chip) => {
          chip.classList.toggle(
            'active',
            (chip as HTMLElement).dataset.filter === this.currentFilter
          );
        });
      });
    });

    // Forms
    this.container.querySelector('#create-gist-form')?.addEventListener('submit', (e) => {
      void (async () => {
        e.preventDefault();
        const desc = (this.container?.querySelector('#gist-description') as HTMLInputElement).value;
        const content = (this.container?.querySelector('#gist-content') as HTMLTextAreaElement).value;
        await gistStore.createGist(desc, true, { 'index.js': content });
        this.navigate('home');
      })();
    });

    // Settings
    this.container.querySelector('#save-token-btn')?.addEventListener('click', () => {
      void (async () => {
        const input = this.container?.querySelector('#pat-input') as HTMLInputElement;
        if (input.value) {
          await saveToken(input.value);
          toast.success('Token Saved');
          void this.loadTokenInfo();
        } else {
          toast.error('Token Required');
        }
      })();
    });

    this.container.querySelector('#clear-cache-btn')?.addEventListener('click', () => {
      void (async () => {
        if (await showConfirmDialog('Clear all local data?')) {
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
    if (el)
      el.innerHTML = token
        ? `<p class="micro-label">Token Active: ${redactToken(token)}</p>`
        : '<p class="micro-label">No Token Saved</p>';
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
        <button class="btn btn-ghost" data-route="home">Home</button>
        <button class="btn btn-ghost" data-route="starred">Starred Gists</button>
        <button class="btn btn-ghost" data-route="create">Create New Gist</button>
        <button class="btn btn-ghost" data-route="offline">Offline Status</button>
        <button class="btn btn-ghost" data-route="settings">Settings</button>
      </div>
    `;
    void bottomSheet.open(content, 'Menu');
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
      { id: 'home', title: 'Home', action: () => this.navigate('home') },
      { id: 'starred', title: 'Starred Gists', action: () => this.navigate('starred') },
      { id: 'create', title: 'Create New Gist', action: () => this.navigate('create') },
      { id: 'settings', title: 'Settings', action: () => this.navigate('settings') },
    ]);
  }
}
