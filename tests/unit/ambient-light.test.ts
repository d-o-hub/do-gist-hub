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
import { initTheme, cleanupThemeSystem } from '../../src/tokens/design-tokens';

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

    it('starts sensor and triggers onreading when permission granted', async () => {
      // Create a controllable sensor with onreading/onerror support
      let capturedOnreading: (() => void) | null = null;
      let capturedOnerror: ((event: Event) => void) | null = null;
      let startCalled = false;

      const mockSensor = {
        illuminance: 100,
        start: vi.fn(() => {
          startCalled = true;
        }),
        stop: vi.fn(),
        onreading: null as (() => void) | null,
        onerror: null as ((event: Event) => void) | null,
      };

      // Override onreading/onerror to capture callbacks using closure variables (avoiding recursion)
      let internalOnreading: (() => void) | null = null;
      let internalOnerror: ((event: Event) => void) | null = null;

      Object.defineProperty(mockSensor, 'onreading', {
        get: () => internalOnreading,
        set(fn: (() => void) | null) {
          internalOnreading = fn;
          capturedOnreading = fn;
        },
        configurable: true,
      });
      Object.defineProperty(mockSensor, 'onerror', {
        get: () => internalOnerror,
        set(fn: ((event: Event) => void) | null) {
          internalOnerror = fn;
          capturedOnerror = fn;
        },
        configurable: true,
      });

      // Use a real constructor function that returns the mock sensor object
      function AmbientLightSensorCtor() {
        return mockSensor;
      }
      (window as unknown as Record<string, unknown>).AmbientLightSensor = AmbientLightSensorCtor;

      const originalPermissions = navigator.permissions;
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: vi.fn().mockResolvedValue({ state: 'granted' }),
        },
        configurable: true,
      });

      try {
        const result = await startAmbientLightSensor();
        expect(result).toBe(true);
        expect(startCalled).toBe(true);

        // Simulate onreading (100 lux → dark theme)
        document.documentElement.setAttribute('data-theme', 'light');
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        capturedOnreading?.();
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(dispatchSpy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'app:theme-change' })
        );
        dispatchSpy.mockRestore();
      } finally {
        delete (window as unknown as Record<string, unknown>).AmbientLightSensor;
        Object.defineProperty(navigator, 'permissions', {
          value: originalPermissions,
          configurable: true,
        });
      }
    });

    it('falls back to time-based theme on sensor error', async () => {
      let capturedOnerror: ((event: Event) => void) | null = null;

      const mockSensor = {
        illuminance: 0,
        start: vi.fn(),
        stop: vi.fn(),
        onreading: null as (() => void) | null,
        onerror: null as ((event: Event) => void) | null,
      };

      // Capture onerror callback using closure variable (avoiding recursion)
      let internalOnerror: ((event: Event) => void) | null = null;
      Object.defineProperty(mockSensor, 'onerror', {
        get: () => internalOnerror,
        set(fn: ((event: Event) => void) | null) {
          internalOnerror = fn;
          capturedOnerror = fn;
        },
        configurable: true,
      });

      function AmbientLightSensorCtor() {
        return mockSensor;
      }
      (window as unknown as Record<string, unknown>).AmbientLightSensor = AmbientLightSensorCtor;

      const originalPermissions = navigator.permissions;
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: vi.fn().mockResolvedValue({ state: 'granted' }),
        },
        configurable: true,
      });

      try {
        const result = await startAmbientLightSensor();
        expect(result).toBe(true);

        // Simulate sensor error — should fall back to time-based theme
        capturedOnerror?.(new Event('error'));
        expect(cleanupThemeSystem).toHaveBeenCalled();
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

  describe('cleanupAmbientLightSensor (with active sensor)', () => {
    it('stops active sensor and cleans up', async () => {
      const mockSensor = {
        illuminance: 200,
        start: vi.fn(),
        stop: vi.fn(),
        onreading: null as (() => void) | null,
        onerror: null as ((event: Event) => void) | null,
      };

      function AmbientLightSensorCtor() {
        return mockSensor;
      }
      (window as unknown as Record<string, unknown>).AmbientLightSensor = AmbientLightSensorCtor;

      const originalPermissions = navigator.permissions;
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: vi.fn().mockResolvedValue({ state: 'granted' }),
        },
        configurable: true,
      });

      try {
        await startAmbientLightSensor();

        cleanupAmbientLightSensor();

        expect(mockSensor.stop).toHaveBeenCalled();
        expect(cleanupThemeSystem).toHaveBeenCalled();
      } finally {
        delete (window as unknown as Record<string, unknown>).AmbientLightSensor;
        Object.defineProperty(navigator, 'permissions', {
          value: originalPermissions,
          configurable: true,
        });
      }
    });
  });

  describe('enableAmbientLightTheming (success path)', () => {
    it('starts sensor and sets ambient preference on success', async () => {
      const mockSensor = {
        illuminance: 500,
        start: vi.fn(),
        stop: vi.fn(),
        onreading: null as (() => void) | null,
        onerror: null as ((event: Event) => void) | null,
      };

      function AmbientLightSensorCtor() {
        return mockSensor;
      }
      (window as unknown as Record<string, unknown>).AmbientLightSensor = AmbientLightSensorCtor;

      const originalPermissions = navigator.permissions;
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: vi.fn().mockResolvedValue({ state: 'granted' }),
        },
        configurable: true,
      });

      try {
        const result = await enableAmbientLightTheming();

        expect(result).toBe(true);
        expect(localStorage.getItem('theme-preference')).toBe('ambient');
      } finally {
        delete (window as unknown as Record<string, unknown>).AmbientLightSensor;
        Object.defineProperty(navigator, 'permissions', {
          value: originalPermissions,
          configurable: true,
        });
        cleanupAmbientLightSensor();
      }
    });
  });

  describe('isAmbientLightSupported (true when constructor exists but throws)', () => {
    it('returns true when AmbientLightSensor is defined but throws on create', () => {
      (window as unknown as Record<string, unknown>).AmbientLightSensor = vi.fn(() => {
        throw new Error('constructor error');
      });
      try {
        expect(isAmbientLightSupported()).toBe(true);
      } finally {
        delete (window as unknown as Record<string, unknown>).AmbientLightSensor;
      }
    });
  });
});
