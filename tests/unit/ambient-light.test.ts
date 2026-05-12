/**
 * Unit tests for Ambient Light Theming
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/tokens/design-tokens', () => ({
  initTheme: vi.fn(),
  cleanupThemeSystem: vi.fn(),
}));

vi.mock('../../src/components/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import {
  resolveAmbientTheme,
  isAmbientLightSupported,
  checkAmbientLightPermission,
  enableAmbientLightTheming,
  startAmbientLightSensor,
  cleanupAmbientLightSensor,
} from '../../src/components/ui/ambient-light';
import { initTheme } from '../../src/tokens/design-tokens';

// ── Tests ─────────────────────────────────────────────────────────────

describe('Ambient Light Theming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanupAmbientLightSensor();
  });

  // ── resolveAmbientTheme ────────────────────────────────────────────

  describe('resolveAmbientTheme', () => {
    it('returns dark theme for lux < 200', () => {
      expect(resolveAmbientTheme(0)).toBe('dark');
      expect(resolveAmbientTheme(50)).toBe('dark');
      expect(resolveAmbientTheme(199)).toBe('dark');
    });

    it('returns light theme for lux >= 200', () => {
      expect(resolveAmbientTheme(200)).toBe('light');
      expect(resolveAmbientTheme(500)).toBe('light');
      expect(resolveAmbientTheme(10000)).toBe('light');
    });

    it('handles edge case exactly at threshold', () => {
      // 200 should be light (inclusive threshold)
      expect(resolveAmbientTheme(200)).toBe('light');
    });
  });

  // ── isAmbientLightSupported ────────────────────────────────────────

  describe('isAmbientLightSupported', () => {
    it('returns false when AmbientLightSensor is not available', () => {
      expect(isAmbientLightSupported()).toBe(false);
    });

    it('returns true when AmbientLightSensor is available', () => {
      // Temporarily set the AmbientLightSensor on window
      const originalSensor = (window as unknown as Record<string, unknown>).AmbientLightSensor;
      (window as unknown as Record<string, unknown>).AmbientLightSensor = vi.fn();
      try {
        expect(isAmbientLightSupported()).toBe(true);
      } finally {
        if (originalSensor === undefined) {
          delete (window as unknown as Record<string, unknown>).AmbientLightSensor;
        } else {
          (window as unknown as Record<string, unknown>).AmbientLightSensor = originalSensor;
        }
      }
    });
  });

  // ── checkAmbientLightPermission ────────────────────────────────────

  describe('checkAmbientLightPermission', () => {
    it('returns false when sensor is not supported', async () => {
      const result = await checkAmbientLightPermission();
      expect(result).toBe(false);
    });

    it('returns true when permission is granted', async () => {
      const originalSensor = (window as unknown as Record<string, unknown>).AmbientLightSensor;
      (window as unknown as Record<string, unknown>).AmbientLightSensor = vi.fn();

      const originalPermissions = navigator.permissions;
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: vi.fn().mockResolvedValue({ state: 'granted' }),
        },
        configurable: true,
      });

      try {
        const result = await checkAmbientLightPermission();
        expect(result).toBe(true);
      } finally {
        if (originalSensor === undefined) {
          delete (window as unknown as Record<string, unknown>).AmbientLightSensor;
        } else {
          (window as unknown as Record<string, unknown>).AmbientLightSensor = originalSensor;
        }
        Object.defineProperty(navigator, 'permissions', {
          value: originalPermissions,
          configurable: true,
        });
      }
    });

    it('returns false when permission is denied', async () => {
      const originalSensor = (window as unknown as Record<string, unknown>).AmbientLightSensor;
      (window as unknown as Record<string, unknown>).AmbientLightSensor = vi.fn();

      const originalPermissions = navigator.permissions;
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: vi.fn().mockResolvedValue({ state: 'denied' }),
        },
        configurable: true,
      });

      try {
        const result = await checkAmbientLightPermission();
        expect(result).toBe(false);
      } finally {
        if (originalSensor === undefined) {
          delete (window as unknown as Record<string, unknown>).AmbientLightSensor;
        } else {
          (window as unknown as Record<string, unknown>).AmbientLightSensor = originalSensor;
        }
        Object.defineProperty(navigator, 'permissions', {
          value: originalPermissions,
          configurable: true,
        });
      }
    });

    it('returns false when permissions API throws', async () => {
      const originalSensor = (window as unknown as Record<string, unknown>).AmbientLightSensor;
      (window as unknown as Record<string, unknown>).AmbientLightSensor = vi.fn();

      const originalPermissions = navigator.permissions;
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: vi.fn().mockRejectedValue(new Error('Permission error')),
        },
        configurable: true,
      });

      try {
        const result = await checkAmbientLightPermission();
        expect(result).toBe(false);
      } finally {
        if (originalSensor === undefined) {
          delete (window as unknown as Record<string, unknown>).AmbientLightSensor;
        } else {
          (window as unknown as Record<string, unknown>).AmbientLightSensor = originalSensor;
        }
        Object.defineProperty(navigator, 'permissions', {
          value: originalPermissions,
          configurable: true,
        });
      }
    });
  });

  // ── cleanupAmbientLightSensor ──────────────────────────────────────

  describe('cleanupAmbientLightSensor', () => {
    it('cleans up without throwing when sensor was never started', () => {
      expect(() => {
        cleanupAmbientLightSensor();
      }).not.toThrow();
    });
  });

  // ── enableAmbientLightTheming ──────────────────────────────────────

  describe('enableAmbientLightTheming', () => {
    it('returns false and falls back to time-based when sensor unsupported', async () => {
      const result = await enableAmbientLightTheming();
      expect(result).toBe(false);
      expect(initTheme).toHaveBeenCalled();
      expect(localStorage.getItem('theme-preference')).toBe('time');
    });

    it('returns false and falls back when permission is denied', async () => {
      const originalSensor = (window as unknown as Record<string, unknown>).AmbientLightSensor;
      (window as unknown as Record<string, unknown>).AmbientLightSensor = vi.fn();

      const originalPermissions = navigator.permissions;
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: vi.fn().mockResolvedValue({ state: 'denied' }),
        },
        configurable: true,
      });

      try {
        const result = await enableAmbientLightTheming();
        expect(result).toBe(false);
        expect(initTheme).toHaveBeenCalled();
        expect(localStorage.getItem('theme-preference')).toBe('time');
      } finally {
        if (originalSensor === undefined) {
          delete (window as unknown as Record<string, unknown>).AmbientLightSensor;
        } else {
          (window as unknown as Record<string, unknown>).AmbientLightSensor = originalSensor;
        }
        Object.defineProperty(navigator, 'permissions', {
          value: originalPermissions,
          configurable: true,
        });
      }
    });

    it('returns false when sensor fails to start after permission granted', async () => {
      // Set up AmbientLightSensor that errors on start
      const mockSensor = vi.fn().mockImplementation(() => ({
        illuminance: 100,
        start: vi.fn(() => { throw new Error('Sensor error'); }),
        stop: vi.fn(),
        onreading: null,
        onerror: null,
      }));
      (window as unknown as Record<string, unknown>).AmbientLightSensor = mockSensor;

      const originalPermissions = navigator.permissions;
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: vi.fn().mockResolvedValue({ state: 'granted' }),
        },
        configurable: true,
      });

      try {
        const result = await enableAmbientLightTheming();
        expect(result).toBe(false);
        expect(initTheme).toHaveBeenCalled();
      } finally {
        delete (window as unknown as Record<string, unknown>).AmbientLightSensor;
        Object.defineProperty(navigator, 'permissions', {
          value: originalPermissions,
          configurable: true,
        });
      }
    });
  });

  // ── startAmbientLightSensor (permission granted path) ─────────────

  describe('startAmbientLightSensor', () => {
    it('returns false when sensor is not supported', async () => {
      const result = await startAmbientLightSensor();
      expect(result).toBe(false);
    });

    it('returns false when permission check fails', async () => {
      const originalSensor = (window as unknown as Record<string, unknown>).AmbientLightSensor;
      (window as unknown as Record<string, unknown>).AmbientLightSensor = vi.fn();

      const originalPermissions = navigator.permissions;
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: vi.fn().mockResolvedValue({ state: 'denied' }),
        },
        configurable: true,
      });

      try {
        const result = await startAmbientLightSensor();
        expect(result).toBe(false);
      } finally {
        if (originalSensor === undefined) {
          delete (window as unknown as Record<string, unknown>).AmbientLightSensor;
        } else {
          (window as unknown as Record<string, unknown>).AmbientLightSensor = originalSensor;
        }
        Object.defineProperty(navigator, 'permissions', {
          value: originalPermissions,
          configurable: true,
        });
      }
    });
  });
});
