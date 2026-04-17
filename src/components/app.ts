/**
 * Root App Component
 * Manages routing, global layout, and gist store integration
 */

import gistStore from '../stores/gist-store';
import type { GistRecord } from '../services/db';
import { renderCard, bindCardEvents } from './gist-card';
import networkMonitor from '../services/network/offline-monitor';
import syncQueue from '../services/sync/queue';
import { getToken } from '../services/github/auth';
import { loadGistDetail } from './gist-detail';
import { APP } from '../config/app.config';
import { sanitizeHtml, redactToken } from '../services/security';
import { commandPalette } from './ui/command-palette';
import { bottomSheet } from './ui/bottom-sheet';
import { EmptyState } from './ui/empty-state';
import { withViewTransition } from '../utils/view-transitions';
import { lifecycle } from '../services/lifecycle';

type Route =
  | 'home'
  | 'starred'
  | 'create'
  | 'offline'
  | 'settings'
  | 'detail'
  | 'edit'
  | 'revisions';
type Filter = 'all' | 'mine' | 'starred';

export class App {
  private container: HTMLElement | null = null;
  private currentRoute: Route = 'home';
  private currentFilter: Filter = 'all';
  private searchQuery = '';
  private unsubStore?: () => void;
  private displayedGists: GistRecord[] = [];
  private searchTimeout?: number;

  mount(container: HTMLElement): void {
    if (!container) throw new Error('App container not found');
    this.container = container;
    this.render();
    this.setupNavigation();
    this.initializeCommandPalette();
    this.subscribeStore();

    window.addEventListener('app:navigate', (e: Event) => this.navigate((e as CustomEvent).detail));
    window.addEventListener('app:clear-search', () => {
      this.searchQuery = '';
      this.updateGistList();
    });
  }

  private subscribeStore(): void {
    this.unsubStore?.();
    this.unsubStore = gistStore.subscribe(() => this.onStoreUpdate());
  }

