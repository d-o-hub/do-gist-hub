import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (hoisted) ───────────────────────────

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

vi.mock('../../src/services/github/client', () => ({
  cancelAllRequests: vi.fn(),
}));

// ── Imports (after mocks) ───────────────────────────

import { lifecycle } from '../../src/services/lifecycle';

import { safeLog, safeError } from '../../src/services/security/logger';

// ── Tests ─────────────────────────────────────

describe('Lifecycle Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── onRouteCleanup / cleanupRoute ───────────────

  describe('route cleanup', () => {
    it('registers a route cleanup callback', () => {
      const callback = vi.fn();
      expect(() => lifecycle.onRouteCleanup(callback)).not.toThrow();
    });

    it('calls route cleanup callbacks on cleanupRoute', () => {
      const callback = vi.fn();
      lifecycle.onRouteCleanup(callback);
      lifecycle.cleanupRoute();
      expect(callback).toHaveBeenCalled();
    });

    it('clears route callbacks after cleanupRoute', () => {
      const callback = vi.fn();
      lifecycle.onRouteCleanup(callback);
      lifecycle.cleanupRoute();
      // Call again - should not call the callback again
      callback.mockClear();
      lifecycle.cleanupRoute();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ── onAppCleanup / cleanupApp ─────────────────

  describe('app cleanup', () => {
    it('registers an app cleanup callback', () => {
      const callback = vi.fn();
      expect(() => lifecycle.onAppCleanup(callback)).not.toThrow();
    });

    it('calls app cleanup callbacks on cleanupApp', () => {
      const callback = vi.fn();
      lifecycle.onAppCleanup(callback);
      lifecycle.cleanupApp();
      expect(callback).toHaveBeenCalled();
    });
  });

  // ── cleanupApp ──────────────────────

  describe('cleanupApp', () => {
    it('calls all registered callbacks', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      lifecycle.onRouteCleanup(cb1);
      lifecycle.onAppCleanup(cb2);

      lifecycle.cleanupApp();

      expect(cb1).toHaveBeenCalled();
      expect(cb2).toHaveBeenCalled();
    });

    it('logs cleanup action', () => {
      lifecycle.cleanupApp();
      expect(safeLog).toHaveBeenCalledWith('[Lifecycle] Cleaning up route resources...');
    });

    it('handles errors in callbacks gracefully', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      lifecycle.onRouteCleanup(errorCallback);

      expect(() => lifecycle.cleanupApp()).not.toThrow();
      expect(safeError).toHaveBeenCalled();
    });

    it('clears all callbacks after app cleanup', () => {
      const cb = vi.fn();
      lifecycle.onRouteCleanup(cb);
      lifecycle.onAppCleanup(cb);

      lifecycle.cleanupApp();

      // After cleanupApp, callbacks should be cleared
      cb.mockClear();
      lifecycle.cleanupApp();
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
