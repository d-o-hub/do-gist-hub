/**
 * Unit tests for Performance Monitoring module
 * Covers: budgets, interaction-timer, web-vitals
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mocks (hoisted) ----

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeWarn: vi.fn(),
  safeError: vi.fn(),
}));

vi.mock('web-vitals', () => ({
  onLCP: vi.fn(),
  onCLS: vi.fn(),
  onINP: vi.fn(),
  onFCP: vi.fn(),
}));

vi.mock('../../src/services/db', () => ({
  getMetadata: vi.fn(),
  getDB: vi.fn(),
  setMetadata: vi.fn(),
}));

// ---- Imports (after mocks) ----

import { PERFORMANCE_BUDGETS } from '../../src/services/perf/budgets';
import { InteractionTimer, measureAsync } from '../../src/services/perf/interaction-timer';
import { initWebVitals, getStoredMetrics } from '../../src/services/perf/web-vitals';
import { safeLog, safeWarn, safeError } from '../../src/services/security/logger';
import { onLCP, onCLS, onINP, onFCP } from 'web-vitals';
import { getMetadata } from '../../src/services/db';

// ---- Budgets ----

describe('PERFORMANCE_BUDGETS', () => {
  it('defines all expected budget keys', () => {
    expect(PERFORMANCE_BUDGETS).toHaveProperty('initialJS');
    expect(PERFORMANCE_BUDGETS).toHaveProperty('coldStart');
    expect(PERFORMANCE_BUDGETS).toHaveProperty('interactionTarget');
    expect(PERFORMANCE_BUDGETS).toHaveProperty('cls');
    expect(PERFORMANCE_BUDGETS).toHaveProperty('inp');
  });

  it('has realistic bundle size budgets', () => {
    expect(PERFORMANCE_BUDGETS.initialJS).toBe(150 * 1024);
    expect(PERFORMANCE_BUDGETS.routeChunk).toBe(50 * 1024);
  });

  it('has realistic load time budgets', () => {
    expect(PERFORMANCE_BUDGETS.coldStart).toBe(2000);
    expect(PERFORMANCE_BUDGETS.fcp).toBe(1500);
    expect(PERFORMANCE_BUDGETS.lcp).toBe(2500);
  });

  it('has realistic interaction budgets', () => {
    expect(PERFORMANCE_BUDGETS.interactionTarget).toBe(100);
    expect(PERFORMANCE_BUDGETS.searchLatency).toBe(200);
    expect(PERFORMANCE_BUDGETS.editorOpen).toBe(300);
  });

  it('has realistic Core Web Vitals budgets', () => {
    expect(PERFORMANCE_BUDGETS.cls).toBe(0.1);
    expect(PERFORMANCE_BUDGETS.inp).toBe(200);
    expect(PERFORMANCE_BUDGETS.fid).toBe(100);
  });
});

// ---- InteractionTimer ----

describe('InteractionTimer', () => {
  let timer: InteractionTimer;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('measures duration via end()', () => {
    timer = new InteractionTimer('test-interaction');
    vi.advanceTimersByTime(50);

    const duration = timer.end();

    expect(duration).toBeGreaterThanOrEqual(50);
  });

  it('warns when budget is exceeded', () => {
    timer = new InteractionTimer('slow-operation', 10);
    vi.advanceTimersByTime(100);

    timer.end();

    expect(safeWarn).toHaveBeenCalledWith(
      expect.stringContaining('[Perf Budget]'),
    );
  });

  it('does not warn when within budget', () => {
    timer = new InteractionTimer('fast-operation', 1000);
    vi.advanceTimersByTime(10);

    timer.end();

    expect(safeWarn).not.toHaveBeenCalled();
  });

  it('warns if end() is called twice', () => {
    timer = new InteractionTimer('double-end');
    vi.advanceTimersByTime(10);

    timer.end();
    const second = timer.end();

    expect(second).toBe(0);
    expect(safeWarn).toHaveBeenCalledWith(
      expect.stringContaining('already ended'),
    );
  });

  it('cancel() prevents end() from reporting', () => {
    timer = new InteractionTimer('cancelled');
    vi.advanceTimersByTime(100);

    timer.cancel();
    const duration = timer.end();

    expect(duration).toBe(0);
    expect(safeWarn).toHaveBeenCalledWith(
      expect.stringContaining('already ended'),
    );
  });

  it('uses custom budget from constructor', () => {
    timer = new InteractionTimer('custom', 500);
    vi.advanceTimersByTime(600);

    timer.end();

    expect(safeWarn).toHaveBeenCalledWith(
      expect.stringContaining('budget: 500ms'),
    );
  });

  it('uses override budget from end() parameter', () => {
    timer = new InteractionTimer('override', 10);
    vi.advanceTimersByTime(200);

    timer.end(500);

    // 200ms duration < 500ms override budget -> safeWarn should not fire
    expect(safeWarn).not.toHaveBeenCalled();
  });

  it('uses default budget when none provided', () => {
    timer = new InteractionTimer('default');
    vi.advanceTimersByTime(200);

    timer.end();

    expect(safeWarn).toHaveBeenCalledWith(
      expect.stringContaining('budget: 100ms'),
    );
  });

  it('creates performance marks on start and end', () => {
    const markSpy = vi.spyOn(performance, 'mark');
    timer = new InteractionTimer('mark-test');

    timer.end();

    expect(markSpy).toHaveBeenCalledWith('mark-test-start');
    expect(markSpy).toHaveBeenCalledWith('mark-test-end');
    markSpy.mockRestore();
  });

  it('creates performance measure on end', () => {
    const measureSpy = vi.spyOn(performance, 'measure');
    timer = new InteractionTimer('measure-test');

    timer.end();

    expect(measureSpy).toHaveBeenCalledWith(
      'measure-test',
      'measure-test-start',
      'measure-test-end',
    );
    measureSpy.mockRestore();
  });
});

// ---- measureAsync ----

describe('measureAsync', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('measures and returns the result of an async function', async () => {
    const result = await measureAsync('test-async', async () => {
      return 42;
    });

    expect(result).toBe(42);
  });

  it('cancels timer on error', async () => {
    const error = new Error('async error');

    await expect(
      measureAsync('error-async', async () => {
        throw error;
      }),
    ).rejects.toThrow('async error');
  });

  it('passes through the resolved value', async () => {
    const result = await measureAsync('passthrough', async () => {
      return { key: 'value' };
    });

    expect(result).toEqual({ key: 'value' });
  });
});

// ---- Web Vitals ----

describe('initWebVitals', () => {
  it('calls all web-vitals metric functions', () => {
    initWebVitals();

    expect(onLCP).toHaveBeenCalledWith(expect.any(Function));
    expect(onCLS).toHaveBeenCalledWith(expect.any(Function));
    expect(onINP).toHaveBeenCalledWith(expect.any(Function));
    expect(onFCP).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe('getStoredMetrics', () => {
  it('returns empty object when no metrics stored', async () => {
    vi.mocked(getMetadata).mockResolvedValue(null);

    const metrics = await getStoredMetrics();

    expect(metrics).toEqual({});
    // Verify the mock was actually invoked (not hitting the catch fallback)
    expect(getMetadata).toHaveBeenCalledWith('perf-metrics');
  });

  it('returns stored metrics from IndexedDB', async () => {
    const storedMetrics = {
      LCP: { value: 1200, rating: 'good', timestamp: Date.now() },
    };
    vi.mocked(getMetadata).mockResolvedValue(storedMetrics as never);

    const metrics = await getStoredMetrics();

    expect(metrics).toEqual(storedMetrics);
    expect(getMetadata).toHaveBeenCalledWith('perf-metrics');
  });
});
