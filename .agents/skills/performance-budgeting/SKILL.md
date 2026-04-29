---
name: performance-budgeting
description: Measure and enforce performance budgets for JS bundle size, load times, Web Vitals, and interaction latency.
version: "0.1.0"
template_version: "0.1.0"
---

# Performance-budgeting Skill

Define, measure, and enforce performance budgets across the application.

## When to Use

- Setting up performance monitoring
- Optimizing bundle size
- Measuring Web Vitals
- Identifying performance regressions

## Performance Budgets

```typescript
// src/lib/perf/budgets.ts
export const PERFORMANCE_BUDGETS = {
  // Bundle sizes (gzipped)
  initialJS: 150 * 1024,      // 150KB
  routeChunk: 50 * 1024,      // 50KB per route
  totalFonts: 100 * 1024,     // 100KB
  totalImages: 200 * 1024,    // 200KB

  // Load times
  coldStart: 2000,            // 2s on mid-tier mobile
  fcp: 1500,                  // First Contentful Paint
  lcp: 2500,                  // Largest Contentful Paint

  // Interaction
  interactionTarget: 100,     // 100ms for gist list
  searchLatency: 200,         // 200ms for local search
  editorOpen: 300,            // 300ms from tap to ready

  // Core Web Vitals
  cls: 0.1,                   // Cumulative Layout Shift
  inp: 200,                   // Interaction to Next Paint
  fid: 100,                   // First Input Delay
} as const;
```

## Web Vitals Measurement

```typescript
// src/lib/perf/web-vitals.ts
import { onLCP, onFID, onCLS, onINP, onFCP } from 'web-vitals';

export function initWebVitalsReporting() {
  onLCP(report => {
    console.log('LCP:', report.value);
    reportToAnalytics('LCP', report.value);
  });

  onFID(report => {
    console.log('FID:', report.value);
    reportToAnalytics('FID', report.value);
  });

  onCLS(report => {
    console.log('CLS:', report.value);
    reportToAnalytics('CLS', report.value);
  });

  onINP(report => {
    console.log('INP:', report.value);
    reportToAnalytics('INP', report.value);
  });

  onFCP(report => {
    console.log('FCP:', report.value);
    reportToAnalytics('FCP', report.value);
  });
}

function reportToAnalytics(metric: string, value: number) {
  // Send to analytics or log for monitoring
  if (window.performance) {
    performance.mark(`metric-${metric}`, { detail: value });
  }
}
```

## Bundle Analysis

```bash
# Analyze bundle size
npm run build
npx vite-bundle-visualizer

# Check gzipped sizes
gzip -c dist/assets/*.js | wc -c
```

## Code Splitting Strategy

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core app shell
          'app-shell': ['./src/app.ts', './src/router.ts'],

          // Lazy-loaded features
          'gist-editor': ['./src/components/editor.ts'],
          'gist-revisions': ['./src/components/revisions.ts'],
          'syntax-highlight': ['./src/lib/highlighter.ts'],
        },
      },
    },
  },
});
```

## Performance Monitoring

```typescript
// src/lib/perf/interaction-timer.ts
export class InteractionTimer {
  private start: number;

  constructor(private name: string) {
    this.start = performance.now();
  }

  end(threshold?: number): void {
    const duration = performance.now() - this.start;
    const budget = threshold ?? PERFORMANCE_BUDGETS.interactionTarget;

    if (duration > budget) {
      console.warn(`Performance budget exceeded: ${this.name} took ${duration.toFixed(0)}ms (budget: ${budget}ms)`);
    }

    performance.mark(`${this.name}-end`);
    performance.measure(this.name, `${this.name}-start`, `${this.name}-end`);
  }
}

// Usage
const timer = new InteractionTimer('gist-list-render');
renderGistList();
timer.end(PERFORMANCE_BUDGETS.interactionTarget);
```

## Font Optimization

```typescript
// vite.config.ts - Font subsetting
export default defineConfig({
  build: {
    cssCodeSplit: true,
  },
  optimizeDeps: {
    exclude: ['web-vitals'],
  },
});
```

```css
/* Use font-display: swap for non-blocking font loading */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap;
  font-weight: 400 700;
}
```

## Gotchas

- **Measure Real Usage**: Test on mid-tier mobile, not dev machine
- **Code Split Wisely**: Too many chunks hurt HTTP overhead
- **Preload Critical**: Use `<link rel="preload">` for critical resources
- **Tree Shaking**: Ensure sideEffects: false in package.json
- **Lazy Load Heavy Features**: Editor, syntax highlighting, revisions
- **Cache Static Assets**: Use long-term caching with content hashes
- **Monitor in Production**: Real User Monitoring (RUM) data matters most

## Required Outputs

- `src/lib/perf/budgets.ts` - Performance budget definitions
- `src/lib/perf/web-vitals.ts` - Web Vitals measurement
- `src/lib/perf/interaction-timer.ts` - Interaction timing utility
- `vite.config.ts` - Code splitting configuration
- `docs/performance/budgets.md` - Performance budget documentation

## Verification

```bash
# Build and analyze
npm run build
npx vite-bundle-visualizer

# Check budgets
npm run test:browser

# Lighthouse audit
npx lighthouse http://localhost:4173 --output=json
```

## References

- https://web.dev/articles/vitals - Core Web Vitals
- https://web.dev/explore/learn-core-web-vitals - Learn Web Vitals
- https://web.dev/articles/vitals-measurement-getting-started - Measurement guide
- `AGENTS.md` - Performance budget rules
