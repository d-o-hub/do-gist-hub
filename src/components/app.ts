/**
 * Root App Component
 */

import { APP } from '../config/app.config';
import * as createRoute from '../routes/create';
import { lifecycle } from '../services/lifecycle';
import networkMonitor from '../services/network/offline-monitor';
import { capabilities } from '../services/pwa/capabilities';
import syncQueue from '../services/sync/queue';
import { getTheme, getThemePreference, setTheme } from '../tokens/design-tokens';
import { announcer } from '../utils/announcer';
import { withViewTransition } from '../utils/view-transitions';
import { bottomSheet } from './ui/bottom-sheet';
import { commandPalette } from './ui/command-palette';
import { type NavRailRoute, navRail } from './ui/nav-rail';
import { RouteBoundary } from './ui/route-boundary';
import { toast } from './ui/toast';

type Route = 'home' | 'starred' | 'create' | 'settings' | 'offline' | 'detail' | 'conflicts';

export class App {
  private container: HTMLElement | null = null;
  private currentRoute: Route = 'home';
  private currentGistId: string | null = null;
  private abortController = new AbortController();
  private networkUnsubscribe?: () => void;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    document.title = APP.name;
    const appElement = document.getElementById('app');
    if (!appElement) return;
    this.container = appElement;

    const signal = this.abortController.signal;

    this.networkUnsubscribe = networkMonitor.subscribe(() => {
      void this.updateSyncIndicator();
    });

    window.addEventListener(
      'app:sync-change',
      () => {
        void this.updateSyncIndicator();
      },
      { signal }
    );

    window.addEventListener(
      'app:navigate',
      (e) => {
        const detail = (e as CustomEvent).detail;
        if (detail?.route) {
          void this.navigate(detail.route as Route, detail.params?.gistId);
        }
      },
      { signal }
    );

    window.addEventListener(
      'app:sort-changed',
      (e) => {
        const detail = (e as CustomEvent).detail;
        if (detail?.sort) {
          localStorage.setItem('sort-preference', detail.sort);
        }
      },
      { signal }
    );

