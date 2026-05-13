/**
 * Unit tests for Web Vitals monitoring service
 * Covers initWebVitals, reportMetric, storeMetric, and getStoredMetrics
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mocks (hoisted) ----

vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn(),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

vi.mock('../../src/services/db', () => ({
  getDB: vi.fn(() => ({})),
  getMetadata: vi.fn(),
  setMetadata: vi.fn(),
}));

// ---- Imports (after mocks) ----

import { onCLS, onFCP, onINP, onLCP } from 'web-vitals';
import type { Metric } from 'web-vitals';
import { safeLog } from '../../src/services/security/logger';
import { getMetadata, setMetadata } from '../../src/services/db';

// Module-level import for functions under test
let initWebVitals: () => void;
let getStoredMetrics: () => Promise<Record<string, unknown>>;

describe('Web Vitals', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module state between tests by re-importing
    const mod = await import('../../src/services/perf/web-vitals');
    initWebVitals = mod.initWebVitals;
    getStoredMetrics = mod.getStoredMetrics;
  });

  // ---- initWebVitals ----

  describe('initWebVitals', () => {
    it('registers all four Core Web Vitals listeners', () => {
      initWebVitals();

      expect(onLCP).toHaveBeenCalledWith(expect.any(Function));
      expect(onCLS).toHaveBeenCalledWith(expect.any(Function));
      expect(onINP).toHaveBeenCalledWith(expect.any(Function));
      expect(onFCP).toHaveBeenCalledWith(expect.any(Function));
    });

    it('registers listeners only once per call', () => {
      initWebVitals();
      initWebVitals();

      // Each register function should be called exactly once per initWebVitals call
      expect(onLCP).toHaveBeenCalledTimes(2);
      expect(onCLS).toHaveBeenCalledTimes(2);
      expect(onINP).toHaveBeenCalledTimes(2);
      expect(onFCP).toHaveBeenCalledTimes(2);
    });
  });

  // ---- reportMetric (internal, tested via callback) ----

  describe('metric reporting callback', () => {
    it('stores metric in IndexedDB via storeMetric', async () => {
      // Call init to capture the callback
      initWebVitals();

      // Get the callback that was passed to onLCP
      const lcpCallback = vi.mocked(onLCP).mock.calls[0]?.[0];
      expect(lcpCallback).toBeDefined();

      const mockMetric: Metric = {
        name: 'LCP',
        value: 2500,
        rating: 'needs-improvement',
        delta: 500,
        id: 'test-id-1',
        entries: [],
        navigationType: 'navigate',
      };

      // Mock getMetadata to return existing metrics
      vi.mocked(getMetadata).mockResolvedValue({
        LCP: { value: 1500, rating: 'good', timestamp: 1000 },
      });

      // Invoke the callback
      lcpCallback!(mockMetric);

      // Wait for async storeMetric to complete
      await vi.waitFor(() => {
        expect(setMetadata).toHaveBeenCalledWith('perf-metrics', expect.any(Object));
      });

      // Verify the stored metrics include the old and new LCP
      const storedMetrics = vi.mocked(setMetadata).mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(storedMetrics['LCP']).toBeDefined();
      expect((storedMetrics['LCP'] as Record<string, unknown>).value).toBe(2500);
    });

    it('creates new metrics store if none exists', async () => {
      initWebVitals();

      const lcpCallback = vi.mocked(onLCP).mock.calls[0]?.[0];
      vi.mocked(getMetadata).mockResolvedValue(undefined);

      const mockMetric: Metric = {
        name: 'LCP',
        value: 1200,
        rating: 'good',
        delta: 100,
        id: 'test-id-2',
        entries: [],
        navigationType: 'navigate',
      };

      lcpCallback!(mockMetric);

      await vi.waitFor(() => {
        expect(setMetadata).toHaveBeenCalled();
      });

      const storedMetrics = vi.mocked(setMetadata).mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(storedMetrics['LCP']).toBeDefined();
      expect((storedMetrics['LCP'] as Record<string, unknown>).value).toBe(1200);
    });

    it('logs metric in development environment', async () => {
      vi.stubEnv('DEV', 'true');

      initWebVitals();

      const fcpCallback = vi.mocked(onFCP).mock.calls[0]?.[0];
      vi.mocked(getMetadata).mockResolvedValue(undefined);

      const mockMetric: Metric = {
        name: 'FCP',
        value: 800,
        rating: 'good',
        delta: 50,
        id: 'test-id-3',
        entries: [],
        navigationType: 'navigate',
      };

      fcpCallback!(mockMetric);

      await vi.waitFor(() => {
        expect(safeLog).toHaveBeenCalledWith(
          expect.stringContaining('[Web Vitals] FCP: 800.00ms'),
        );
      });

    });

    it('marks performance budget exceeded in log', async () => {
      vi.stubEnv('DEV', 'true');

      initWebVitals();

      const lcpCallback = vi.mocked(onLCP).mock.calls[0]?.[0];
      vi.mocked(getMetadata).mockResolvedValue(undefined);

      // LCP budget is 2500ms, value 3000 exceeds it
      const mockMetric: Metric = {
        name: 'LCP',
        value: 3000,
        rating: 'poor',
        delta: 100,
        id: 'test-id-4',
        entries: [],
        navigationType: 'navigate',
      };

      lcpCallback!(mockMetric);

      await vi.waitFor(() => {
        expect(safeLog).toHaveBeenCalledWith(
          expect.stringContaining('[BUDGET EXCEEDED'),
        );
      });

    });

    it('creates Performance API mark for DevTools', async () => {
      const markSpy = vi.spyOn(performance, 'mark');

      initWebVitals();

      const inpCallback = vi.mocked(onINP).mock.calls[0]?.[0];
      vi.mocked(getMetadata).mockResolvedValue(undefined);

      const mockMetric: Metric = {
        name: 'INP',
        value: 200,
        rating: 'good',
        delta: 10,
        id: 'test-id-5',
        entries: [],
        navigationType: 'navigate',
      };

      inpCallback!(mockMetric);

      await vi.waitFor(() => {
        expect(markSpy).toHaveBeenCalledWith('web-vitals-INP', {
          detail: 200,
        });
      });

      markSpy.mockRestore();
    });

    it('handles missing database gracefully', async () => {
      initWebVitals();

      const lcpCallback = vi.mocked(onLCP).mock.calls[0]?.[0];

      const { getDB } = await import('../../src/services/db');
      vi.mocked(getDB).mockReturnValue(null);

      const mockMetric: Metric = {
        name: 'LCP',
        value: 1500,
        rating: 'good',
        delta: 0,
        id: 'test-id-6',
        entries: [],
        navigationType: 'navigate',
      };

      // Should not throw
      expect(() => lcpCallback!(mockMetric)).not.toThrow();
    });
  });

  // ---- getStoredMetrics ----

  describe('getStoredMetrics', () => {
    it('returns stored metrics from IndexedDB', async () => {
      const mockMetrics = {
        LCP: { value: 1500, rating: 'good', timestamp: 1000 },
        CLS: { value: 0.1, rating: 'needs-improvement', timestamp: 1000 },
      };
      vi.mocked(getMetadata).mockResolvedValue(mockMetrics);

      const result = await getStoredMetrics();

      expect(result).toEqual(mockMetrics);
    });

    it('returns empty object when no metrics stored', async () => {
      vi.mocked(getMetadata).mockResolvedValue(undefined);

      const result = await getStoredMetrics();

      expect(result).toEqual({});
    });

    it('returns empty object on database error', async () => {
      vi.mocked(getMetadata).mockRejectedValue(new Error('DB Error'));

      const result = await getStoredMetrics();

      expect(result).toEqual({});
    });
  });
});
