/**
 * Unit tests for Service Worker Registration utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/components/ui/toast', () => ({
  toast: {
    info: vi.fn(),
  },
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
  safeWarn: vi.fn(),
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { toast } from '../../src/components/ui/toast';
import { safeLog, safeError, safeWarn } from '../../src/services/security/logger';

// ── Shared mock ports (updated per test) ─────────────────────────────

let currentMockPort1: {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};
let currentMockPort2: typeof currentMockPort1;

function makePort() {
  return {
    onmessage: null as ((e: MessageEvent) => void) | null,
    postMessage: vi.fn(),
    close: vi.fn(),
    start: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

// Replace global MessageChannel with a real class that uses per-test ports
class MockMessageChannel {
  port1!: typeof currentMockPort1;
  port2!: typeof currentMockPort2;

  constructor() {
    this.port1 = currentMockPort1;
    this.port2 = currentMockPort2;
  }
}

function createMockServiceWorkerRegistration(
  overrides: Partial<ServiceWorkerRegistration> = {},
): ServiceWorkerRegistration {
  return {
    scope: '/',
    active: null as unknown as ServiceWorker,
    installing: null as unknown as ServiceWorker,
    waiting: null as unknown as ServiceWorker,
    updateViaCache: 'imports' as ServiceWorkerUpdateViaCache,
    onupdatefound: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    unregister: vi.fn().mockResolvedValue(true),
    getNotifications: vi.fn(),
    showNotification: vi.fn(),
    update: vi.fn(),
    ...overrides,
  } as unknown as ServiceWorkerRegistration;
}

// Track SW mock references for per-test customization
let mockRegister: ReturnType<typeof vi.fn>;
let mockReady: ReturnType<typeof vi.fn>;
let mockSWRegistration: ServiceWorkerRegistration;
let originalMessageChannel: typeof MessageChannel | undefined;
let originalSyncManager: typeof SyncManager | undefined;

// ── Tests ─────────────────────────────────────────────────────────────

describe('Service Worker Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Save originals before replacing globals
    originalMessageChannel = globalThis.MessageChannel;
    originalSyncManager = (globalThis as Record<string, unknown>).SyncManager as typeof SyncManager | undefined;

    // Initialize shared mock ports
    currentMockPort1 = makePort();
    currentMockPort2 = makePort();

    // Replace MessageChannel with class that uses the shared ports
    globalThis.MessageChannel = MockMessageChannel as unknown as typeof MessageChannel;

    mockSWRegistration = createMockServiceWorkerRegistration();
    mockRegister = vi.fn().mockResolvedValue(mockSWRegistration);
    mockReady = vi.fn().mockResolvedValue(mockSWRegistration);

    const mockSWContainer: Partial<ServiceWorkerContainer> = {
      register: mockRegister,
      get ready() {
        return mockReady();
      },
      controller: null as unknown as ServiceWorker,
      getRegistration: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      startMessages: vi.fn(),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockSWContainer,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as Record<string, unknown>).serviceWorker;

    // Restore original globals to prevent cross-test contamination
    globalThis.MessageChannel = originalMessageChannel as typeof MessageChannel;
    (globalThis as Record<string, unknown>).SyncManager = originalSyncManager ?? undefined;
  });

  // ── registerServiceWorker ────────────────────────────────────────────

  describe('registerServiceWorker', () => {
    async function register() {
      const mod = await import('../../src/services/pwa/register-sw');
      return mod.registerServiceWorker();
    }

    it('registers service worker at root scope', async () => {
      const registration = await register();
      expect(mockRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' });
      expect(registration).toBe(mockSWRegistration);
    });

    it('logs success on registration', async () => {
      await register();
      expect(safeLog).toHaveBeenCalledWith('[PWA] Service Worker registered');
    });

    it('returns null when service worker is not supported', async () => {
      delete (navigator as Record<string, unknown>).serviceWorker;
      const result = await register();
      expect(result).toBeNull();
    });

    it('warns when service worker not supported', async () => {
      delete (navigator as Record<string, unknown>).serviceWorker;
      await register();
      expect(safeWarn).toHaveBeenCalledWith('[PWA] Service Worker not supported');
    });

    it('handles registration failure and logs error', async () => {
      const error = new Error('Registration denied');
      mockRegister.mockRejectedValue(error);

      const result = await register();
      expect(result).toBeNull();
      expect(safeError).toHaveBeenCalledWith(
        '[PWA] Service Worker registration failed:',
        error,
      );
    });

    it('sets up updatefound listener on registration', async () => {
      const addEventListenerMock = vi.fn();
      mockSWRegistration = createMockServiceWorkerRegistration({
        addEventListener: addEventListenerMock,
      });
      mockRegister.mockResolvedValue(mockSWRegistration);
      mockReady.mockResolvedValue(mockSWRegistration);

      await register();
      expect(addEventListenerMock).toHaveBeenCalledWith(
        'updatefound',
        expect.any(Function),
      );
    });

    it('notifies update available when new worker is installed and controller exists', async () => {
      let updatefoundHandler!: () => void;

      const mockWorker = {
        state: 'installed',
        addEventListener: vi.fn((_event: string, handler: () => void) => {
          updatefoundHandler = handler;
        }),
        postMessage: vi.fn(),
        terminate: vi.fn(),
      };

      const regAddEventListener = vi.fn(
        (event: string, handler: () => void) => {
          if (event === 'updatefound') {
            mockSWRegistration.installing =
              mockWorker as unknown as ServiceWorker;
            handler();
          }
        },
      );

      mockSWRegistration = createMockServiceWorkerRegistration({
        addEventListener: regAddEventListener,
      });
      mockRegister.mockResolvedValue(mockSWRegistration);
      mockReady.mockResolvedValue(mockSWRegistration);

      // Set controller for the mock container
      const swContainer = navigator.serviceWorker as Record<string, unknown>;
      swContainer.controller = {} as ServiceWorker;

      await register();

      expect(mockWorker.addEventListener).toHaveBeenCalledWith(
        'statechange',
        expect.any(Function),
      );

      const stateChangeHandler = mockWorker.addEventListener.mock.calls.find(
        (c: [string, () => void]) => c[0] === 'statechange',
      )?.[1];
      expect(stateChangeHandler).toBeDefined();
      stateChangeHandler!();

      expect(toast.info).toHaveBeenCalledWith(
        'New version available — refresh to update',
        0,
        expect.objectContaining({ label: 'Refresh' }),
      );
    });
  });

  // ── unregisterServiceWorker ──────────────────────────────────────────

  describe('unregisterServiceWorker', () => {
    async function unregister() {
      const mod = await import('../../src/services/pwa/register-sw');
      return mod.unregisterServiceWorker();
    }

    it('unregisters the service worker', async () => {
      const result = await unregister();
      expect(mockSWRegistration.unregister).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('returns false when service worker not supported', async () => {
      delete (navigator as Record<string, unknown>).serviceWorker;
      const result = await unregister();
      expect(result).toBe(false);
    });
  });

  // ── clearCaches ────────────────────────────────────────────────────

  describe('clearCaches', () => {
    async function clear() {
      const mod = await import('../../src/services/pwa/register-sw');
      return mod.clearCaches();
    }

    it('sends CLEAR_CACHE message to active worker', async () => {
      const mockPostMessage = vi.fn();

      // Customize ports for this test
      currentMockPort1.onmessage = null;
      currentMockPort2.postMessage = vi.fn();

      mockSWRegistration = createMockServiceWorkerRegistration({
        active: { postMessage: mockPostMessage } as unknown as ServiceWorker,
      });
      mockReady.mockResolvedValue(mockSWRegistration);

      // Import module first so clearCaches() is called directly
      const { clearCaches } = await import('../../src/services/pwa/register-sw');
      const promise = clearCaches();

      // Wait for clearCaches to set up and call postMessage
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(
          { type: 'CLEAR_CACHE' },
          expect.any(Array),
        );
      });

      // Resolve the hanging promise to prevent unhandled rejection
      currentMockPort1.onmessage?.({} as MessageEvent);
      await promise;
    });

    it('resolves when port1.onmessage is called', async () => {
      currentMockPort1.onmessage = null;

      mockSWRegistration = createMockServiceWorkerRegistration({
        active: { postMessage: vi.fn() } as unknown as ServiceWorker,
      });
      mockReady.mockResolvedValue(mockSWRegistration);

      // Import module first, then call clearCaches directly
      const { clearCaches } = await import('../../src/services/pwa/register-sw');
      const promise = clearCaches();

      // Wait for clearCaches to set up port1.onmessage (after internal awaits resolve)
      await vi.waitFor(() => {
        expect(currentMockPort1.onmessage).not.toBeNull();
      });

      // Now trigger the resolve
      currentMockPort1.onmessage!({} as MessageEvent);
      await promise;
    });

    it('returns early when SW not supported', async () => {
      delete (navigator as Record<string, unknown>).serviceWorker;
      await expect(clear()).resolves.toBeUndefined();
    });
  });

  // ── isInstalled ─────────────────────────────────────────────────────

  describe('isInstalled', () => {
    async function checkInstalled() {
      const mod = await import('../../src/services/pwa/register-sw');
      return mod.isInstalled();
    }

    it('returns false when service worker is not supported', async () => {
      delete (navigator as Record<string, unknown>).serviceWorker;
      expect(await checkInstalled()).toBe(false);
    });

    it('returns false when there is no active controller', async () => {
      const swContainer = navigator.serviceWorker as Record<string, unknown>;
      swContainer.controller = null;
      expect(await checkInstalled()).toBe(false);
    });

    it('returns true when controller exists', async () => {
      const swContainer = navigator.serviceWorker as Record<string, unknown>;
      swContainer.controller = {} as ServiceWorker;
      expect(await checkInstalled()).toBe(true);
    });
  });

  // ── requestBackgroundSync ──────────────────────────────────────────

  describe('requestBackgroundSync', () => {
    async function requestSync() {
      const mod = await import('../../src/services/pwa/register-sw');
      return mod.requestBackgroundSync();
    }

    it('returns false when service worker not supported', async () => {
      delete (navigator as Record<string, unknown>).serviceWorker;
      const result = await requestSync();
      expect(result).toBe(false);
    });

    it('returns false when SyncManager is not supported', async () => {
      delete (globalThis as Record<string, unknown>).SyncManager;
      const result = await requestSync();
      expect(result).toBe(false);
    });

    it('registers background sync and returns true', async () => {
      const mockSyncRegister = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(globalThis, 'SyncManager', {
        value: vi.fn(),
        configurable: true,
        writable: true,
      });

      mockSWRegistration = createMockServiceWorkerRegistration({
        sync: { register: mockSyncRegister },
      } as unknown as ServiceWorkerRegistration);
      mockReady.mockResolvedValue(mockSWRegistration);

      const result = await requestSync();
      expect(mockSyncRegister).toHaveBeenCalledWith('sync-gists');
      expect(result).toBe(true);
    });

    it('logs on successful sync registration', async () => {
      const mockSyncRegister = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(globalThis, 'SyncManager', {
        value: vi.fn(),
        configurable: true,
        writable: true,
      });

      mockSWRegistration = createMockServiceWorkerRegistration({
        sync: { register: mockSyncRegister },
      } as unknown as ServiceWorkerRegistration);
      mockReady.mockResolvedValue(mockSWRegistration);

      await requestSync();
      expect(safeLog).toHaveBeenCalledWith('[PWA] Background sync registered');
    });

    it('handles sync registration failure', async () => {
      const error = new Error('Sync not available');
      const mockSyncRegister = vi.fn().mockRejectedValue(error);
      Object.defineProperty(globalThis, 'SyncManager', {
        value: vi.fn(),
        configurable: true,
        writable: true,
      });

      mockSWRegistration = createMockServiceWorkerRegistration({
        sync: { register: mockSyncRegister },
      } as unknown as ServiceWorkerRegistration);
      mockReady.mockResolvedValue(mockSWRegistration);

      const result = await requestSync();
      expect(result).toBe(false);
      expect(safeError).toHaveBeenCalledWith(
        '[PWA] Background sync registration failed:',
        error,
      );
    });
  });
});
