/**
 * Performance monitoring module.
 * Re-exports budgets, Web Vitals, and interaction timing utilities.
 */

export type { PerformanceBudgets } from './budgets';
export { PERFORMANCE_BUDGETS } from './budgets';
export { InteractionTimer, measureAsync } from './interaction-timer';
export { getStoredMetrics, initWebVitals } from './web-vitals';
