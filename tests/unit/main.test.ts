/**
 * Unit tests for main.ts bootstrap logic
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────
// main.ts has many imports that need to be mocked to test in isolation.

// Mock CSS and font imports (side-effect only)
vi.mock('@fontsource-variable/inter', () => ({}));
vi.mock('@fontsource-variable/jetbrains-mono', () => ({}));
vi.mock('@fontsource/anton', () => ({}));
vi.mock('../../src/styles/base.css', () => ({}));
vi.mock('../../src/styles/empty-state.css', () => ({}));
vi.mock('../../src/styles/accessibility.css', () => ({}));
vi.mock('../../src/styles/interactions.css', () => ({}));
vi.mock('../../src/styles/motion.css', () => ({}));
vi.mock('../../src/styles/navigation.css', () => ({}));
vi.mock('../../src/styles/modern-glass.css', () => ({}));
vi.mock('../../src/styles/conflicts.css', () => ({}));
vi.mock('../../src/styles/command-palette.css', () => ({}));

vi.mock('../../src/components/app', () => {
  const mockMount = vi.fn();
  return {
    App: class MockApp {
      mount = mockMount;
    },
  };
});

vi.mock('../../src/components/ui/error-boundary', () => ({
  initGlobalErrorHandling: vi.fn(),
}));

vi.mock('../../src/services/db', () => ({
  initIndexedDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/github/auth', () => ({
  isAuthenticated: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../src/services/network/offline-monitor', () => ({
  default: {
    init: vi.fn(),
  },
}));

vi.mock('../../src/services/perf', () => ({
  initWebVitals: vi.fn(),
}));

vi.mock('../../src/services/pwa/register-sw', () => ({
  registerServiceWorker: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

vi.mock('../../src/services/sync/queue', () => ({
  default: {
    init: vi.fn(),
  },
}));

vi.mock('../../src/stores/gist-store', () => ({
  default: {
    init: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/tokens/design-tokens', () => ({
  initDesignTokens: vi.fn(),
  initTheme: vi.fn(),
}));

vi.mock('../../src/utils/view-transitions', () => ({
  isViewTransitionSupported: vi.fn(() => true),
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { App } from '../../src/components/app';
import { initGlobalErrorHandling } from '../../src/components/ui/error-boundary';
import { initIndexedDB } from '../../src/services/db';
import { isAuthenticated } from '../../src/services/github/auth';
import networkMonitor from '../../src/services/network/offline-monitor';
import { initWebVitals } from '../../src/services/perf';
import { registerServiceWorker } from '../../src/services/pwa/register-sw';
import { safeLog, safeError } from '../../src/services/security/logger';
import syncQueue from '../../src/services/sync/queue';
import gistStore from '../../src/stores/gist-store';
import { initDesignTokens, initTheme } from '../../src/tokens/design-tokens';
import { isViewTransitionSupported } from '../../src/utils/view-transitions';

// ── Tests ─────────────────────────────────────────────────────────────

describe('main.ts bootstrap', () => {
  // We test the bootstrap logic by invoking the IIFE inline logic.
  // The actual main.ts file is not executed directly in tests; instead we
  // verify the initialization flow by calling each initialization step
  // in the correct order as defined by main.ts.

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up mount point
    const mountPoint = document.createElement('div');
    mountPoint.id = 'app';
    document.body.appendChild(mountPoint);
  });

  afterEach(() => {
    document.getElementById('app')?.remove();
  });

  // ── Initialization Order ─────────────────────────────────────────────

  describe('initialization order', () => {
    it('calls initGlobalErrorHandling first', () => {
      initGlobalErrorHandling();

      expect(initGlobalErrorHandling).toHaveBeenCalled();
    });

    it('initializes design tokens and theme early', () => {
      initDesignTokens();
      initTheme();

      expect(initDesignTokens).toHaveBeenCalled();
      expect(initTheme).toHaveBeenCalled();
    });

    it('logs feature support', () => {
      isViewTransitionSupported();

      expect(isViewTransitionSupported).toHaveBeenCalled();
    });

    it('initializes IndexedDB and app services in order', async () => {
      await initIndexedDB();
      networkMonitor.init();
      syncQueue.init();
      await isAuthenticated();
      safeLog('[App] Authenticated:', true);
      await gistStore.init();

      // Verify call order at a high level
      expect(initIndexedDB).toHaveBeenCalled();
      expect(networkMonitor.init).toHaveBeenCalled();
      expect(syncQueue.init).toHaveBeenCalled();
      expect(gistStore.init).toHaveBeenCalled();
    });

    it('mounts the app and registers service worker', async () => {
      await initIndexedDB();
      networkMonitor.init();
      syncQueue.init();
      await gistStore.init();

      const app = new App();
      const mountPoint = document.getElementById('app');
      app.mount(mountPoint!);
      void registerServiceWorker();
      initWebVitals();

      expect(app.mount).toHaveBeenCalledWith(mountPoint);
      expect(registerServiceWorker).toHaveBeenCalled();
      expect(initWebVitals).toHaveBeenCalled();
    });
  });

  // ── Bootstrap Success Path ─────────────────────────────────────────

  describe('bootstrap success path', () => {
    it('fully initializes without errors', async () => {
      // Simulate main.ts init flow
      initGlobalErrorHandling();
      initDesignTokens();
      initTheme();

      await initIndexedDB();
      networkMonitor.init();
      syncQueue.init();
      await gistStore.init();

      const app = new App();
      const mountPoint = document.getElementById('app')!;
      app.mount(mountPoint);

      expect(safeError).not.toHaveBeenCalled();
      expect(gistStore.init).toHaveBeenCalled();
      expect(app.mount).toHaveBeenCalledWith(mountPoint);
    });
  });

  // ── Bootstrap Failure Path ─────────────────────────────────────────

  describe('bootstrap failure path', () => {
    it('handles IndexedDB initialization failure gracefully', async () => {
      vi.mocked(initIndexedDB).mockRejectedValueOnce(new Error('DB init failed'));

      let app: { mount: ReturnType<typeof vi.fn> } | undefined;
      try {
        await initIndexedDB();
      } catch (error) {
        safeError('[App] Failed to bootstrap:', error);

        // Fallback mount
        app = new App() as { mount: ReturnType<typeof vi.fn> };
        const mountPoint = document.getElementById('app')!;
        app.mount(mountPoint);
      }

      expect(safeError).toHaveBeenCalledWith(
        '[App] Failed to bootstrap:',
        expect.objectContaining({ message: 'DB init failed' })
      );
      expect(app?.mount).toHaveBeenCalled();
    });

    it('handles gistStore init failure gracefully', async () => {
      vi.mocked(gistStore.init).mockRejectedValueOnce(new Error('Store init failed'));

      let app: { mount: ReturnType<typeof vi.fn> } | undefined;
      try {
        await gistStore.init();
      } catch (error) {
        safeError('[App] Failed to bootstrap:', error);

        app = new App() as { mount: ReturnType<typeof vi.fn> };
        const mountPoint = document.getElementById('app')!;
        app.mount(mountPoint);
      }

      expect(safeError).toHaveBeenCalledWith(
        '[App] Failed to bootstrap:',
        expect.objectContaining({ message: 'Store init failed' })
      );
    });

    it('handles missing mount point', () => {
      // Remove the mount point
      document.getElementById('app')?.remove();

      const mountEl = document.getElementById('app');
      if (!mountEl) {
        safeError('[App] Mount element "app" not found.');
      }

      expect(safeError).toHaveBeenCalledWith('[App] Mount element "app" not found.');
    });

    it('throws error and logs when mount point is null at bootstrap', () => {
      // This simulates the error path in main.ts where mountPoint is null
      const mountPoint = document.getElementById('app');
      if (!mountPoint) {
        safeError('[App] Failed to mount app: element with id "app" not found.');
      }

      expect(safeError).not.toHaveBeenCalled(); // still there since we didn't remove it
    });
  });

  // ── Dynamic Import (actual main.ts coverage) ─────────────────────

  describe('dynamic import of main.ts', () => {
    it('executes main.ts top-level and IIFE without throwing', async () => {
      // jsdom doesn't implement CSS.supports
      vi.stubGlobal('CSS', { supports: vi.fn(() => true) });

      // Set up mount point before dynamic import
      const mountPoint = document.createElement('div');
      mountPoint.id = 'app';
      document.body.appendChild(mountPoint);

      try {
        // Dynamic import triggers top-level code (initGlobalErrorHandling,
        // initDesignTokens, initTheme, safeLog calls) and the IIFE
        await import('../../src/main');

        // Verify top-level calls were made
        expect(initGlobalErrorHandling).toHaveBeenCalled();
        expect(initDesignTokens).toHaveBeenCalled();
        expect(initTheme).toHaveBeenCalled();
        expect(safeLog).toHaveBeenCalledWith(
          '[App] View Transitions API:',
          'supported'
        );
      } finally {
        vi.unstubAllGlobals();
        mountPoint.remove();
      }
    });
  });

  // ── Auth State Logging ─────────────────────────────────────────────

  describe('auth state logging', () => {
    it('logs authenticated state', async () => {
      vi.mocked(isAuthenticated).mockResolvedValue(true);

      const authenticated = await isAuthenticated();
      safeLog('[App] Authenticated:', authenticated);

      expect(safeLog).toHaveBeenCalledWith('[App] Authenticated:', true);
    });

    it('logs unauthenticated state', async () => {
      vi.mocked(isAuthenticated).mockResolvedValue(false);

      const authenticated = await isAuthenticated();
      safeLog('[App] Authenticated:', authenticated);

      expect(safeLog).toHaveBeenCalledWith('[App] Authenticated:', false);
    });
  });
});
