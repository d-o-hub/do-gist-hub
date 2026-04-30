/**
 * Root App Component
 */

import networkMonitor from '../services/network/offline-monitor';
import syncQueue from '../services/sync/queue';
import { APP } from '../config/app.config';
import { commandPalette } from './ui/command-palette';
import { bottomSheet } from './ui/bottom-sheet';
import { withViewTransition } from '../utils/view-transitions';
import { announcer } from '../utils/announcer';
import { sanitizeHtml } from '../services/security/dom';
import * as offlineRoute from '../routes/offline';
import * as createRoute from '../routes/create';

type Route = 'home' | 'starred' | 'create' | 'settings' | 'offline' | 'detail' | 'conflicts';

export class App {
  private container: HTMLElement | null = null;
  private currentRoute: Route = 'home';
  private currentGistId: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    document.title = APP.name;
    const appElement = document.getElementById('app');
    if (!appElement) return;
    this.container = appElement;

    networkMonitor.subscribe(() => {
      void this.updateSyncIndicator();
    });

    window.addEventListener('app:sync-change', () => {
      void this.updateSyncIndicator();
    });

    window.addEventListener('app:navigate', (e) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.route) {
        if (detail.params?.gistId) {
          this.currentGistId = detail.params.gistId;
        }
        void this.navigate(detail.route as Route);
      }
    });

    window.addEventListener('app:sort-changed', (e) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.sort) {
        localStorage.setItem('sort-preference', detail.sort);
      }
    });

    const savedTheme = localStorage.getItem('theme-preference') || 'auto';
    document.documentElement.setAttribute('data-theme', savedTheme);

    this.initializeCommandPalette();
    void this.navigate('home');
  }

  private setupNavigation(): void {
    // skipcq: JS-0010
    if (!this.container || this.container.dataset.navBound) return;

    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      const routeBtn = target.closest('[data-route]') as HTMLElement;
      if (routeBtn) {
        e.preventDefault();
        const route = routeBtn.dataset.route as Route;
        if (route) void this.navigate(route);
        return;
      }

      if (target.closest('#mobile-menu-btn')) {
        void this.showMobileMenu();
      }
    });

    this.container?.querySelectorAll('[data-testid="settings-btn"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        void this.navigate('settings');
      });
    });

    this.container.dataset.navBound = 'true';
  }

  private async navigate(route: Route): Promise<void> {
    this.currentRoute = route;
    announcer.announce(`Navigating to ${sanitizeHtml(route)} page`);

    const savedSort = localStorage.getItem('sort-preference') || 'updated-desc';

    await withViewTransition(async () => {
      this.render();
      this.setupNavigation();

      const main = this.container?.querySelector('#main-content');
      if (!main) return;

      switch (route) {
        case 'home': {
          const { render } = await import('../routes/home');
          render(main as HTMLElement, {
            filter: 'all',
            sort: savedSort,
            searchQuery: '',
          });
          break;
        }
        case 'starred': {
          const { render } = await import('../routes/home');
          render(main as HTMLElement, {
            filter: 'starred',
            sort: savedSort,
            searchQuery: '',
          });
          break;
        }
        case 'create': {
          createRoute.render(main as HTMLElement);
          break;
        }
        case 'settings': {
          const { render } = await import('../routes/settings');
          await render(main as HTMLElement, {
            currentTheme: document.documentElement.getAttribute('data-theme') || 'auto',
          });
          break;
        }
        case 'offline': {
          await offlineRoute.render(main as HTMLElement);
          break;
        }
        case 'detail': {
          const { render } = await import('../routes/gist-detail');
          render(main as HTMLElement, { gistId: this.currentGistId || '' });
          break;
        }
        case 'conflicts': {
          (main as HTMLElement).innerHTML = '<div id="conflict-resolution-container"></div>';
          const conflictContainer = (main as HTMLElement).querySelector(
            '#conflict-resolution-container'
          );
          if (conflictContainer instanceof HTMLElement) {
            const { loadConflictResolution } = await import('./conflict-resolution');
            await loadConflictResolution(conflictContainer, () => {
              window.dispatchEvent(new CustomEvent('app:sync-change'));
            });
          }
          break;
        }
      }
    });
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <div class="app-shell">
        <aside class="sidebar-nav" data-testid="sidebar-nav" role="navigation" aria-label="Sidebar navigation">
          <div class="nav-section">
            <div class="nav-section-title" id="nav-primary-title">Navigation</div>
            <ul role="menubar" aria-labelledby="nav-primary-title">
              <li role="none">
                <button role="menuitem" class="sidebar-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home" data-testid="nav-home" ${this.currentRoute === 'home' ? 'aria-current="page"' : ''}>
                  <span class="nav-icon" aria-hidden="true">🏠</span>
                  <span>Home</span>
                </button>
              </li>
              <li role="none">
                <button role="menuitem" class="sidebar-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred" data-testid="nav-starred" ${this.currentRoute === 'starred' ? 'aria-current="page"' : ''}>
                  <span class="nav-icon" aria-hidden="true">⭐</span>
                  <span>Starred</span>
                </button>
              </li>
              <li role="none">
                <button role="menuitem" class="sidebar-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create" data-testid="nav-create" ${this.currentRoute === 'create' ? 'aria-current="page"' : ''}>
                  <span class="nav-icon" aria-hidden="true">➕</span>
                  <span>Create</span>
                </button>
              </li>
            </ul>
          </div>
          <div class="nav-section">
            <div class="nav-section-title" id="nav-secondary-title">Offline</div>
            <ul role="menubar" aria-labelledby="nav-secondary-title">
              <li role="none">
                <button role="menuitem" class="sidebar-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline" data-testid="nav-offline" ${this.currentRoute === 'offline' ? 'aria-current="page"' : ''}>
                  <span class="nav-icon" aria-hidden="true">📶</span>
                  <span>Sync Status</span>
                </button>
              </li>
            </ul>
          </div>
          <div class="nav-section nav-section-system">
            <div class="nav-section-title" id="nav-system-title">System</div>
            <ul role="menubar" aria-labelledby="nav-system-title">
              <li role="none">
                <button role="menuitem" class="sidebar-item ${this.currentRoute === 'settings' ? 'active' : ''}" data-route="settings" data-testid="settings-btn" ${this.currentRoute === 'settings' ? 'aria-current="page"' : ''}>
                  <span class="nav-icon" aria-hidden="true">⚙️</span>
                  <span>Settings</span>
                </button>
              </li>
            </ul>
          </div>
        </aside>

        <aside class="rail-nav" role="navigation" aria-label="Rail navigation">
          <button class="rail-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home" data-testid="nav-home" aria-label="Home" ${this.currentRoute === 'home' ? 'aria-current="page"' : ''}>🏠</button>
          <button class="rail-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred" data-testid="nav-starred" aria-label="Starred" ${this.currentRoute === 'starred' ? 'aria-current="page"' : ''}>⭐</button>
          <button class="rail-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create" data-testid="nav-create" aria-label="Create" ${this.currentRoute === 'create' ? 'aria-current="page"' : ''}>➕</button>
          <button class="rail-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline" data-testid="nav-offline" aria-label="Offline" ${this.currentRoute === 'offline' ? 'aria-current="page"' : ''}>📶</button>
          <button class="rail-item ${this.currentRoute === 'settings' ? 'active' : ''}" data-route="settings" data-testid="settings-btn" aria-label="Settings" ${this.currentRoute === 'settings' ? 'aria-current="page"' : ''}>⚙️</button>
        </aside>

        <header class="app-header">
          <div class="header-left">
            <h1 class="app-title" data-route="home">${APP.name}</h1>
          </div>
          <div class="header-right">
            <div id="sync-indicator" class="sync-indicator" data-status="online"><span class="sync-dot" aria-hidden="true"></span><span class="sr-only">online</span></div>
            <button id="mobile-menu-btn" class="icon-button" aria-label="Open menu" data-testid="mobile-menu-btn" aria-expanded="false" aria-controls="mobile-menu">☰</button>
            <button class="icon-button" aria-label="Settings" data-testid="settings-btn" data-route="settings">⚙️</button>
          </div>
        </header>

        <main class="app-main" id="main-content"></main>

        <nav class="bottom-nav" data-testid="bottom-nav" role="navigation" aria-label="Bottom navigation">
          <button class="nav-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home" data-testid="nav-home" ${this.currentRoute === 'home' ? 'aria-current="page"' : ''}>
            <span class="nav-icon" aria-hidden="true">🏠</span>
            <span class="nav-label">Home</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred" data-testid="nav-starred" ${this.currentRoute === 'starred' ? 'aria-current="page"' : ''}>
            <span class="nav-icon" aria-hidden="true">⭐</span>
            <span class="nav-label">Starred</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create" data-testid="nav-create" ${this.currentRoute === 'create' ? 'aria-current="page"' : ''}>
            <span class="nav-icon" aria-hidden="true">➕</span>
            <span class="nav-label">Create</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline" data-testid="nav-offline" ${this.currentRoute === 'offline' ? 'aria-current="page"' : ''}>
            <span class="nav-icon" aria-hidden="true">📶</span>
            <span class="nav-label">Offline</span>
          </button>
        </nav>
      </div>
    `;
  }

  private async updateSyncIndicator(): Promise<void> {
    const el = this.container?.querySelector('#sync-indicator');
    const online = networkMonitor.isOnline();
    const len = await syncQueue.getQueueLength();
    const status = online ? (len > 0 ? 'syncing' : 'online') : 'offline';
    if (el) {
      el.setAttribute('data-status', status);
      el.innerHTML = `<span class="sync-dot" aria-hidden="true"></span><span class="sr-only">${sanitizeHtml(status)}</span>`;
    }
  }

  private async showMobileMenu(): Promise<void> {
    const content = `
      <nav class="mobile-menu" role="navigation" aria-label="Mobile menu">
        <div class="mobile-menu-section">
          <div class="mobile-menu-section-title">Navigation</div>
          <button class="mobile-menu-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home" role="menuitem" ${this.currentRoute === 'home' ? 'aria-current="page"' : ''}>
            <span aria-hidden="true">🏠</span> Home
          </button>
          <button class="mobile-menu-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred" role="menuitem" ${this.currentRoute === 'starred' ? 'aria-current="page"' : ''}>
            <span aria-hidden="true">⭐</span> Starred Gists
          </button>
          <button class="mobile-menu-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create" role="menuitem" ${this.currentRoute === 'create' ? 'aria-current="page"' : ''}>
            <span aria-hidden="true">➕</span> Create New Gist
          </button>
        </div>
        <div class="mobile-menu-section">
          <div class="mobile-menu-section-title">Offline</div>
          <button class="mobile-menu-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline" role="menuitem" ${this.currentRoute === 'offline' ? 'aria-current="page"' : ''}>
            <span aria-hidden="true">📶</span> Sync Status
          </button>
        </div>
        <div class="mobile-menu-section">
          <div class="mobile-menu-section-title">System</div>
          <button class="mobile-menu-item ${this.currentRoute === 'settings' ? 'active' : ''}" data-route="settings" role="menuitem" ${this.currentRoute === 'settings' ? 'aria-current="page"' : ''}>
            <span aria-hidden="true">⚙️</span> Settings
          </button>
        </div>
      </nav>
    `;
    await bottomSheet.open(content, 'MENU');

    const menu = document.querySelector('.mobile-menu');
    menu?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('[data-route]') as HTMLElement | null;
      if (btn) {
        const route = btn.getAttribute('data-route') as Route;
        void bottomSheet.close();
        void this.navigate(route);
      }
    });
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
