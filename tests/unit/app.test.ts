/**
 * Unit tests for Root App Component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/config/app.config', () => ({
  APP: { name: 'd.o. Gist Hub' },
}));

vi.mock('../../src/services/lifecycle', () => ({
  lifecycle: {
    cleanupRoute: vi.fn(),
    onRouteCleanup: vi.fn(),
    onAppCleanup: vi.fn(),
    cleanupApp: vi.fn(),
  },
}));

vi.mock('../../src/services/security', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
  html: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => `${acc}${str}${values[i] ?? ''}`, ''),
  ),
  redactSecrets: vi.fn((s: unknown) => s),
  redactToken: vi.fn((t: string) => t),
  safeError: vi.fn(),
  safeLog: vi.fn(),
  safeWarn: vi.fn(),
}));

vi.mock('../../src/services/network/offline-monitor', () => ({
  default: {
    isOnline: vi.fn(() => true),
    subscribe: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../src/services/sync/queue', () => ({
  default: {
    getQueueLength: vi.fn().mockResolvedValue(0),
    queueOperation: vi.fn(),
    processQueue: vi.fn(),
  },
}));

vi.mock('../../src/tokens/design-tokens', () => ({
  getThemePreference: vi.fn(() => 'auto'),
}));

vi.mock('../../src/utils/announcer', () => ({
  announcer: {
    announce: vi.fn(),
  },
}));

vi.mock('../../src/utils/view-transitions', () => ({
  withViewTransition: vi.fn(async (fn: () => void | Promise<void>) => {
    await fn();
  }),
}));

vi.mock('../../src/components/ui/bottom-sheet', () => ({
  bottomSheet: {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/components/ui/command-palette', () => ({
  commandPalette: {
    setCommands: vi.fn(),
  },
}));

vi.mock('../../src/components/ui/nav-rail', () => ({
  navRail: {
    render: vi.fn(() => '<nav class="rail-nav"></nav>'),
    mount: vi.fn(),
    updateActive: vi.fn(),
  },
}));

vi.mock('../../src/components/ui/route-boundary', () => ({
  RouteBoundary: {
    wrap: vi.fn(async (_main: HTMLElement, _route: string, fn: () => void | Promise<void>) => {
      await fn();
    }),
  },
}));

vi.mock('../../src/routes/home', () => ({
  render: vi.fn(),
}));

vi.mock('../../src/routes/offline', () => ({
  render: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/routes/create', () => ({
  render: vi.fn(),
}));

vi.mock('../../src/routes/settings', () => ({
  render: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/routes/gist-detail', () => ({
  render: vi.fn(),
}));

vi.mock('../../src/services/db', () => ({
  isDBReady: vi.fn(() => false),
  initIndexedDB: vi.fn(),
  getDB: vi.fn(() => { throw new Error('[IndexedDB] Database not initialized. Call initIndexedDB() first.'); }),
  closeDB: vi.fn(),
  saveGist: vi.fn(),
  saveGists: vi.fn(),
  getGist: vi.fn(),
  getAllGists: vi.fn().mockResolvedValue([]),
  deleteGist: vi.fn(),
  queueWrite: vi.fn(),
  getPendingWrites: vi.fn().mockResolvedValue([]),
  removePendingWrite: vi.fn(),
  updatePendingWriteError: vi.fn(),
  setMetadata: vi.fn(),
  getMetadata: vi.fn(),
  setEtag: vi.fn(),
  getEtag: vi.fn(),
  clearAllData: vi.fn(),
  exportData: vi.fn(),
  importData: vi.fn(),
}));

vi.mock('../../src/components/conflict-resolution', () => ({
  loadConflictResolution: vi.fn().mockResolvedValue(undefined),
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { App } from '../../src/components/app';
import { APP } from '../../src/config/app.config';
import { lifecycle } from '../../src/services/lifecycle';
import networkMonitor from '../../src/services/network/offline-monitor';
import syncQueue from '../../src/services/sync/queue';
import { announcer } from '../../src/utils/announcer';
import { commandPalette } from '../../src/components/ui/command-palette';
import { navRail } from '../../src/components/ui/nav-rail';
import { bottomSheet } from '../../src/components/ui/bottom-sheet';

// ── Tests ─────────────────────────────────────────────────────────────

describe('App Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ── Constructor ─────────────────────────────────────────────────────

  describe('constructor', () => {
    it('sets document title from APP config', () => {
      const _app = new App();
      expect(document.title).toBe(APP.name);
    });

    it('subscribes to network monitor', () => {
      const _app = new App();
      expect(networkMonitor.subscribe).toHaveBeenCalled();
    });
  });

  // ── mount ─────────────────────────────────────────────────────────────

  describe('mount', () => {
    it('renders app shell into the provided element', () => {
      const app = new App();
      const mountContainer = document.createElement('div');
      app.mount(mountContainer);

      expect(mountContainer.querySelector('.app-shell')).not.toBeNull();
      expect(mountContainer.querySelector('#main-content')).not.toBeNull();
    });

    it('initializes command palette on mount', () => {
      const app = new App();
      const mountContainer = document.createElement('div');
      app.mount(mountContainer);

      expect(commandPalette.setCommands).toHaveBeenCalled();
    });

    it('navigates to home route on mount', () => {
      const app = new App();
      const mountContainer = document.createElement('div');
      app.mount(mountContainer);

      expect(announcer.announce).toHaveBeenCalledWith('Navigating to home page');
    });
  });

  // ── Render ─────────────────────────────────────────────────────────────

  describe('render', () => {
    it('renders skip link, sidebar, header, main content, and bottom nav', () => {
      const app = new App();
      app.mount(container);

      expect(container.querySelector('.skip-link')).not.toBeNull();
      expect(container.querySelector('.sidebar-nav')).not.toBeNull();
      expect(container.querySelector('.app-header')).not.toBeNull();
      expect(container.querySelector('#main-content')).not.toBeNull();
      expect(container.querySelector('.bottom-nav')).not.toBeNull();
    });

    it('renders nav rail via navRail.render', () => {
      const app = new App();
      app.mount(container);

      expect(navRail.render).toHaveBeenCalled();
    });

    it('sets aria-current on active route button', () => {
      const app = new App();
      app.mount(container);

      const homeBtn = container.querySelector('[data-route="home"]');
      expect(homeBtn?.getAttribute('aria-current')).toBe('page');
    });
  });

  // ── Navigation ────────────────────────────────────────────────────────

  describe('navigation', () => {
    it('responds to app:navigate custom event', () => {
      const app = new App();
      app.mount(container);

      window.dispatchEvent(
        new CustomEvent('app:navigate', {
          detail: { route: 'starred' },
        })
      );

      expect(announcer.announce).toHaveBeenCalledWith('Navigating to starred page');
    });

    it('cleans up route on route change', () => {
      const app = new App();
      app.mount(container);

      window.dispatchEvent(
        new CustomEvent('app:navigate', {
          detail: { route: 'create' },
        })
      );

      expect(lifecycle.cleanupRoute).toHaveBeenCalled();
    });

    it('passes gistId in navigation params to detail route', () => {
      const app = new App();
      app.mount(container);

      window.dispatchEvent(
        new CustomEvent('app:navigate', {
          detail: { route: 'detail', params: { gistId: 'test-gist-123' } },
        })
      );

      expect(announcer.announce).toHaveBeenCalledWith('Navigating to detail page');
    });
  });

  // ── Sync Indicator ─────────────────────────────────────────────────────

  describe('sync indicator', () => {
    /**
     * Helper: trigger updateSyncIndicator by dispatching app:sync-change.
     * updateSyncIndicator is private, so we trigger it via the event listener
     * set up in the constructor.
     */
    function triggerSyncUpdate(): void {
      window.dispatchEvent(new CustomEvent('app:sync-change'));
    }

    it('sets online status when connected and queue empty', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
      vi.mocked(syncQueue.getQueueLength).mockResolvedValue(0);

      const app = new App();
      app.mount(container);

      triggerSyncUpdate();

      await vi.waitFor(() => {
        const indicator = container.querySelector('#sync-indicator');
        expect(indicator?.getAttribute('data-status')).toBe('online');
      });
    });

    it('sets syncing status when online with pending queue', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
      vi.mocked(syncQueue.getQueueLength).mockResolvedValue(3);

      const app = new App();
      app.mount(container);

      triggerSyncUpdate();

      await vi.waitFor(() => {
        const indicator = container.querySelector('#sync-indicator');
        expect(indicator?.getAttribute('data-status')).toBe('syncing');
      });
    });

    it('sets offline status when disconnected', async () => {
      vi.mocked(networkMonitor.isOnline).mockReturnValue(false);
      vi.mocked(syncQueue.getQueueLength).mockResolvedValue(0);

      const app = new App();
      app.mount(container);

      triggerSyncUpdate();

      await vi.waitFor(() => {
        const indicator = container.querySelector('#sync-indicator');
        expect(indicator?.getAttribute('data-status')).toBe('offline');
      });
    });
  });

  // ── Sort Preference ───────────────────────────────────────────────────

  describe('sort preference', () => {
    it('stores sort preference on app:sort-changed event', () => {
      const _app = new App();

      window.dispatchEvent(
        new CustomEvent('app:sort-changed', {
          detail: { sort: 'created-desc' },
        })
      );

      expect(localStorage.getItem('sort-preference')).toBe('created-desc');
    });
  });

  // ── Mobile Menu ───────────────────────────────────────────────────────

  describe('mobile menu', () => {
    it('opens bottom sheet when mobile menu button is clicked', () => {
      const app = new App();
      app.mount(container);

      const menuBtn = container.querySelector('#mobile-menu-btn');
      expect(menuBtn).not.toBeNull();

      menuBtn?.click();
      expect(bottomSheet.open).toHaveBeenCalled();
    });
  });

  // ── Error Handling (Missing #app) ────────────────────────────────────

  describe('error handling', () => {
    it('handles missing #app element gracefully', () => {
      // Remove the #app element so initialize() finds nothing
      document.body.removeChild(container);

      // Should not throw
      expect(() => {
        const _app = new App();
      }).not.toThrow();

      // Restore for afterEach
      document.body.appendChild(container);
    });

    it('does not crash if #app is removed after mount', () => {
      const app = new App();
      app.mount(container);

      // Remove container from DOM
      document.body.removeChild(container);

      // Subsequent operations should not throw
      expect(() => {
        window.dispatchEvent(
          new CustomEvent('app:navigate', {
            detail: { route: 'starred' },
          })
        );
      }).not.toThrow();

      // Restore for afterEach
      document.body.appendChild(container);
    });
  });

  // ── Settings Navigation ───────────────────────────────────────────────

  describe('settings navigation', () => {
    it('navigates to settings when settings-btn is clicked', () => {
      const app = new App();
      app.mount(container);

      const settingsBtn = container.querySelector('[data-testid="settings-btn"]');
      expect(settingsBtn).not.toBeNull();

      settingsBtn?.dispatchEvent(new MouseEvent('click'));
      expect(announcer.announce).toHaveBeenCalledWith('Navigating to settings page');
    });
  });

  // ── Network Reconnect ──────────────────────────────────────────────────

  describe('network reconnect', () => {
    it('triggers sync indicator update when network monitor fires', async () => {
      // Capture the subscribe callback so we can trigger it directly
      let subscribeCallback: () => void = () => {};
      vi.mocked(networkMonitor.subscribe).mockImplementation(
        (cb: () => void) => {
          subscribeCallback = cb;
          return vi.fn();
        }
      );

      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
      vi.mocked(syncQueue.getQueueLength).mockResolvedValue(0);

      const app = new App();
      app.mount(container);

      // Simulate network reconnecting
      vi.mocked(syncQueue.getQueueLength).mockResolvedValue(0);
      subscribeCallback();

      await vi.waitFor(() => {
        const indicator = container.querySelector('#sync-indicator');
        expect(indicator?.getAttribute('data-status')).toBe('online');
      });
    });

    it('sets syncing status on reconnect when queue is non-empty', async () => {
      let subscribeCallback: () => void = () => {};
      vi.mocked(networkMonitor.subscribe).mockImplementation(
        (cb: () => void) => {
          subscribeCallback = cb;
          return vi.fn();
        }
      );

      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
      vi.mocked(syncQueue.getQueueLength).mockResolvedValue(2);

      const app = new App();
      app.mount(container);

      // Simulate network reconnecting with pending operations
      subscribeCallback();

      await vi.waitFor(() => {
        const indicator = container.querySelector('#sync-indicator');
        expect(indicator?.getAttribute('data-status')).toBe('syncing');
      });
    });
  });

  // ── Conflict Route Navigation ────────────────────────────────────────

  describe('conflict route navigation', () => {
    it('navigates to conflict resolution route', () => {
      const app = new App();
      app.mount(container);

      window.dispatchEvent(
        new CustomEvent('app:navigate', {
          detail: { route: 'conflicts' },
        })
      );

      expect(announcer.announce).toHaveBeenCalledWith(
        'Navigating to conflicts page'
      );
    });
  });
});
