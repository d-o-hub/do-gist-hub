import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ─────────────────────────────────────

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

let storedPreference: string | null = null;

const mockLocalStorage = () => ({
  getItem: vi.fn((key: string) => (key === 'theme-preference' ? storedPreference : null)),
  setItem: vi.fn((key: string, value: string) => {
    if (key === 'theme-preference') {
      storedPreference = value;
    }
  }),
  removeItem: vi.fn((key: string) => {
    if (key === 'theme-preference') {
      storedPreference = null;
    }
  }),
});

// ── Imports (after mocks) ─────────────────────

import {
  resolveTimeBasedTheme,
  resolveTheme,
  setTheme,
  getTheme,
  getThemePreference,
  initTheme,
  initDesignTokens,
} from '../../src/tokens/design-tokens';

// ── Helpers ─────────────────────────────────────

function mockHour(hour: number): void {
  const date = new Date(2026, 0, 1, hour, 0, 0);
  vi.setSystemTime(date);
}

function mockSystemPreference(dark: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? dark : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

// ── Tests ─────────────────────────────────────

describe('Design Tokens — Theme System', () => {
  let setAttributeSpy: ReturnType<typeof vi.spyOn>;
  let dispatchEventSpy: ReturnType<typeof vi.spyOn>;
  let setIntervalSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    storedPreference = null;
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', mockLocalStorage());

    setAttributeSpy = vi.spyOn(document.documentElement, 'setAttribute');
    dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    // Global matchMedia fallback so resolveTheme(null) never throws
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setAttributeSpy.mockRestore();
    dispatchEventSpy.mockRestore();
    setIntervalSpy.mockRestore();
  });

  // ── resolveTimeBasedTheme ─────────────────────

  describe('resolveTimeBasedTheme', () => {
    it('returns dark at 19:00', () => {
      mockHour(19);
      expect(resolveTimeBasedTheme()).toBe('dark');
    });

    it('returns dark at 23:00', () => {
      mockHour(23);
      expect(resolveTimeBasedTheme()).toBe('dark');
    });

    it('returns dark at 06:00', () => {
      mockHour(6);
      expect(resolveTimeBasedTheme()).toBe('dark');
    });

    it('returns light at 07:00', () => {
      mockHour(7);
      expect(resolveTimeBasedTheme()).toBe('light');
    });

    it('returns light at 12:00', () => {
      mockHour(12);
      expect(resolveTimeBasedTheme()).toBe('light');
    });

    it('returns light at 18:00', () => {
      mockHour(18);
      expect(resolveTimeBasedTheme()).toBe('light');
    });
  });

  // ── resolveTheme ──────────────────────────────

  describe('resolveTheme', () => {
    it('resolves time to dark at night', () => {
      mockHour(22);
      expect(resolveTheme('time')).toBe('dark');
    });

    it('resolves time to light during day', () => {
      mockHour(10);
      expect(resolveTheme('time')).toBe('light');
    });

    it('resolves light directly', () => {
      expect(resolveTheme('light')).toBe('light');
    });

    it('resolves dark directly', () => {
      expect(resolveTheme('dark')).toBe('dark');
    });

    it('falls back to system dark preference', () => {
      mockSystemPreference(true);
      expect(resolveTheme(null)).toBe('dark');
    });

    it('falls back to dark when no preference and system prefers light', () => {
      mockSystemPreference(false);
      expect(resolveTheme(null)).toBe('dark');
    });
  });

  // ── getThemePreference ────────────────────────

  describe('getThemePreference', () => {
    it('returns null when nothing stored', () => {
      expect(getThemePreference()).toBeNull();
    });

    it('returns stored time preference', () => {
      storedPreference = 'time';
      expect(getThemePreference()).toBe('time');
    });

    it('returns stored dark preference', () => {
      storedPreference = 'dark';
      expect(getThemePreference()).toBe('dark');
    });
  });

  // ── setTheme ──────────────────────────────────

  describe('setTheme', () => {
    it('sets light theme and stores preference', () => {
      setTheme('light');
      expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'light');
      expect(storedPreference).toBe('light');
    });

    it('sets dark theme and stores preference', () => {
      setTheme('dark');
      expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
      expect(storedPreference).toBe('dark');
    });

    it('sets time-based theme and stores time preference', () => {
      mockHour(10);
      setTheme('time');
      expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'light');
      expect(storedPreference).toBe('time');
    });

    it('clears interval when switching from time to light', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      setTheme('time');
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);

      setTheme('light');
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  // ── getTheme ──────────────────────────────────

  describe('getTheme', () => {
    it('returns resolved light when stored preference is light', () => {
      storedPreference = 'light';
      expect(getTheme()).toBe('light');
    });

    it('returns resolved dark when stored preference is dark', () => {
      storedPreference = 'dark';
      expect(getTheme()).toBe('dark');
    });

    it('returns resolved theme when stored preference is time', () => {
      mockHour(22);
      storedPreference = 'time';
      expect(getTheme()).toBe('dark');
    });
  });

  // ── initTheme ─────────────────────────────────

  describe('initTheme', () => {
    it('initializes with light preference', () => {
      storedPreference = 'light';
      initTheme();
      expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'light');
    });

    it('initializes with dark preference', () => {
      storedPreference = 'dark';
      initTheme();
      expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('initializes with time preference and starts interval', () => {
      mockHour(10);
      storedPreference = 'time';
      initTheme();
      expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'light');
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it('initializes with no preference and defaults to dark', () => {
      mockSystemPreference(false);
      initTheme();
      expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('clears existing interval when re-initializing with non-time preference', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      storedPreference = 'time';
      initTheme();
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);

      storedPreference = 'dark';
      initTheme();
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('re-evaluates time-based theme when interval fires after boundary', () => {
      mockHour(6); // dark
      storedPreference = 'time';
      initTheme();
      expect(setAttributeSpy).toHaveBeenLastCalledWith('data-theme', 'dark');

      // Advance past the interval duration
      mockHour(10); // light
      vi.advanceTimersByTime(900_000);

      expect(setAttributeSpy).toHaveBeenLastCalledWith('data-theme', 'light');
    });

    it('dispatches app:theme-change event when theme changes after interval', () => {
      mockHour(6); // dark
      storedPreference = 'time';
      initTheme();

      mockHour(10); // light
      vi.advanceTimersByTime(900_000);

      const dispatched = dispatchEventSpy.mock.calls.some(
        (call) =>
          call[0] instanceof CustomEvent && (call[0] as CustomEvent).detail?.theme === 'light'
      );
      expect(dispatched).toBe(true);
    });

    it('does not dispatch event when theme stays the same after interval', () => {
      mockHour(10); // light
      storedPreference = 'time';
      initTheme();

      dispatchEventSpy.mockClear();
      vi.advanceTimersByTime(900_000);

      const themeChangeDispatched = dispatchEventSpy.mock.calls.some(
        (call) => call[0] instanceof CustomEvent && call[0].type === 'app:theme-change'
      );
      expect(themeChangeDispatched).toBe(false);
    });
  });

  // ── initDesignTokens ──────────────────────────

  describe('initDesignTokens', () => {
    it('injects a link element on first call', () => {
      initDesignTokens();
      const link = document.getElementById('design-tokens');
      expect(link).not.toBeNull();
      expect(link?.tagName).toBe('LINK');
    });

    it('is idempotent on subsequent calls', () => {
      initDesignTokens();
      const link1 = document.getElementById('design-tokens');
      initDesignTokens();
      const link2 = document.getElementById('design-tokens');
      expect(link1).toBe(link2);
    });
  });
});
