/**
 * Root App Component
 * Manages routing, global layout, and gist store integration
 */

import gistStore from '../stores/gist-store';
import type { GistRecord } from '../services/db';
import { renderCard, bindCardEvents } from './gist-card';
import networkMonitor from '../services/network/offline-monitor';
import syncQueue from '../services/sync/queue';
import { getToken, saveToken, removeToken } from '../services/github/auth';
import { loadGistDetail } from './gist-detail';
import { APP } from '../config/app.config';
import { sanitizeHtml, redactToken } from '../services/security';
import { commandPalette } from './ui/command-palette';
import { bottomSheet } from './ui/bottom-sheet';
import { EmptyState } from './ui/empty-state';
import { withViewTransition } from '../utils/view-transitions';
import { lifecycle } from '../services/lifecycle';
import { safeLog, LogEntry } from '../services/security/logger';
import { Skeleton } from './ui/skeleton';
import { toast } from './ui/toast';

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

    // Command + K listener
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        commandPalette.open();
      }
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

    const navItems = [
      { id: 'home', label: 'Gists', icon: '📋' },
      { id: 'starred', label: 'Starred', icon: '⭐' },
      { id: 'create', label: 'New', icon: '➕' },
      { id: 'offline', label: 'Offline', icon: '📴' },
      { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];

    const sidebarHtml = navItems
      .map(
        (item) => `
      <button class="sidebar-item ${this.currentRoute === item.id ? 'active' : ''}" data-route="${item.id}" data-testid="sidebar-${item.id}">
        <span class="sidebar-icon">${item.icon}</span>
        <span class="sidebar-label">${item.label}</span>
      </button>
    `
      )
      .join('');

    const railHtml = navItems
      .map(
        (item) => `
      <button class="rail-item ${this.currentRoute === item.id ? 'active' : ''}" data-route="${item.id}" data-testid="rail-${item.id}">
        <span class="rail-icon">${item.icon}</span>
        <span class="rail-label">${item.label}</span>
      </button>
    `
      )
      .join('');

    const bottomNavHtml = navItems
      .filter((i) => i.id !== 'settings')
      .map(
        (item) => `
      <button class="nav-item ${this.currentRoute === item.id ? 'active' : ''}" data-route="${item.id}" data-testid="nav-${item.id}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
      </button>
    `
      )
      .join('');

    this.container.innerHTML = `<div class="app-shell">
        <nav class="sidebar-nav">
          ${sidebarHtml}
        </nav>
        <nav class="rail-nav">
          ${railHtml}
        </nav>
        <header class="app-header">
          <h1 class="app-title">${APP.name}</h1>
          <div class="header-actions">
            <span id="sync-indicator" class="sync-indicator">
              <span class="sync-dot"></span>
            </span>
            <button id="mobile-menu-btn" class="icon-button mobile-only" aria-label="Menu" data-testid="mobile-menu-btn"><span class="icon">☰</span></button>
            <button id="theme-toggle" class="icon-button" aria-label="Toggle theme" data-testid="theme-toggle"><span class="icon">🌓</span></button>
            <button id="settings-btn" class="icon-button" aria-label="Settings" data-testid="settings-btn"><span class="icon">⚙️</span></button>
          </div>
        </header>
        <main class="app-main" id="main-content">${this.getRouteContent()}</main>
        <nav class="bottom-nav">
          ${bottomNavHtml}
        </nav>
      </div>`;
    this.initializeThemeToggle();
    this.updateSyncIndicator();
  }

  private getRouteContent(): string {
    const routeHandlers: { [key: string]: () => string } = {
      home: () => this.getHomeRoute(),
      starred: () => this.getStarredRoute(),
      create: () => this.getCreateRoute(),
      offline: () => this.getOfflineRoute(),
      settings: () => this.getSettingsRoute(),
      detail: () => '<div id="gist-detail-container"></div>',
      edit: () => '<div id="gist-edit-container"></div>',
    };
    const handler = routeHandlers[this.currentRoute];
    return handler ? handler() : this.getHomeRoute();
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
        <h2>Offline Status</h2>
        <p>Pending writes: <span id="pending-count">0</span></p>
        <div id="offline-logs-container" class="settings-section" style="margin-top: var(--spacing-4);">
            <div class="settings-section-header">
                <h3>Offline Logs</h3>
            </div>
            <div class="settings-section-content">
                <button id="refresh-logs-btn" class="secondary-btn">Refresh Logs</button>
                <button id="export-logs-btn" class="secondary-btn">Export Logs</button>
                <div id="logs-list" style="max-height: 300px; overflow-y: auto; font-family: var(--font-family-mono); font-size: var(--font-size-xs); margin-top: var(--spacing-2);">
                    Loading logs...
                </div>
            </div>
        </div>
      </div>
    `;
  }

  private getSettingsRoute(): string {
    return `
      <div class="route-settings">
        <h2>Settings</h2>
        <div class="settings-panel">
            <details class="settings-section" open>
                <summary class="settings-section-header">
                    <h3>Authentication</h3>
                    <span class="section-toggle-icon">▼</span>
                </summary>
                <div class="settings-section-content">
                    <div id="token-status"></div>
                    <div class="form-group" style="margin-top: var(--spacing-4);">
                        <label for="pat-input">Personal Access Token</label>
                        <input type="password" id="pat-input" class="form-input" placeholder="ghp_..." />
                        <p class="help-text">Gist Hub uses your PAT to sync gists with GitHub.</p>
                    </div>
                    <div class="form-actions" style="margin-top: var(--spacing-4);">
                        <button id="save-token-btn" class="primary-btn">Save Token</button>
                        <button id="remove-token-btn" class="secondary-btn">Remove Token</button>
                    </div>
                </div>
            </details>

            <details class="settings-section">
                <summary class="settings-section-header">
                    <h3>Preferences</h3>
                    <span class="section-toggle-icon">▼</span>
                </summary>
                <div class="settings-section-content">
                    <div class="form-group">
                        <label for="theme-select">Theme</label>
                        <select id="theme-select" class="form-input">
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>
                </div>
            </details>

            <details class="settings-section">
                <summary class="settings-section-header">
                    <h3>Data & Diagnostics</h3>
                    <span class="section-toggle-icon">▼</span>
                </summary>
                <div class="settings-section-content">
                    <div id="diagnostics-info" class="diagnostics-info" style="margin-bottom: var(--spacing-4);">
                        <p>Loading diagnostics...</p>
                    </div>
                    <div class="form-actions">
                        <button id="export-data-btn" class="secondary-btn">Export Backup</button>
                        <button id="export-diagnostics-btn" class="secondary-btn">Export Logs</button>
                        <button id="clear-cache-btn" class="secondary-btn" style="color: var(--color-status-error-fg);" data-testid="clear-cache-btn">Clear Local Cache</button>
                    </div>
                </div>
            </details>
        </div>
      </div>
    `;
  }

  private renderGistList(): string {
    if (gistStore.getLoading() && this.displayedGists.length === 0) {
      return Skeleton.renderList(5);
    }

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
      if (route === 'settings') {
        this.loadTokenInfo();
        this.loadDiagnostics();
      }
      if (route === 'offline') this.loadOfflineLogs();
    });
  }

  private navigateToDetail(id: string): void {
    this.currentRoute = 'detail';
    withViewTransition(async () => {
      this.render();
      this.setupNavigation();
      const container = this.container?.querySelector('#gist-detail-container');
      if (container) {
        container.innerHTML = Skeleton.renderDetail();
        await loadGistDetail(
          id,
          container as HTMLElement,
          () => this.navigate('home'),
          () => this.navigate('edit'),
          () => this.navigate('revisions')
        );
      }
    });
  }

  private setupNavigation(): void {
    if (!this.container) return;
    this.container.querySelectorAll('.nav-item, .sidebar-item, .rail-item').forEach((item) => {
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

    // Settings specific
    if (this.currentRoute === 'settings') {
      this.container.querySelector('#save-token-btn')?.addEventListener('click', async () => {
        const input = this.container?.querySelector('#pat-input') as HTMLInputElement;
        const token = input.value.trim();
        if (!token) {
          toast.error('Please enter a token');
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
      });

      this.container.querySelector('#remove-token-btn')?.addEventListener('click', async () => {
        if (window.confirm('Are you sure you want to remove your token and log out?')) {
          await removeToken();
          toast.info('Logged out');
          this.loadTokenInfo();
        }
      });

      const themeSelect = this.container.querySelector('#theme-select') as HTMLSelectElement;
      if (themeSelect) {
        themeSelect.value = document.documentElement.getAttribute('data-theme') || 'light';
        themeSelect.addEventListener('change', () => {
          const next = themeSelect.value as 'light' | 'dark';
          document.documentElement.setAttribute('data-theme', next);
          localStorage.setItem('theme-preference', next);
        });
      }

      this.container
        .querySelector('#export-diagnostics-btn')
        ?.addEventListener('click', async () => {
          const { getOfflineLogs } = await import('../services/security/logger');
          const logs = await getOfflineLogs();
          const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const downloadLink = document.createElement('a');
          downloadLink.id = 'export-diagnostics-download';
          downloadLink.href = url;
          downloadLink.download = `gist-hub-logs-${Date.now()}.json`;
          downloadLink.click();
        });
    }

    // Offline logs refresh
    this.container
      .querySelector('#refresh-logs-btn')
      ?.addEventListener('click', () => this.loadOfflineLogs());
    this.container.querySelector('#export-logs-btn')?.addEventListener('click', () => {
      this.container
        ?.querySelector('#export-diagnostics-btn')
        ?.dispatchEvent(new MouseEvent('click'));
    });

    // Data management
    this.container.querySelector('#export-data-btn')?.addEventListener('click', async () => {
      const { exportData } = await import('../services/db');
      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `gist-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
      downloadLink.click();
    });

    // Clear cache
    this.container.querySelector('#clear-cache-btn')?.addEventListener('click', async () => {
      if (
        window.confirm(
          'Are you sure you want to clear all local data? This will log you out and clear all cached gists and logs.'
        )
      ) {
        const { clearAllData } = await import('../services/db');
        await clearAllData();
        window.location.reload();
      }
    });
  }

  private showMobileMenu(): void {
    const content = `
      <div class="mobile-menu" style="display: grid; gap: var(--spacing-2); padding: var(--spacing-4);">
        <button class="primary-btn menu-item" data-route="home">Home</button>
        <button class="primary-btn menu-item" data-route="starred">Starred</button>
        <button class="primary-btn menu-item" data-route="create">Create</button>
        <button class="primary-btn menu-item" data-route="offline">Offline Status</button>
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
        id: 'offline',
        title: 'Offline Status',
        icon: '📴',
        category: 'Navigation',
        action: () => this.navigate('offline'),
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

  private async loadOfflineLogs(): Promise<void> {
    const listEl = this.container?.querySelector('#logs-list');
    if (!listEl) return;

    try {
      const { getOfflineLogs } = await import('../services/security/logger');
      const logs = await getOfflineLogs();
      if (logs.length === 0) {
        listEl.innerHTML = '<p>No logs found.</p>';
        return;
      }

      listEl.innerHTML = logs
        .slice(-50)
        .reverse()
        .map(
          (log: LogEntry) => `
            <div style="border-bottom: 1px solid var(--color-border-default); padding: var(--spacing-1) 0;">
                <span style="color: var(--color-foreground-muted);">${new Date(log.timestamp).toLocaleTimeString()}</span>
                <span style="color: ${log.level === 'error' ? 'var(--color-status-error-fg)' : log.level === 'warn' ? 'var(--color-status-warning-fg)' : 'inherit'}; font-weight: bold;">[${log.level.toUpperCase()}]</span>
                ${sanitizeHtml(log.message)}
            </div>
          `
        )
        .join('');
    } catch (err) {
      listEl.innerHTML = '<p>Failed to load logs.</p>';
      safeLog('Failed to load logs', err);
    }
  }

  private async loadDiagnostics(): Promise<void> {
    const diagEl = this.container?.querySelector('#diagnostics-info');
    if (!diagEl) return;

    const online = networkMonitor.isOnline();
    const queueLen = await syncQueue.getQueueLength();
    const gists = gistStore.getGists();

    diagEl.innerHTML = `
        <div class="diagnostics-content">
            <p><strong>Network:</strong> ${online ? '🟢 Online' : '🔴 Offline'}</p>
            <p><strong>Sync Queue:</strong> ${queueLen} pending</p>
            <p><strong>Local Gists:</strong> ${gists.length} cached</p>
            <p><strong>Platform:</strong> ${navigator.userAgent.includes('Capacitor') ? 'Mobile (Android)' : 'Web (PWA)'}</p>
        </div>
      `;
  }
}