  private onStoreUpdate(): void {
    if (!this.container) return;
    if (this.currentRoute === 'home' || this.currentRoute === 'starred') {
      this.updateGistList();
    }
    if (this.currentRoute === 'offline') this.updateOfflineStatus();
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = `<div class="app-shell">
        <nav class="sidebar-nav">
          <button class="sidebar-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home">
            <span class="sidebar-icon">📋</span>
            <span class="sidebar-label">Gists</span>
          </button>
          <button class="sidebar-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred">
            <span class="sidebar-icon">⭐</span>
            <span class="sidebar-label">Starred</span>
          </button>
          <button class="sidebar-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create">
            <span class="sidebar-icon">➕</span>
            <span class="sidebar-label">New Gist</span>
          </button>
          <button class="sidebar-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline">
            <span class="sidebar-icon">📴</span>
            <span class="sidebar-label">Offline</span>
          </button>
          <button class="sidebar-item ${this.currentRoute === 'settings' ? 'active' : ''}" data-route="settings">
            <span class="sidebar-icon">⚙️</span>
            <span class="sidebar-label">Settings</span>
          </button>
        </nav>
        <header class="app-header">
          <h1 class="app-title">${APP.name}</h1>
          <div class="header-actions">
            <span id="sync-indicator" class="sync-indicator">
              <span class="sync-dot"></span>
            </span>
            <button id="mobile-menu-btn" class="icon-button mobile-only" aria-label="Menu"><span class="icon">☰</span></button>
            <button id="theme-toggle" class="icon-button" aria-label="Toggle theme"><span class="icon">🌓</span></button>
            <button id="settings-btn" class="icon-button" aria-label="Settings"><span class="icon">⚙️</span></button>
          </div>
        </header>
        <main class="app-main" id="main-content">${this.getRouteContent()}</main>
        <nav class="bottom-nav">
          <button class="nav-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home"><span class="nav-icon">📋</span><span class="nav-label">Gists</span></button>
          <button class="nav-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred"><span class="nav-icon">⭐</span><span class="nav-label">Starred</span></button>
          <button class="nav-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create"><span class="nav-icon">➕</span><span class="nav-label">New</span></button>
          <button class="nav-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline"><span class="nav-icon">📴</span><span class="nav-label">Offline</span></button>
        </nav>
      </div>`;
    this.initializeThemeToggle();
    this.updateSyncIndicator();
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
          <input type="text" class="search-input" placeholder="Search gists..." value="${this.searchQuery}" />
          <div class="filter-buttons">
            <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
            <button class="filter-btn ${this.currentFilter === 'mine' ? 'active' : ''}" data-filter="mine">Mine</button>
            <button class="filter-btn ${this.currentFilter === 'starred' ? 'active' : ''}" data-filter="starred">Starred</button>
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
            <label for="gist-description">Description</label>
            <input type="text" id="gist-description" class="form-input" />
          </div>
          <div class="files-section" id="files-section">
            <div class="file-editor">
              <input type="text" class="filename-input" placeholder="example.js" />
              <textarea class="content-editor" placeholder="Content..."></textarea>
            </div>
          </div>
          <button type="submit" class="primary-btn">Create Gist</button>
        </form>
      </div>
    `;
  }

  private getOfflineRoute(): string {
    return `
      <div class="route-offline">
        <h2>Offline</h2>
        <p>Pending: <span id="pending-count">0</span></p>
      </div>
    `;
  }

  private getSettingsRoute(): string {
    return `
      <div class="route-settings">
        <h2>Settings</h2>
        <div id="token-status"></div>
        <button id="export-data-btn" class="secondary-btn">Export Backup</button>
      </div>
    `;
  }

  private renderGistList(): string {
    if (this.displayedGists.length === 0) {
      if (this.searchQuery)
        return EmptyState.render({
          title: 'No Matches',
          description: `No gists matching "${this.searchQuery}".`,
          actionLabel: 'Clear Search',
          icon: '🔍',
        });
      return EmptyState.render({
        title: 'No Gists Yet',
        description: 'Create your first gist to get started.',
        actionLabel: 'Create Gist',
        actionRoute: 'create',
        icon: '📝',
      });
    }
    return this.displayedGists.map(renderCard).join('');
  }

  private updateGistList(): void {
    this.displayedGists =
      this.currentRoute === 'starred'
        ? gistStore.filterGists('starred')
        : gistStore.searchGists(this.searchQuery);

    if (this.currentRoute === 'home' && this.currentFilter !== 'all') {
      this.displayedGists = this.displayedGists.filter((g) =>
        this.currentFilter === 'starred' ? g.starred : !g.starred
      );
    }

    const listEl = this.container?.querySelector('#gist-list');
    if (listEl) {
      listEl.innerHTML = this.renderGistList();
      bindCardEvents(listEl as HTMLElement, (id) => this.navigateToDetail(id));
    }
  }

  private navigate(route: Route): void {
    lifecycle.cleanupRoute();
    this.currentRoute = route;
    withViewTransition(() => {
      this.render();
      this.setupNavigation();
      if (route === 'home' || route === 'starred') this.updateGistList();
      if (route === 'settings') this.loadTokenInfo();
    });
  }

  private navigateToDetail(id: string): void {
    this.currentRoute = 'detail';
    withViewTransition(async () => {
      this.render();
      this.setupNavigation();
      const container = this.container?.querySelector('#gist-detail-container');
      if (container)
        await loadGistDetail(
          id,
          container as HTMLElement,
          () => this.navigate('home'),
          () => this.navigate('edit'),
          () => this.navigate('revisions')
        );
    });
  }

  private setupNavigation(): void {
    if (!this.container) return;
    this.container.querySelectorAll('.nav-item, .sidebar-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const route = (e.currentTarget as HTMLElement).dataset.route as Route;
        if (route) this.navigate(route);
      });
    });
    this.container
      .querySelector('#theme-toggle')
      ?.addEventListener('click', () => this.toggleTheme());
    this.container
      .querySelector('#settings-btn')
      ?.addEventListener('click', () => this.navigate('settings'));
    this.container
      .querySelector('#mobile-menu-btn')
      ?.addEventListener('click', () => this.showMobileMenu());
    this.setupRouteHandlers();
  }

  private setupRouteHandlers(): void {
    if (!this.container) return;
    const searchInput = this.container.querySelector('.search-input') as HTMLInputElement | null;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      const query = (e.target as HTMLInputElement).value;
      this.searchTimeout = window.setTimeout(() => {
        this.searchQuery = query;
        this.updateGistList();
      }, 300);
    });
    this.container.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.currentFilter = (e.target as HTMLElement).dataset.filter as Filter;
        this.updateGistList();
      });
    });
  }

  private showMobileMenu(): void {
    const content = `
      <div class="mobile-menu">
        <button class="primary-btn menu-item" data-route="home">Home</button>
        <button class="primary-btn menu-item" data-route="starred">Starred</button>
        <button class="primary-btn menu-item" data-route="create">Create</button>
        <button class="primary-btn menu-item" data-route="settings">Settings</button>
      </div>
    `;
    bottomSheet.open(content, 'Menu');
    setTimeout(() => {
      document.querySelectorAll('.mobile-menu .menu-item').forEach((item) => {
        item.addEventListener('click', (e) => {
          const route = (e.currentTarget as HTMLElement).dataset.route as Route;
          if (route) {
            this.navigate(route);
            bottomSheet.close();
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
        icon: '🏠',
        category: 'Navigation',
        action: () => this.navigate('home'),
      },
      {
        id: 'starred',
        title: 'Starred Gists',
        icon: '⭐',
        category: 'Navigation',
        action: () => this.navigate('starred'),
      },
      {
        id: 'create',
        title: 'Create New Gist',
        icon: '➕',
        category: 'Actions',
        action: () => this.navigate('create'),
      },
      {
        id: 'settings',
        title: 'Settings',
        icon: '⚙️',
        category: 'Navigation',
        action: () => this.navigate('settings'),
      },
      {
        id: 'theme',
        title: 'Toggle Theme',
        icon: '🌓',
        category: 'Preferences',
        action: () => this.toggleTheme(),
      },
    ]);
  }

  private toggleTheme(): void {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme-preference', next);
  }

  private initializeThemeToggle(): void {
    const stored = localStorage.getItem('theme-preference');
    if (stored) document.documentElement.setAttribute('data-theme', stored);
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }

  private async updateSyncIndicator(): Promise<void> {
    if (!this.container) return;
    const indicator = this.container.querySelector('#sync-indicator');
    const online = networkMonitor.isOnline();
    const pendingCount = await syncQueue.getQueueLength();
    indicator?.classList.toggle('syncing', pendingCount > 0 && online);
    indicator?.classList.toggle('offline', !online);
  }

  private async loadTokenInfo(): Promise<void> {
    const statusEl = this.container?.querySelector('#token-status');
    if (!statusEl) return;
    const token = await getToken();
    if (token) {
      const masked = redactToken(token);
      statusEl.innerHTML = `<p class="token-saved">Token saved: ${sanitizeHtml(masked)}</p>`;
    } else {
      statusEl.innerHTML = `<p class="token-missing">No token saved.</p>`;
    }
  }

  private async updateOfflineStatus(): Promise<void> {
    const pendingEl = this.container?.querySelector('#pending-count');
    if (pendingEl) pendingEl.textContent = String(await syncQueue.getQueueLength());
  }
}