    this.initializeCommandPalette();
    this.subscribeInstallPrompt();
  }

  private subscribeInstallPrompt(): void {
    const signal = this.abortController.signal;
    const unsubscribe = capabilities.onInstallPromptChange((available) => {
      const btn = this.container?.querySelector<HTMLElement>('#install-app-btn');
      if (btn) {
        if (available) {
          btn.removeAttribute('hidden');
        } else {
          btn.setAttribute('hidden', '');
        }
      }
    });
    signal.addEventListener('abort', unsubscribe, { once: true });
  }

  private setupNavigation(): void {
    // skipcq: JS-0010
    if (!this.container || this.container.dataset.navBound) return;

    const signal = this.abortController.signal;

    this.container.addEventListener(
      'click',
      (e) => {
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

        if (target.closest('#install-app-btn')) {
          void this.handleInstallClick();
        }

        if (target.closest('#theme-toggle')) {
          const next = getTheme() === 'dark' ? 'light' : 'dark';
          setTheme(next);
          this.render();
        }
      },
      { signal }
    );

    this.container.dataset.navBound = 'true';
  }

  private async handleInstallClick(): Promise<void> {
    const outcome = await capabilities.promptInstall();
    if (outcome === 'accepted') {
      toast.success('App installed');
    } else if (outcome === 'dismissed') {
      capabilities.dismissInstallPrompt();
    }
  }

  private async navigate(route: Route, gistId?: string): Promise<void> {
    const isInitialRender = !this.container?.querySelector('.app-shell');
    const isSameRoute =
      !isInitialRender &&
      this.currentRoute === route &&
      (gistId === undefined || this.currentGistId === gistId);

    if (isSameRoute) return;

    // Dispose of the previous route's resources
    lifecycle.cleanupRoute();

    // Capture the signal for this specific navigation scope
    const routeSignal = lifecycle.getRouteSignal();

    this.currentRoute = route;
    if (gistId !== undefined) {
      this.currentGistId = gistId;
    }
    announcer.announce(`Navigating to ${route} page`);

    // Move focus to the main content so keyboard users land in the
    // new route's content (not stuck on a navigation button they
    // already pressed). The main element needs `tabindex="-1"` to
    // be focusable programmatically; that is set in the markup.
    const mainEl = this.container?.querySelector('#main-content');
    if (mainEl instanceof HTMLElement) {
      // requestAnimationFrame waits for the view transition to
      // commit so the new content is in the DOM before we focus.
      requestAnimationFrame(() => {
        (mainEl as HTMLElement).focus({ preventScroll: false });
      });
    }

    const savedSort = localStorage.getItem('sort-preference') || 'updated-desc';

    await withViewTransition(async () => {
      if (routeSignal.aborted) return;

      // Only re-render the shell if the route changed or the shell isn't present yet.
      if (isInitialRender) {
        this.render();
        this.setupNavigation();
        this.mountNavComponents();
      }

      navRail.updateActive(route as NavRailRoute);

      const main = this.container?.querySelector('#main-content');
      if (!main) return;

      switch (route) {
        case 'home': {
          await RouteBoundary.wrap(
            main as HTMLElement,
            'home',
            async () => {
              const { render } = await import('../routes/home');
              if (routeSignal.aborted) return;
              render(main as HTMLElement, {
                filter: 'all',
                sort: savedSort,
                searchQuery: '',
              });
            },
            routeSignal
          );
          break;
        }
        case 'starred': {
          await RouteBoundary.wrap(
            main as HTMLElement,
            'starred',
            async () => {
              const { render } = await import('../routes/home');
              if (routeSignal.aborted) return;
              render(main as HTMLElement, {
                filter: 'starred',
                sort: savedSort,
                searchQuery: '',
              });
            },
            routeSignal
          );
          break;
        }
        case 'create': {
          await RouteBoundary.wrap(
            main as HTMLElement,
            'create',
            () => {
              createRoute.render(main as HTMLElement);
            },
            routeSignal
          );
          break;
        }
        case 'settings': {
          await RouteBoundary.wrap(
            main as HTMLElement,
            'settings',
            async () => {
              const { render } = await import('../routes/settings');
              if (routeSignal.aborted) return;
              await render(main as HTMLElement, {
                currentTheme: getThemePreference() || 'auto',
              });
            },
            routeSignal
          );
          break;
        }
        case 'offline': {
          await RouteBoundary.wrap(
            main as HTMLElement,
            'offline',
            async () => {
              const { render } = await import('../routes/offline');
              if (routeSignal.aborted) return;
              await render(main as HTMLElement);
            },
            routeSignal
          );
          break;
        }
        case 'detail': {
          await RouteBoundary.wrap(
            main as HTMLElement,
            'detail',
            async () => {
              const { render } = await import('../routes/gist-detail');
              if (routeSignal.aborted) return;
              render(main as HTMLElement, { gistId: this.currentGistId || '' });
            },
            routeSignal
          );
          break;
        }
        case 'conflicts': {
          await RouteBoundary.wrap(
            main as HTMLElement,
            'conflicts',
            async () => {
              (main as HTMLElement).replaceChildren();
              const conflictDiv = document.createElement('div');
              conflictDiv.id = 'conflict-resolution-container';
              (main as HTMLElement).appendChild(conflictDiv);
              const conflictContainer = (main as HTMLElement).querySelector(
                '#conflict-resolution-container'
              );
              if (conflictContainer instanceof HTMLElement) {
                const { loadConflictResolution } = await import('./conflict-resolution');
                if (routeSignal.aborted) return;
                await loadConflictResolution(
                  conflictContainer,
                  () => {
                    window.dispatchEvent(new CustomEvent('app:sync-change'));
                  },
                  routeSignal
                );
              }
            },
            routeSignal
          );
          break;
        }
        default: {
          // Unknown route (defensive: the union type catches most
          // cases at compile time, but runtime events from third
          // parties could still fall through). Show a helpful
          // empty state and route the user back home.
          if (main) {
            (main as HTMLElement).replaceChildren();
            const EmptyState = await import('./ui/empty-state');
            if (routeSignal.aborted) return;
            const fragment = EmptyState.EmptyState.renderToFragment({
              title: 'Page not found',
              description: `We don't have a page at "${String(route)}". The link may be out of date.`,
              actionLabel: 'Back to gists',
              actionRoute: 'home',
            });
            (main as HTMLElement).appendChild(fragment);
            // Announce the failure for screen readers
            const { announcer } = await import('../utils/announcer');
            announcer.announce('Page not found');
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
        <aside class="sidebar-nav" data-testid="sidebar-nav" role="navigation" aria-label="Main navigation">
          <div class="nav-section">
            <div class="nav-section-title" id="nav-primary-title">Navigation</div>
            <ul role="menubar" aria-labelledby="nav-primary-title">
              <li role="none">
                <button role="menuitem" class="sidebar-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home" data-testid="nav-home" ${this.currentRoute === 'home' ? 'aria-current="page"' : ''}>
                  <span>Home</span>
                </button>
              </li>
              <li role="none">
                <button role="menuitem" class="sidebar-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred" data-testid="nav-starred" ${this.currentRoute === 'starred' ? 'aria-current="page"' : ''}>
                  <span>Starred</span>
                </button>
              </li>
              <li role="none">
                <button role="menuitem" class="sidebar-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create" data-testid="nav-create" ${this.currentRoute === 'create' ? 'aria-current="page"' : ''}>
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
                  <span>Sync Status</span>
                </button>
              </li>
              <li role="none">
                <button role="menuitem" class="sidebar-item ${this.currentRoute === 'conflicts' ? 'active' : ''}" data-route="conflicts" data-testid="nav-conflicts" ${this.currentRoute === 'conflicts' ? 'aria-current="page"' : ''}>
                  <span>Conflicts</span>
                </button>
              </li>
            </ul>
          </div>
          <div class="nav-section nav-section-system">
            <div class="nav-section-title" id="nav-system-title">System</div>
            <ul role="menubar" aria-labelledby="nav-system-title">
              <li role="none">
                <button role="menuitem" class="sidebar-item ${this.currentRoute === 'settings' ? 'active' : ''}" data-route="settings" data-testid="settings-btn" ${this.currentRoute === 'settings' ? 'aria-current="page"' : ''}>
                  <span>Settings</span>
                </button>
              </li>
            </ul>
          </div>
        </aside>

        ${navRail.render(this.currentRoute as NavRailRoute)}

        <header class="app-header">
          <div class="header-left">
            <h1 class="app-title" data-route="home">${APP.name}</h1>
          </div>
          <div class="header-right">
            <button id="theme-toggle" class="icon-button theme-toggle" data-testid="theme-toggle" aria-label="${getTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}">
              ${
                getTheme() === 'dark'
                  ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
                  : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
              }
            </button>
            <div id="sync-indicator" class="sync-indicator" data-status="online"><span class="sync-dot" aria-hidden="true"></span><span class="sr-only" aria-live="polite" aria-atomic="true">online</span></div>
            <button id="install-app-btn" class="icon-button" aria-label="Install app" data-testid="install-app-btn" hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button id="mobile-menu-btn" class="icon-button" aria-label="Open menu" data-testid="mobile-menu-btn" aria-expanded="false" aria-controls="mobile-menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <button class="icon-button" aria-label="Settings" data-testid="settings-btn" data-route="settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          </div>
        </header>

        <main class="app-main" id="main-content" tabindex="-1"></main>

        <nav class="bottom-nav" data-testid="bottom-nav" role="navigation" aria-label="Main navigation">
          <button class="nav-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home" data-testid="nav-home" ${this.currentRoute === 'home' ? 'aria-current="page"' : ''}>
            <span class="nav-label">Home</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred" data-testid="nav-starred" ${this.currentRoute === 'starred' ? 'aria-current="page"' : ''}>
            <span class="nav-label">Starred</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create" data-testid="nav-create" ${this.currentRoute === 'create' ? 'aria-current="page"' : ''}>
            <span class="nav-label">Create</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'conflicts' ? 'active' : ''}" data-route="conflicts" data-testid="nav-conflicts" ${this.currentRoute === 'conflicts' ? 'aria-current="page"' : ''}>
            <span class="nav-label">Conflicts</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline" data-testid="nav-offline" ${this.currentRoute === 'offline' ? 'aria-current="page"' : ''}>
            <span class="nav-label">Offline</span>
          </button>
        </nav>
      </div>
    `;
  }

  private mountNavComponents(): void {
    const railElement = this.container?.querySelector('.rail-nav') as HTMLElement | null;
    if (railElement) {
      navRail.mount(railElement, this.currentRoute as NavRailRoute);
    }
  }

  private async updateSyncIndicator(): Promise<void> {
    const el = this.container?.querySelector('#sync-indicator');
    if (!el) return;
    const online = networkMonitor.isOnline();
    const len = await syncQueue.getQueueLength();
    const status = online ? (len > 0 ? 'syncing' : 'online') : 'offline';
    const previousStatus = el.getAttribute('data-status');
    if (previousStatus === status) return;

    el.setAttribute('data-status', status);
    el.replaceChildren();
    const syncDot = document.createElement('span');
    syncDot.className = 'sync-dot';
    syncDot.setAttribute('aria-hidden', 'true');
    el.appendChild(syncDot);
    const srOnly = document.createElement('span');
    srOnly.className = 'sr-only';
    srOnly.setAttribute('aria-live', 'polite');
    srOnly.setAttribute('aria-atomic', 'true');
    srOnly.textContent = status;
    el.appendChild(srOnly);

    // Single-shot state-change pulse so the indicator reads as motion
    // when the status flips, not just when it stays. The class is
    // removed on animationend so the next change can fire it again.
    el.classList.remove('sync-status-changed');
    // Force a reflow so re-adding the class restarts the animation.
    void (el as HTMLElement).offsetWidth;
    el.classList.add('sync-status-changed');
    el.addEventListener(
      'animationend',
      () => {
        el.classList.remove('sync-status-changed');
      },
      { once: true }
    );
  }

  private async showMobileMenu(): Promise<void> {
    const content = this.buildMobileMenu();
    await bottomSheet.open(content, 'MENU');

    const menu = document.querySelector('.mobile-menu');
    // Mobile menu is transient, but using signal is safer
    menu?.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('[data-route]') as HTMLElement | null;
        if (btn) {
          const route = btn.getAttribute('data-route') as Route;
          void bottomSheet.close();
          void this.navigate(route);
        }
      },
      { signal: this.abortController.signal }
    );
  }

  private buildMobileMenu(): DocumentFragment {
    const nav = document.createElement('nav');
    nav.className = 'mobile-menu';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Mobile menu');

    const sections: { title: string; items: { label: string; route: Route }[] }[] = [
      {
        title: 'Navigation',
        items: [
          { label: 'Home', route: 'home' },
          { label: 'Starred Gists', route: 'starred' },
          { label: 'Create New Gist', route: 'create' },
        ],
      },
      {
        title: 'Offline',
        items: [
          { label: 'Sync Status', route: 'offline' },
          { label: 'Conflicts', route: 'conflicts' },
        ],
      },
      {
        title: 'System',
        items: [{ label: 'Settings', route: 'settings' }],
      },
    ];

    for (const section of sections) {
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'mobile-menu-section';
      const titleDiv = document.createElement('div');
      titleDiv.className = 'mobile-menu-section-title';
      titleDiv.textContent = section.title;
      sectionDiv.appendChild(titleDiv);
      for (const item of section.items) {
        const btn = document.createElement('button');
        btn.className = `mobile-menu-item${this.currentRoute === item.route ? ' active' : ''}`;
        btn.dataset.route = item.route;
        btn.setAttribute('role', 'menuitem');
        if (this.currentRoute === item.route) btn.setAttribute('aria-current', 'page');
        btn.textContent = item.label;
        sectionDiv.appendChild(btn);
      }
      nav.appendChild(sectionDiv);
    }
    const frag = document.createDocumentFragment();
    frag.appendChild(nav);
    return frag;
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
    void this.navigate('home');
  }

  public destroy(): void {
    this.abortController.abort();
    this.networkUnsubscribe?.();
    navRail.destroy();
    commandPalette.destroy();
    bottomSheet.destroy();
    lifecycle.cleanupRoute();
    lifecycle.cleanupApp();
  }
}
