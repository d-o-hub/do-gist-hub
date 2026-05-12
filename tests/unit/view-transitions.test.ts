/**
 * Unit tests for View Transitions utility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withViewTransition,
  isViewTransitionSupported,
  viewTransitionNames,
} from '../../src/utils/view-transitions';

describe('view-transitions', () => {
  // ── isViewTransitionSupported ──────────────────────────────────

  describe('isViewTransitionSupported', () => {
    it('returns true when startViewTransition exists in document', () => {
      expect(isViewTransitionSupported()).toBe(
        'startViewTransition' in document,
      );
    });
  });

  // ── withViewTransition — no API support ────────────────────────

  describe('withViewTransition without API support', () => {
    beforeEach(() => {
      delete (document as Record<string, unknown>).startViewTransition;
    });

    afterEach(() => {
      // Reset by defining again if needed
    });

    it('calls updateFn directly when API is not available', async () => {
      const updateFn = vi.fn();
      await withViewTransition(updateFn);
      expect(updateFn).toHaveBeenCalledTimes(1);
    });

    it('awaits async updateFn', async () => {
      const updateFn = vi.fn().mockResolvedValue(undefined);
      await withViewTransition(updateFn);
      expect(updateFn).toHaveBeenCalledTimes(1);
    });
  });

  // ── withViewTransition — with API support ──────────────────────

  describe('withViewTransition with API support', () => {
    let mockTransition: { finished: Promise<void> };

    beforeEach(() => {
      vi.stubGlobal('navigator', {
        ...navigator,
        webdriver: false,
        userAgent: 'Mozilla/5.0 Chrome/120.0',
      });

      mockTransition = {
        finished: Promise.resolve(),
      };

      (document as Record<string, unknown>).startViewTransition = vi.fn(
        (cb: () => void | Promise<void>) => {
          cb();
          return mockTransition;
        },
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      delete (document as Record<string, unknown>).startViewTransition;
    });

    it('calls startViewTransition when API is supported', async () => {
      const updateFn = vi.fn();
      await withViewTransition(updateFn);

      expect(document.startViewTransition).toHaveBeenCalledWith(updateFn);
    });

    it('calls updateFn via transition callback', async () => {
      const updateFn = vi.fn();
      await withViewTransition(updateFn);
      expect(updateFn).toHaveBeenCalledTimes(1);
    });

    it('awaits transition.finished', async () => {
      let finished = false;
      mockTransition.finished = new Promise<void>((resolve) => {
        setTimeout(() => {
          finished = true;
          resolve();
        }, 10);
      });

      const updateFn = vi.fn();
      await withViewTransition(updateFn);
      expect(finished).toBe(true);
    });

    it('handles async updateFn', async () => {
      const updateFn = vi.fn().mockResolvedValue(undefined);
      await withViewTransition(updateFn);
      expect(updateFn).toHaveBeenCalledTimes(1);
    });
  });

  // ── withViewTransition — automated environment ─────────────────

  describe('withViewTransition in automated environment', () => {
    beforeEach(() => {
      vi.stubGlobal('navigator', {
        ...navigator,
        webdriver: true,
        userAgent: 'Mozilla/5.0 Chrome/120.0',
      });

      (document as Record<string, unknown>).startViewTransition = vi.fn();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      delete (document as Record<string, unknown>).startViewTransition;
    });

    it('calls updateFn directly without startViewTransition in headless/webdriver mode', async () => {
      const updateFn = vi.fn();
      await withViewTransition(updateFn);

      expect(updateFn).toHaveBeenCalledTimes(1);
      expect(document.startViewTransition).not.toHaveBeenCalled();
    });

    it('detects HeadlessChrome user agent', async () => {
      vi.stubGlobal('navigator', {
        ...navigator,
        webdriver: false,
        userAgent: 'HeadlessChrome/120.0',
      });

      const updateFn = vi.fn();
      await withViewTransition(updateFn);

      expect(document.startViewTransition).not.toHaveBeenCalled();
    });

    it('detects PhantomJS user agent', async () => {
      vi.stubGlobal('navigator', {
        ...navigator,
        webdriver: false,
        userAgent: 'PhantomJS/2.1.1',
      });

      const updateFn = vi.fn();
      await withViewTransition(updateFn);

      expect(document.startViewTransition).not.toHaveBeenCalled();
    });
  });

  // ── viewTransitionNames ────────────────────────────────────────

  describe('viewTransitionNames', () => {
    it('defines gistCard name', () => {
      expect(viewTransitionNames.gistCard).toBe('gist-card');
    });

    it('defines gistDetail name', () => {
      expect(viewTransitionNames.gistDetail).toBe('gist-detail');
    });

    it('defines gistList name', () => {
      expect(viewTransitionNames.gistList).toBe('gist-list');
    });

    it('defines header name', () => {
      expect(viewTransitionNames.header).toBe('app-header');
    });

    it('has exactly 4 entries', () => {
      expect(Object.keys(viewTransitionNames).length).toBe(4);
    });

    it('all values are non-empty strings', () => {
      for (const value of Object.values(viewTransitionNames)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });
  });
});
