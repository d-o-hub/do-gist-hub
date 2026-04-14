/**
 * Web Vitals measurement and reporting.
 * Uses the web-vitals library to track Core Web Vitals.
 */

import { onLCP, onCLS, onINP, onFCP, type Metric } from 'web-vitals';
import { PERFORMANCE_BUDGETS } from './budgets';

/**
 * Report a metric to the Performance API and console.
 * Warns if budget is exceeded.
 */
function reportMetric(metric: Metric): void {
  const { name, value, rating } = metric;
  const budget = PERFORMANCE_BUDGETS[name.toLowerCase() as keyof typeof PERFORMANCE_BUDGETS];

  // Log to console in development
  if (import.meta.env.DEV) {
    const budgetExceeded = typeof budget === 'number' && value > budget;
    const level = budgetExceeded ? 'warn' : 'log';
    console[level](
      `[Web Vitals] ${name}: ${value.toFixed(2)}ms (rating: ${rating})` +
        (budgetExceeded ? ` [BUDGET EXCEEDED: ${budget}ms]` : '')
    );
  }

  // Mark in Performance API for DevTools
  performance.mark(`web-vitals-${name}`, { detail: value });

  // Store in IndexedDB for diagnostics
  storeMetric(name, value, rating);
}

/**
 * Store metric in IndexedDB for later retrieval.
 */
async function storeMetric(name: string, value: number, rating: string): Promise<void> {
  try {
    const { getDB, getMetadata, setMetadata } = await import('../db');
    const db = getDB();
    if (!db) return;

    const metrics = (await getMetadata<Record<string, unknown>>('perf-metrics')) || {};
    metrics[name] = { value, rating, timestamp: Date.now() };
    await setMetadata('perf-metrics', metrics);
  } catch {
    // Silently fail - perf metrics are non-critical
  }
}

/**
 * Initialize Web Vitals monitoring.
 * Registers listeners for all Core Web Vitals.
 */
export function initWebVitals(): void {
  // Largest Contentful Paint
  onLCP(reportMetric);

  // Cumulative Layout Shift
  onCLS(reportMetric);

  // Interaction to Next Paint
  onINP(reportMetric);

  // First Contentful Paint
  onFCP(reportMetric);
}

/**
 * Get stored performance metrics from IndexedDB.
 */
export async function getStoredMetrics(): Promise<Record<string, unknown>> {
  try {
    const { getMetadata } = await import('../db');
    return (await getMetadata<Record<string, unknown>>('perf-metrics')) || {};
  } catch {
    return {};
  }
}
