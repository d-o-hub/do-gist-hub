/**
 * Performance monitoring module.
 * Re-exports budgets, Web Vitals, and interaction timing utilities.
 */

export { PERFORMANCE_BUDGETS } from './budgets';
export type { PerformanceBudgets } from './budgets';
export { initWebVitals, getStoredMetrics } from './web-vitals';
export { InteractionTimer, measureAsync } from './interaction-timer';
