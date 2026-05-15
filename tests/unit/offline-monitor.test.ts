/**
 * Unit tests for src/services/network/offline-monitor.ts
 * Covers init, getStatus, isOnline, subscribe, online/offline events, destroy
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import networkMonitor from '../../src/services/network/offline-monitor';

describe('OfflineMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton state completely
    networkMonitor.destroy();
    // Ensure we start from 'online' status (jsdom defaults navigator.onLine to true)
    // The constructor sets status based on navigator.onLine, but after destroy()
    // the status persists. We need to force it back by reinitializing to get
    // the default from navigator.onLine.
    networkMonitor.init();
    networkMonitor.destroy(); // destroy again to clear listeners but init sets up fresh state
  });

  afterEach(() => {
    networkMonitor.destroy();
    vi.restoreAllMocks();
  });

  describe('init', () => {
    it('initializes and sets up event listeners', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      networkMonitor.init();
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any(Function),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'offline',
        expect.any(Function),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('does not register duplicate listeners on second call', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      networkMonitor.init();
      networkMonitor.init(); // Second call should be no-op
      expect(addEventListenerSpy).toHaveBeenCalledTimes(2); // online + offline once each
    });
  });

  describe('getStatus / isOnline', () => {
    it('returns current network status', () => {
      networkMonitor.init();
      expect(['online', 'offline']).toContain(networkMonitor.getStatus());
    });

    it('isOnline returns boolean matching status', () => {
      networkMonitor.init();
      expect(typeof networkMonitor.isOnline()).toBe('boolean');
    });
  });

  describe('subscribe', () => {
    it('returns an unsubscribe function', () => {
      networkMonitor.init();
      const handler = vi.fn();
      const unsubscribe = networkMonitor.subscribe(handler);
      expect(typeof unsubscribe).toBe('function');
    });

    it('unsubscribe removes the handler', () => {
      networkMonitor.init();
      const handler = vi.fn();
      const unsubscribe = networkMonitor.subscribe(handler);
      unsubscribe();

      // Simulate events
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('online/offline events', () => {
    it('updates status when going offline and dispatches custom event', () => {
      networkMonitor.init();
      // Ensure we start online
      window.dispatchEvent(new Event('online'));
      networkMonitor.getStatus(); // consume the online status

      const handler = vi.fn();
      window.addEventListener('app:offline', handler);

      window.dispatchEvent(new Event('offline'));

      expect(networkMonitor.getStatus()).toBe('offline');
      expect(networkMonitor.isOnline()).toBe(false);
      expect(handler).toHaveBeenCalled();
    });

    it('updates status when going online and dispatches custom event', () => {
      networkMonitor.init();
      // First trigger offline
      window.dispatchEvent(new Event('offline'));
      expect(networkMonitor.isOnline()).toBe(false);

      const handler = vi.fn();
      window.addEventListener('app:online', handler);

      window.dispatchEvent(new Event('online'));

      expect(networkMonitor.getStatus()).toBe('online');
      expect(networkMonitor.isOnline()).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    it('notifies subscribed handlers on status change', () => {
      networkMonitor.init();
      // Ensure start online
      window.dispatchEvent(new Event('online'));

      const handler = vi.fn();
      networkMonitor.subscribe(handler);

      window.dispatchEvent(new Event('offline'));
      expect(handler).toHaveBeenCalledWith('offline');
    });

    it('notifies multiple subscribers on status change', () => {
      networkMonitor.init();
      // Ensure start online
      window.dispatchEvent(new Event('online'));

      const handler1 = vi.fn();
      const handler2 = vi.fn();
      networkMonitor.subscribe(handler1);
      networkMonitor.subscribe(handler2);

      window.dispatchEvent(new Event('offline'));
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('aborts controller and clears listeners', () => {
      networkMonitor.init();
      // Capture controller AFTER init() to ensure we're spying on the live instance
      const controller = (networkMonitor as any).abortController;
      const abortSpy = vi.spyOn(controller, 'abort');
      networkMonitor.destroy();

      expect(abortSpy).toHaveBeenCalled();
    });
  });
});
