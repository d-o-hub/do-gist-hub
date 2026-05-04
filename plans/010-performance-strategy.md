<!-- Last Audit: 2024-05-15 -->
# Performance Strategy

## Budgets

- Initial JS: < 150KB gzipped
- Route chunks: < 50KB each
- Cold start: < 2s

## Implementation

1.  **Route-level Code Splitting**: Major views (Create, Settings, Offline, Detail) are loaded as separate async chunks using dynamic `import()`.
2.  **CSS Purging**: `vite-plugin-purgecss` scans source files to remove unused styles, keeping the global CSS lean.
3.  **Static Token Extraction**: `scripts/optimize-tokens.mjs` extracts only used design tokens into a static CSS file, reducing runtime overhead and improving CSP compliance.
4.  **CI Budget Enforcement**: `scripts/bundle-check.mjs` validates gzipped chunk sizes during CI, failing the build if budgets are exceeded.

## Measurement

Web Vitals: LCP, FID, CLS, INP.
Bundle sizes monitored via `rollup-plugin-visualizer`.

---

*Created: 2026. Status: Completed (Audited and Verified).*
