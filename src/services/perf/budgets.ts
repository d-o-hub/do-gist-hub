/**
 * Performance budget definitions.
 * Enforced during build and monitored at runtime.
 */

export const PERFORMANCE_BUDGETS = {
  // Bundle sizes (bytes, gzipped)
  initialJS: 150 * 1024,      // 150KB
  routeChunk: 50 * 1024,      // 50KB per route
  totalFonts: 100 * 1024,     // 100KB
  totalImages: 200 * 1024,    // 200KB

  // Load times (ms)
  coldStart: 2000,            // 2s on mid-tier mobile
  fcp: 1500,                  // First Contentful Paint
  lcp: 2500,                  // Largest Contentful Paint

  // Interaction (ms)
  interactionTarget: 100,     // 100ms for gist list interactions
  searchLatency: 200,         // 200ms for local search
  editorOpen: 300,            // 300ms from tap to ready

  // Core Web Vitals
  cls: 0.1,                   // Cumulative Layout Shift
  inp: 200,                   // Interaction to Next Paint
  fid: 100,                   // First Input Delay
} as const;

export type PerformanceBudgets = typeof PERFORMANCE_BUDGETS;
